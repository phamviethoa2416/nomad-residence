const prisma = require('../config/database');
const { formatDate } = require('../utils/dateHelper');
const { calculatePrice, calculatePricesForRooms } = require('./pricing.service');
const { getDateRange } = require('../utils/dateHelper');
const { calcNightPrice } = require('./pricing.service');
const cache = require('../utils/cache');

const CACHE_PREFIX_ROOMS = 'rooms:';
const CACHE_PREFIX_ROOM_SLUG = 'room:slug:';

const getRooms = async ({ checkin, checkout, guests, roomType, minPrice, maxPrice, sort, page, limit }) => {
    const cacheKey = `${CACHE_PREFIX_ROOMS}${[checkin, checkout, guests, roomType, minPrice, maxPrice, sort, page, limit].filter(Boolean).join(':')}`;
    const cached = await cache.get(cacheKey);
    if (cached != null) return cached;

    const skip = (page - 1) * limit;

    const where = {
        status: 'active',
        ...(roomType && { roomType }),
        ...(guests && { maxGuests: { gte: guests } }),
        ...(minPrice && { basePrice: { gte: minPrice } }),
        ...(maxPrice && { basePrice: { lte: maxPrice } }),
    };

    let unavailableRoomIds = [];
    if (checkin && checkout) {
        unavailableRoomIds = await getUnavailableRoomIds(checkin, checkout);
        if (unavailableRoomIds.length > 0) {
            where.id = { notIn: unavailableRoomIds };
        }
    }

    const orderBy = {
        price_asc: { basePrice: 'asc' },
        price_desc: { basePrice: 'desc' },
        newest: { createdAt: 'desc' },
    }[sort] || { sortOrder: 'asc' };

    const [rooms, total] = await Promise.all([
        prisma.room.findMany({
            where,
            orderBy,
            skip,
            take: limit,
            include: {
                images: {
                    where: { isPrimary: true },
                    take: 1,
                },
            },
        }),
        prisma.room.count({ where }),
    ]);

    let priceMap = new Map();
    if (checkin && checkout && rooms.length > 0) {
        priceMap = await calculatePricesForRooms(
            rooms.map((r) => r.id),
            checkin,
            checkout,
        );
    }

    const roomsWithPrice = rooms.map((room) => {
        let priceInfo = {};
        const calc = priceMap.get(room.id);
        if (calc) {
            priceInfo = {
                totalPrice: calc.total,
                avgPricePerNight: calc.numNights ? Math.round(calc.baseTotal / calc.numNights) : Number(room.basePrice),
            };
        }
        return {
            id: room.id,
            name: room.name,
            slug: room.slug,
            roomType: room.roomType,
            shortDescription: room.shortDescription,
            maxGuests: room.maxGuests,
            numBedrooms: room.numBedrooms,
            areaSqm: room.area != null ? Number(room.area) : null,
            district: room.district,
            city: room.city,
            basePrice: Number(room.basePrice),
            primaryImage: room.images[0]?.url || null,
            status: room.status,
            ...priceInfo,
        };
    });

    const result = {
        rooms: roomsWithPrice,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
    await cache.set(cacheKey, result, cache.defaultTtl);
    return result;
};

const getRoomBySlug = async (slug, checkin, checkout) => {
    const cacheKey = `${CACHE_PREFIX_ROOM_SLUG}${slug}:${checkin || ''}:${checkout || ''}`;
    const cached = await cache.get(cacheKey);
    if (cached != null) return cached;

    const room = await prisma.room.findUnique({
        where: { slug },
        include: {
            images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
            amenities: { orderBy: { category: 'asc' } },
        },
    });

    if (!room || room.status !== 'active') return null;

    let priceDetails = null;
    if (checkin && checkout) {
        const calc = await calculatePrice(room.id, checkin, checkout);
        priceDetails = {
            checkin: formatDate(checkin),
            checkout: formatDate(checkout),
            numNights: calc.numNights,
            nightlyPrices: calc.nightlyPrices,
            baseTotal: calc.baseTotal,
            cleaningFee: calc.cleaningFee,
            total: calc.total,
        };
    }

    const out = {
        id: room.id,
        name: room.name,
        slug: room.slug,
        roomType: room.roomType,
        description: room.description,
        shortDescription: room.shortDescription,
        maxGuests: room.maxGuests,
        numBedrooms: room.numBedrooms,
        numBathrooms: room.numBathrooms,
        numBeds: room.numBeds,
        areaSqm: room.area != null ? Number(room.area) : null,
        address: room.address,
        latitude: room.latitude ? Number(room.latitude) : null,
        longitude: room.longitude ? Number(room.longitude) : null,
        basePrice: Number(room.basePrice),
        cleaningFee: Number(room.cleaningFee),
        checkinTime: room.checkinTime,
        checkoutTime: room.checkoutTime,
        minNights: room.minNights,
        maxNights: room.maxNights,
        houseRules: room.houseRules,
        cancellationPolicy: room.cancellationPolicy,
        images: room.images.map((img) => ({
            url: img.url,
            altText: img.altText,
            isPrimary: img.isPrimary,
        })),
        amenities: room.amenities.map((a) => ({
            name: a.name,
            icon: a.icon,
            category: a.category,
        })),
        priceDetails,
    };
    await cache.set(cacheKey, out, cache.defaultTtl);
    return out;
};

const getRoomCalendar = async (roomId, from, to) => {
    const room = await prisma.room.findUnique({
        where: { id: roomId },
        select: { basePrice: true },
    });

    const rules = await prisma.pricingRule.findMany({
        where: { roomId, isActive: true },
    });

    const blockedDates = await prisma.blockedDate.findMany({
        where: {
            roomId,
            date: { gte: from, lte: to },
        },
        select: { date: true },
    });

    const blockedSet = new Set(blockedDates.map((b) => formatDate(b.date)));

    const dates = getDateRange(from, to);
    const basePrice = Number(room.basePrice);

    const calendar = dates.map((date) => {
        const dateStr = formatDate(date);
        const { price } = calcNightPrice(basePrice, date, rules);
        return {
            date: dateStr,
            available: !blockedSet.has(dateStr),
            price,
        };
    });

    return { roomId, dates: calendar };
};

const getUnavailableRoomIds = async (checkin, checkout) => {
    const checkinDate = new Date(checkin);
    const checkoutDate = new Date(checkout);

    // Rooms with blocked dates in range
    const blockedRooms = await prisma.blockedDate.findMany({
        where: {
            date: { gte: checkinDate, lt: checkoutDate },
        },
        select: { roomId: true },
        distinct: ['roomId'],
    });

    // Rooms with active bookings overlapping
    const bookedRooms = await prisma.booking.findMany({
        where: {
            OR: [
                {
                    status: 'confirmed',
                    checkinDate: { lt: checkoutDate },
                    checkoutDate: { gt: checkinDate },
                },
                {
                    status: 'pending',
                    expiresAt: { gt: new Date() },
                    checkinDate: { lt: checkoutDate },
                    checkoutDate: { gt: checkinDate },
                },
            ],
        },
        select: { roomId: true },
        distinct: ['roomId'],
    });

    return [...new Set([...blockedRooms.map((r) => r.roomId), ...bookedRooms.map((r) => r.roomId)])];
};

const checkRoomAvailability = async (roomId, checkinDate, checkoutDate) => {
    const unavailable = await getUnavailableRoomIds(checkinDate, checkoutDate);
    return !unavailable.includes(roomId);
};

const getAllRooms = async () => {
    return prisma.room.findMany({
        include: {
            images: { where: { isPrimary: true }, take: 1 },
            _count: { select: { bookings: true } },
        },
        orderBy: { sortOrder: 'asc' },
    });
};

const getRoomById = async (id) => {
    return prisma.room.findUnique({
        where: { id },
        include: {
            images: { orderBy: { sortOrder: 'asc' } },
            amenities: true,
        },
    });
};

const createRoom = async (data) => {
    return prisma.room.create({ data });
};

const updateRoom = async (id, data) => {
    return prisma.room.update({ where: { id }, data });
};

const deleteRoom = async (id) => {
    return prisma.room.update({
        where: { id },
        data: { status: 'inactive' },
    });
};

const addRoomImage = async (roomId, { url, altText, isPrimary, sortOrder }) => {
    if (isPrimary) {
        await prisma.roomImage.updateMany({
            where: { roomId },
            data: { isPrimary: false },
        });
    }
    return prisma.roomImage.create({
        data: { roomId, url, altText, isPrimary: isPrimary || false, sortOrder: sortOrder || 0 },
    });
};

const deleteRoomImage = async (imageId) => {
    return prisma.roomImage.delete({ where: { id: imageId } });
};

const reorderRoomImages = async (roomId, orderedIds) => {
    await prisma.$transaction(
        orderedIds.map(({ id, sortOrder }) => prisma.roomImage.update({ where: { id }, data: { sortOrder } })),
    );
};

const upsertAmenities = async (roomId, amenities) => {
    await prisma.roomAmenity.deleteMany({ where: { roomId } });
    return prisma.roomAmenity.createMany({
        data: amenities.map((a) => ({ roomId, ...a })),
    });
};

const invalidateRoomCache = async () => {
    await cache.invalidateByPrefix(CACHE_PREFIX_ROOMS);
    await cache.invalidateByPrefix(CACHE_PREFIX_ROOM_SLUG);
};

module.exports = {
    getRooms,
    getRoomBySlug,
    getRoomCalendar,
    checkRoomAvailability,
    getUnavailableRoomIds,
    getAllRooms,
    getRoomById,
    createRoom,
    updateRoom,
    deleteRoom,
    addRoomImage,
    deleteRoomImage,
    reorderRoomImages,
    upsertAmenities,
    invalidateRoomCache,
};
