const prisma = require('../config/database');
const { calculatePrice } = require('./pricing.service');
const { generateBookingCode } = require('../utils/generateBookingCode');
const { addMinutes, formatDate, getDateRange } = require('../utils/dateHelper');
const { AppError } = require('../middlewares/errorHandler');
const config = require('../config');
const { logger } = require('../utils/logger');

const assertRoomAvailable = async (tx, roomId, checkin, checkout, excludeBookingId = null) => {
    const activeBookingsWhere = {
        roomId,
        OR: [
            { status: 'confirmed', checkinDate: { lt: checkout }, checkoutDate: { gt: checkin } },
            { status: 'pending', expiresAt: { gt: new Date() }, checkinDate: { lt: checkout }, checkoutDate: { gt: checkin } },
        ],
    };
    if (excludeBookingId != null) {
        activeBookingsWhere.id = { not: excludeBookingId };
    }

    const activeBookings = await tx.booking.findMany({ where: activeBookingsWhere });
    const blockedDates = await tx.blockedDate.findMany({
        where: { roomId, date: { gte: checkin, lt: checkout } },
    });

    if (activeBookings.length > 0 || blockedDates.length > 0) {
        throw new AppError('Phòng đã được đặt trong khoảng thời gian này', 409, 'ROOM_NOT_AVAILABLE');
    }
};

const createBooking = async ({
    roomId,
    checkinDate,
    checkoutDate,
    numGuests,
    guestName,
    guestPhone,
    guestEmail,
    guestNote,
    source = 'website',
}) => {
    const checkin = new Date(checkinDate);
    const checkout = new Date(checkoutDate);

    if (checkin >= checkout) {
        throw new AppError('Ngày check-out phải sau ngày check-in', 400, 'INVALID_DATES');
    }
    if (checkin < new Date()) {
        throw new AppError('Ngày check-in không thể là ngày trong quá khứ', 400, 'INVALID_DATES');
    }

    return await prisma.$transaction(async (tx) => {
        // Lock the room row to prevent any concurrent booking execution for the same room
        await tx.$executeRaw`SELECT id FROM "rooms" WHERE id = ${roomId} FOR UPDATE`;

        // Validate room
        const room = await tx.room.findUnique({
            where: {id: roomId},
            select: {id: true, name: true, status: true, maxGuests: true, minNights: true, maxNights: true},
        });

        if (!room || room.status !== 'active') {
            throw new AppError('Phòng không tồn tại hoặc không hoạt động', 404, 'ROOM_NOT_FOUND');
        }

        if (numGuests > room.maxGuests) {
            throw new AppError(`Phòng chỉ tối đa ${room.maxGuests} khách`, 400, 'GUESTS_EXCEEDED');
        }

        // Calculate num_nights
        const numNights = Math.round((checkout - checkin) / (1000 * 60 * 60 * 24));
        if (numNights < room.minNights) throw new AppError(`Đặt tối thiểu ${room.minNights} đêm`, 400, 'MIN_NIGHTS_REQUIRED');
        if (room.maxNights && numNights > room.maxNights) throw new AppError(`Đặt tối đa ${room.maxNights} đêm`, 400, 'MAX_NIGHTS_EXCEEDED');

        await assertRoomAvailable(tx, roomId, checkin, checkout);

        // Calculate price & Generate code
        const priceCalc = await calculatePrice(roomId, checkin, checkout);
        const bookingCode = await generateBookingCode();
        const expiresAt = addMinutes(new Date(), config.booking.expireMinutes);

        // Create booking
        const created = await tx.booking.create({
            data: {
                bookingCode,
                roomId,
                guestName,
                guestPhone,
                guestEmail,
                guestNote,
                checkinDate: checkin,
                checkoutDate: checkout,
                numGuests,
                numNights,
                baseTotal: priceCalc.baseTotal,
                cleaningFee: priceCalc.cleaningFee,
                discount: 0,
                totalAmount: priceCalc.total,
                priceBreakdown: priceCalc.nightlyPrices,
                status: 'pending',
                source,
                expiresAt,
            },
            include: {
                room: {select: {name: true, checkinTime: true, checkoutTime: true}},
            },
        });

        logger.info('booking_created', {
            bookingId: created.id,
            bookingCode,
            roomId,
            checkinDate: checkin,
            checkoutDate: checkout,
            numGuests,
            source,
        });

        return created;
    });
};

