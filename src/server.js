require('dotenv').config();

const app = require('./app');
const config = require('./config');
const prisma = require('./config/database');
const { startCancelExpiredJob } = require('./jobs/cancelExpired');
const { startIcalSyncJob } = require('./jobs/syncIcal');
const { logger } = require('./utils/logger');

const PORT = config.app.port;

const startServer = async () => {
    try {
        await prisma.$connect();
        logger.info('Connected to database');

        const server = app.listen(PORT, () => {
            logger.info('Server started', { port: PORT, env: config.app.env });
        });

        startCancelExpiredJob();
        startIcalSyncJob();

        const shutdown = async (signal) => {
            logger.info(`${signal} received — shutting down gracefully...`);
            server.close(async () => {
                await prisma.$disconnect();
                logger.info('Disconnected from database');
                process.exit(0);
            });

            setTimeout(() => {
                logger.error('Could not close connections in time, forcefully shutting down');
                process.exit(1);
            }, 10000);
        };

        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));

        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled Rejection', { reason, promise });
        });

        process.on('uncaughtException', (err) => {
            logger.error('Uncaught Exception', { err });
            shutdown('uncaughtException');
        });
    } catch (err) {
        logger.error('Failed to start server', { err });
        await prisma.$disconnect();
        process.exit(1);
    }
};

startServer();