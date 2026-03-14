require('dotenv').config();

const app = require('./app');
const config = require('./config');
const prisma = require('./config/database');
const { startCancelExpiredJob } = require('./jobs/cancelExpired');
const { startIcalSyncJob } = require('./jobs/syncIcal');

const PORT = config.app.port;

const startServer = async () => {
    try {
        await prisma.$connect();
        console.log('Connected to database');

        const server = app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
            console.log(`API Base URL: ${config.app.baseUrl}`);
        });

        startCancelExpiredJob();
        startIcalSyncJob();

        const shutdown = async (signal) => {
            console.log(`\n${signal} received — shutting down gracefully...`);
            server.close(async () => {
                await prisma.$disconnect();
                console.log('Disconnected from database');
                process.exit(0);
            });

            setTimeout(() => {
                console.error('Could not close connections in time, forcefully shutting down');
                process.exit(1);
            }, 10000);
        };

        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));

        process.on('unhandledRejection', (reason, promise) => {
            console.error('Unhandled Rejection at:', promise, 'reason:', reason);
        });

        process.on('uncaughtException', (err) => {
            console.error('Uncaught Exception:', err);
            shutdown('uncaughtException');
        });
    } catch (err) {
        console.error('Failed to start server:', err);
        await prisma.$disconnect();
        process.exit(1);
    }
};

startServer();