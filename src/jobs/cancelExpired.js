const cron = require('node-cron');
const prisma = require('../config/database');

const cancelExpiredBookings = async () => {
    try {
        const result = await prisma.booking.updateMany({
            where: {
                status: 'pending',
                expiresAt: {lt: new Date()},
            },
            data: {
                status: 'canceled',
                canceledAt: new Date(),
                cancelReason: 'Hết thời gian thanh toán',
            },
        });

        if (result.count > 0) {
            console.log(`[CronJob] Đã hủy ${result.count} đơn hết hạn`);
        }
    } catch (err) {
        console.error('[CronJob] cancelExpiredBookings error:', err.message);
    }
};

const startCancelExpiredJob = () => {
    cron.schedule('* * * * *', cancelExpiredBookings, {
        name: 'cancel-expired-bookings',
    });

    console.log('[CronJob] cancelExpiredBookings started (every 1 min)');
};

module.exports = {startCancelExpiredJob, cancelExpiredBookings};