const createManualBooking = async ({
    roomId,
    checkinDate,
    checkoutDate,
    guestName,
    guestPhone,
    guestEmail,
    guestNote,
    numGuests = 1,
    source = 'admin_manual',
    paymentMethod = 'cash',
    adminNote,
}) => {
    const checkin = new Date(checkinDate);
    const checkout = new Date(checkoutDate);

    const numNights = Math.round((checkout - checkin) / (1000 * 60 * 60 * 24));
    const priceCalc = await calculatePrice(roomId, checkin, checkout);
    const bookingCode = await generateBookingCode();

    return await prisma.$transaction(async (tx) => {
        // Lock room row
        await tx.$executeRaw`SELECT id FROM "rooms" WHERE id = ${roomId} FOR UPDATE`;

        const room = await tx.room.findUnique({where: {id: roomId}});
        if (!room) throw new AppError('Phòng không tồn tại', 404, 'ROOM_NOT_FOUND');

        await assertRoomAvailable(tx, roomId, checkin, checkout);

        const newBooking = await tx.booking.create({
            data: {
                bookingCode,
                roomId,
                guestName,
                guestPhone,
                guestEmail,
                guestNote,
                checkinDate: checkin,
                checkoutDate: checkout,
                numGuests,
                numNights,
                baseTotal: priceCalc.baseTotal,
                cleaningFee: priceCalc.cleaningFee,
                discount: 0,
                totalAmount: priceCalc.total,
                priceBreakdown: priceCalc.nightlyPrices,
                status: 'confirmed',
                source,
                adminNote,
                confirmedAt: new Date(),
            },
        });

        await tx.payment.create({
            data: {
                bookingId: newBooking.id,
                amount: priceCalc.total,
                method: paymentMethod,
                status: 'success',
                paidAt: new Date(),
                adminNote: `Xác nhận thủ công bởi admin`,
            },
        });

        await blockDatesForBooking(tx, roomId, checkin, checkout, newBooking.id);

        logger.info('booking_manual_created', {
            bookingId: newBooking.id,
            bookingCode,
            roomId,
            checkinDate: checkin,
            checkoutDate: checkout,
            numGuests,
            source,
            paymentMethod,
        });

        return newBooking;
    });
};

const confirmBooking = async (bookingId, adminNote) => {
    return await prisma.$transaction(async (tx) => {
        const booking = await tx.booking.findUnique({
            where: {id: bookingId},
            include: {room: {select: {name: true}}},
        });

        if (!booking) throw new AppError('Không tìm thấy đơn', 404, 'BOOKING_NOT_FOUND');
        if (booking.status !== 'pending') {
            throw new AppError('Chỉ có thể xác nhận đơn đang pending', 400, 'INVALID_STATUS');
        }

        // Lock the room row
        await tx.$executeRaw`SELECT id FROM "rooms" WHERE id = ${booking.roomId} FOR UPDATE`;

        await assertRoomAvailable(tx, booking.roomId, booking.checkinDate, booking.checkoutDate, bookingId);

        const b = await tx.booking.update({
            where: {id: bookingId},
            data: {
                status: 'confirmed',
                confirmedAt: new Date(),
                adminNote,
            },
            include: {
                room: {select: {name: true, checkinTime: true, checkoutTime: true}},
            },
        });

        await tx.payment.updateMany({
            where: {bookingId, status: 'pending'},
            data: {status: 'success', paidAt: new Date(), adminNote},
        });

        await blockDatesForBooking(tx, b.roomId, b.checkinDate, b.checkoutDate, b.id);

        logger.info('booking_confirmed', {
            bookingId: b.id,
            bookingCode: booking.bookingCode,
            roomId: b.roomId,
        });

        return b;
    });
};

