const cron = require('node-cron');
const { syncAllIcalLinks } = require('../services/ical.service');
const config = require('../config');
const { logger } = require('../utils/logger');

const runIcalSync = async () => {
    logger.info('[CronJob] iCal sync started...');
    try {
        const results = await syncAllIcalLinks();
        const success = results.filter((r) => r.success).length;
        const failed = results.filter((r) => !r.success).length;
        logger.info('[CronJob] iCal sync done', { success, failed });
    } catch (err) {
        logger.error('[CronJob] syncIcal error', { err: err.message });
    }
};

const startIcalSyncJob = () => {
    const interval = config.ical.syncIntervalMinutes || 30;

    let cronExpr;
    if (interval <= 15) {
        cronExpr = '*/15 * * * *';
    } else if (interval <= 30) {
        cronExpr = '*/30 * * * *';
    } else {
        cronExpr = '0 * * * *';
    }

    cron.schedule(cronExpr, runIcalSync, {
        name: 'ical-sync',
    });

    logger.info('[CronJob] iCal sync scheduled', { intervalMinutes: interval, cronExpr });
};

module.exports = { startIcalSyncJob, runIcalSync };