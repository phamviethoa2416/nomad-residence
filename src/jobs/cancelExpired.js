const crypto = require('crypto');
const cron = require('node-cron');
const prisma = require('../config/database');
const { logger } = require('../utils/logger');

const cancelExpiredBookings = async (batchId) => {
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
            logger.info('[CronJob] Đã hủy đơn hết hạn', { batchId, count: result.count });
        }
    } catch (err) {
        logger.error('[CronJob] cancelExpiredBookings error', { batchId, err });
    }
};

const markCompletedBookings = async (batchId) => {
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
            logger.info('[CronJob] Đã chuyển đơn sang completed', { batchId, count: result.count });
        }
    } catch (err) {
        logger.error('[CronJob] markCompletedBookings error', { batchId, err });
    }
};

const runScheduledBookingJobs = async () => {
    const batchId = crypto.randomUUID().slice(0, 8);
    logger.debug('[CronJob] booking batch started', { batchId });
    await cancelExpiredBookings(batchId);
    await markCompletedBookings(batchId);
};

const startCancelExpiredJob = () => {
    cron.schedule('* * * * *', runScheduledBookingJobs, {
        name: 'cancel-expired-bookings',
    });

    logger.info('[CronJob] cancelExpiredBookings + markCompletedBookings scheduled', { cronExpr: '* * * * *' });
};

module.exports = { startCancelExpiredJob, cancelExpiredBookings };
