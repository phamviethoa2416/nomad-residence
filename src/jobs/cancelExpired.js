const cron = require('node-cron');
const prisma = require('../config/database');
const { logger } = require('../utils/logger');

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
            logger.info('[CronJob] Đã hủy đơn hết hạn', { count: result.count });
        }
    } catch (err) {
        logger.error('[CronJob] cancelExpiredBookings error', { err: err.message });
    }
};

const startCancelExpiredJob = () => {
    cron.schedule('* * * * *', cancelExpiredBookings, {
        name: 'cancel-expired-bookings',
    });

    logger.info('[CronJob] cancelExpiredBookings scheduled', { cronExpr: '* * * * *' });
};

module.exports = {startCancelExpiredJob, cancelExpiredBookings};