const cancelBooking = async (bookingId, reason, isAdmin = false) => {
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });

    if (!booking) throw new AppError('Không tìm thấy đơn', 404, 'BOOKING_NOT_FOUND');

    if (!['pending', 'confirmed'].includes(booking.status)) {
        throw new AppError('Không thể hủy đơn ở trạng thái này', 400, 'INVALID_STATUS');
    }

    return await prisma.$transaction(async (tx) => {
        const b = await tx.booking.update({
            where: {id: bookingId},
            data: {
                status: 'canceled',
                canceledAt: new Date(),
                cancelReason: reason || 'Đã hủy',
            },
            include: {room: true},
        });

        // Remove blocked dates if it was confirmed
        if (booking.status === 'confirmed') {
            await tx.blockedDate.deleteMany({
                where: {roomId: booking.roomId, source: 'booking', sourceRef: String(bookingId)},
            });
        }

        logger.info('booking_canceled', {
            bookingId: b.id,
            bookingCode: booking.bookingCode,
            roomId: b.roomId,
            previousStatus: booking.status,
            reason,
            isAdmin,
        });

        return b;
    });
};

const lookupBooking = async (bookingCode, phone) => {
    const booking = await prisma.booking.findFirst({
        where: {
            bookingCode,
            guestPhone: phone,
        },
        include: {
            room: {
                select: {
                    name: true,
                    checkinTime: true,
                    checkoutTime: true,
                    address: true,
                },
            },
        },
    });

    if (!booking) return null;

    return {
        bookingCode: booking.bookingCode,
        roomName: booking.room.name,
        checkinDate: formatDate(booking.checkinDate),
        checkoutDate: formatDate(booking.checkoutDate),
        numNights: booking.numNights,
        numGuests: booking.numGuests,
        totalAmount: Number(booking.totalAmount),
        status: booking.status,
        checkinTime: booking.room.checkinTime,
        checkoutTime: booking.room.checkoutTime,
        address: booking.room.address,
    };
};

const getBookings = async ({ status, roomId, dateFrom, dateTo, page = 1, limit = 20 }) => {
    const skip = (page - 1) * limit;

    const where = {
        ...(status && { status }),
        ...(roomId && { roomId }),
        ...(dateFrom && dateTo && {
            checkinDate: {
                gte: new Date(dateFrom),
                lte: new Date(dateTo),
            },
        }),
    };

    const [bookings, total] = await Promise.all([
        prisma.booking.findMany({
            where,
            include: {
                room: { select: { name: true } },
                payments: { orderBy: { createdAt: 'desc' }, take: 1 },
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        }),
        prisma.booking.count({ where }),
    ]);

    return {
        bookings,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
};

const getBookingDetail = async (bookingId) => {
    return prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
            room: true,
            payments: { orderBy: { createdAt: 'desc' } },
        },
    });
};

const blockDatesForBooking = async (tx, roomId, checkinDate, checkoutDate, bookingId) => {
    const dates = getDateRange(checkinDate, checkoutDate);
    const records = dates.map((date) => ({
        roomId,
        date,
        source: 'booking',
        sourceRef: String(bookingId),
        reason: `Booking ${bookingId}`,
    }));

    await tx.blockedDate.deleteMany({
        where: {
            roomId,
            source: 'booking',
            sourceRef: String(bookingId),
        },
    });
    if (records.length > 0) {
        await tx.blockedDate.createMany({
            data: records,
            skipDuplicates: true,
        });
    }
};

module.exports = {
    createBooking,
    createManualBooking,
    confirmBooking,
    cancelBooking,
    lookupBooking,
    getBookings,
    getBookingDetail,
    blockDatesForBooking,
};