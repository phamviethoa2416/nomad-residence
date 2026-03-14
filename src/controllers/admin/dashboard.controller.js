const prisma = require('../../config/database');
const { asyncHandler } = require('../../middlewares/errorHandler');
const { dayjs } = require('../../utils/dateHelper');
const { UpdateSettingsBodySchema } = require('../../validators/admin/dashboard.validators');

const getDashboard = asyncHandler(async (req, res) => {
    const today = dayjs().startOf('day').toDate();
    const tomorrow = dayjs().add(1, 'day').startOf('day').toDate();
    const monthStart = dayjs().startOf('month').toDate();
    const monthEnd = dayjs().endOf('month').toDate();

    // Today's check-ins and check-outs
    const [todayCheckins, todayCheckouts, activeBookings] = await Promise.all([
        prisma.booking.count({
            where: {
                checkinDate: { gte: today, lt: tomorrow },
                status: 'confirmed'
            },
        }),
        prisma.booking.count({
            where: {
                checkoutDate: { gte: today, lt: tomorrow },
                status: 'confirmed'
            },
        }),
        prisma.booking.count({
            where: {
                status: 'confirmed',
                checkinDate: { lte: today },
                checkoutDate: { gt: today },
            },
        }),
    ]);

    // Monthly stats
    const monthlyBookings = await prisma.booking.findMany({
        where: {
            status: { in: ['confirmed', 'completed'] },
            checkinDate: { gte: monthStart, lte: monthEnd },
        },
        select: {
            totalAmount: true
        },
    });

    const monthRevenue = monthlyBookings.reduce(
        (sum, b) => sum + Number(b.totalAmount),
        0
    );

    const totalRooms = await prisma.room.count({ where: { status: 'active' } });
    const daysInMonth = dayjs().daysInMonth();
    const totalRoomNights = totalRooms * daysInMonth;

    const occupiedNights = await prisma.booking.findMany({
        where: {
            status: { in: ['confirmed', 'completed'] },
            checkinDate: { lte: monthEnd },
            checkoutDate: { gte: monthStart },
        },
        select: { numNights: true },
    });

    const totalOccupied = occupiedNights.reduce((sum, b) => sum + b.numNights, 0);
    const occupancyRate =
        totalRoomNights > 0
            ? Math.round((totalOccupied / totalRoomNights) * 1000) / 10
            : 0;

    const [pendingBookings, icalSyncErrors] = await Promise.all([
        prisma.booking.count({
            where: { status: 'pending', expiresAt: { gt: new Date() } },
        }),
        prisma.icalLink.count({ where: { syncStatus: 'error', isActive: true } }),
    ]);

    res.json({
        success: true,
        data: {
            today: {
                checkins: todayCheckins,
                checkouts: todayCheckouts,
                activeBookings,
            },
            month: {
                revenue: monthRevenue,
                totalBookings: monthlyBookings.length,
                occupancyRate,
            },
            pendingActions: {
                pendingBookings,
                icalSyncErrors,
            },
        },
    });
});

const getSettings = asyncHandler(async (req, res) => {
    const settings = await prisma.setting.findMany({
        orderBy: { key: 'asc' },
    });

    const result = settings.reduce((acc, s) => {
        acc[s.key] = s.value;
        return acc;
    }, {});

    res.json({
        success: true,
        data: result
    });
});

const updateSettings = asyncHandler(async (req, res) => {
    const data = UpdateSettingsBodySchema.parse(req.body || {});

    if (data.settings && data.settings.length > 0) {
        // Bulk update with Transaction to ensure atomic operation
        await prisma.$transaction(
            data.settings.map(({ key: k, value: v }) =>
                prisma.setting.upsert({
                    where: { key: k },
                    create: { key: k, value: v },
                    update: { value: v, updatedAt: new Date() },
                })
            )
        );
        return res.json({
            success: true,
            message: `Đã cập nhật ${data.settings.length} cài đặt`
        });
    }

    const setting = await prisma.setting.upsert({
        where: { key: data.key },
        create: { key: data.key, value: data.value },
        update: { value: data.value, updatedAt: new Date() },
    });

    res.json({
        success: true,
        data: setting
    });
});

module.exports = {
    getDashboard,
    getSettings,
    updateSettings
};