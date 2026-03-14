const cron = require('node-cron');
const { syncAllIcalLinks } = require('../services/ical.service');
const config = require('../config');

const runIcalSync = async () => {
    console.log('[CronJob] iCal sync started...');
    try {
        const results = await syncAllIcalLinks();
        const success = results.filter((r) => r.success).length;
        const failed = results.filter((r) => !r.success).length;
        console.log(`[CronJob] iCal sync done — success: ${success}, failed: ${failed}`);
    } catch (err) {
        console.error('[CronJob] syncIcal error:', err.message);
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

    console.log(`[CronJob] iCal sync started (every ${interval} min — cron: ${cronExpr})`);
};

module.exports = { startIcalSyncJob, runIcalSync };