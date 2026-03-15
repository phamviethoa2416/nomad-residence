const prisma = require('../../config/database');
const { asyncHandler, AppError } = require('../../middlewares/errorHandler');
const {
    BlockedDateParamsSchema,
    ListBlockedDatesQuerySchema,
    BlockDatesBodySchema,
    RoomParamsSchema,
} = require('../../validators/admin/blocked-dates.validators');

const listBlockedDates = asyncHandler(async (req, res) => {
    const params = RoomParamsSchema.parse(req.params);
    const query = ListBlockedDatesQuerySchema.parse(req.query || {});
    const roomId = params.id;

    const where = { roomId };
    if (query.from || query.to) {
        where.date = {};
        if (query.from) where.date.gte = query.from;
        if (query.to) where.date.lte = query.to;
    }

    const dates = await prisma.blockedDate.findMany({
        where,
        orderBy: { date: 'asc' },
    });

    res.json({
        success: true,
        data: dates,
    });
});

const blockDates = asyncHandler(async (req, res) => {
    const params = RoomParamsSchema.parse(req.params);
    const data = BlockDatesBodySchema.parse(req.body || {});
    const roomId = params.id;

    const sortedDates = [...data.dates].sort((a, b) => a - b);

    const conflicts = await prisma.booking.findMany({
        where: {
            roomId,
            status: 'confirmed',
            checkinDate: { lte: sortedDates[sortedDates.length - 1] },
            checkoutDate: { gte: sortedDates[0] },
        },
        select: {
            bookingCode: true,
            checkinDate: true,
            checkoutDate: true,
        },
    });

    const records = data.dates.map((d) => ({
        roomId,
        date: d,
        source: 'admin_manual',
        reason: data.reason || 'Admin block',
    }));

    const created = await prisma.blockedDate.createMany({
        data: records,
        skipDuplicates: true,
    });

    res.status(201).json({
        success: true,
        data: {
            blocked: created.count,
            conflicts: conflicts.length > 0 ? conflicts : undefined,
        },
        message:
            conflicts.length > 0
                ? `Đã block ${created.count} ngày. Cảnh báo: ${conflicts.length} booking bị xung đột!`
                : `Đã block ${created.count} ngày`,
    });
});

const unblockDate = asyncHandler(async (req, res) => {
    const params = BlockedDateParamsSchema.parse(req.params);
    const id = params.id;

    const date = await prisma.blockedDate.findUnique({ where: { id } });
    if (!date) throw new AppError('Không tìm thấy bản ghi', 404, 'NOT_FOUND');

    if (date.source === 'booking') {
        throw new AppError('Không thể gỡ block của đơn đặt phòng, hãy hủy đơn thay thế', 400, 'CANNOT_UNBLOCK_BOOKING');
    }

    await prisma.blockedDate.delete({ where: { id } });
    res.json({
        success: true,
        message: 'Đã gỡ block ngày',
    });
});

module.exports = {
    listBlockedDates,
    blockDates,
    unblockDate,
};
