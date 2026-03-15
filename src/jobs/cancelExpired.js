const cron = require('node-cron');
const prisma = require('../config/database');
const { logger } = require('../utils/logger');

const cancelExpiredBookings = async () => {
    try {
        const result = await prisma.booking.updateMany({
            where: {
                status: 'pending',
                expiresAt: { lt: new Date() },
            },
            data: {
                status: 'canceled',
                canceledAt: new Date(),
                cancelReason: 'Hết thời gian thanh toán',
            },
        });

        if (result.count > 0) {
            logger.info('[CronJob] Đã hủy đơn hết hạn', { count: result.count });
        }
    } catch (err) {
        logger.error('[CronJob] cancelExpiredBookings error', { err: err.message });
    }
};

const markCompletedBookings = async () => {
    try {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const result = await prisma.booking.updateMany({
            where: {
                status: 'confirmed',
                checkoutDate: { lt: startOfToday },
            },
            data: { status: 'completed' },
        });

        if (result.count > 0) {
            logger.info('[CronJob] Đã chuyển đơn sang completed', { count: result.count });
        }
    } catch (err) {
        logger.error('[CronJob] markCompletedBookings error', { err: err.message });
    }
};

const runScheduledBookingJobs = async () => {
    await cancelExpiredBookings();
    await markCompletedBookings();
};

const startCancelExpiredJob = () => {
    cron.schedule('* * * * *', runScheduledBookingJobs, {
        name: 'cancel-expired-bookings',
    });

    logger.info('[CronJob] cancelExpiredBookings and markCompletedBookings scheduled', { cronExpr: '* * * * *' });
};

module.exports = {startCancelExpiredJob, cancelExpiredBookings};