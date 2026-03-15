const prisma = require('../../config/database');
const { asyncHandler } = require('../../middlewares/errorHandler');
const { dayjs } = require('../../utils/dateHelper');
const { UpdateSettingsBodySchema } = require('../../validators/admin/dashboard.validators');

const getDashboard = asyncHandler(async (req, res) => {
    const today = dayjs().startOf('day').toDate();
    const tomorrow = dayjs().add(1, 'day').startOf('day').toDate();
    const monthStart = dayjs().startOf('month').toDate();
    const monthEnd = dayjs().endOf('month').toDate();

    const [
        todayCheckins,
        todayCheckouts,
        activeBookings,
        monthAgg,
        totalOccupiedResult,
        totalRooms,
        pendingBookings,
        icalSyncErrors
    ] = await Promise.all([
        prisma.booking.count({
            where: {
                checkinDate: { gte: today, lt: tomorrow },
                status: 'confirmed',
            },
        }),
        prisma.booking.count({
            where: {
                checkoutDate: { gte: today, lt: tomorrow },
                status: 'confirmed',
            },
        }),
        prisma.booking.count({
            where: {
                status: 'confirmed',
                checkinDate: { lte: today },
                checkoutDate: { gt: today },
            },
        }),
        prisma.booking.aggregate({
            where: {
                status: { in: ['confirmed', 'completed'] },
                checkinDate: { gte: monthStart, lte: monthEnd },
            },
            _sum: { totalAmount: true },
            _count: { id: true },
        }),
        prisma.$queryRaw`
            SELECT COALESCE(SUM(num_nights::int), 0)::int as total
            FROM bookings
            WHERE status IN ('confirmed', 'completed')
              AND checkin_date <= ${monthEnd}
              AND checkout_date >= ${monthStart}
        `,
        prisma.room.count({ where: { status: 'active' } }),
        prisma.booking.count({
            where: { status: 'pending', expiresAt: { gt: new Date() } },
        }),
        prisma.icalLink.count({ where: { syncStatus: 'error', isActive: true } }),
    ]);

    const monthRevenue = Number(monthAgg._sum.totalAmount ?? 0);
    const monthBookingCount = monthAgg._count.id;
    const totalOccupied = Number(totalOccupiedResult?.[0]?.total ?? 0);
    const daysInMonth = dayjs().daysInMonth();
    const totalRoomNights = totalRooms * daysInMonth;
    const occupancyRate =
        totalRoomNights > 0
            ? Math.round((totalOccupied / totalRoomNights) * 1000) / 10
            : 0;

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
                totalBookings: monthBookingCount,
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