require('dotenv').config()

const requiredEnv = (key) => {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
};

const config = {
    app: {
        env: process.env.NODE_ENV || 'development',
        port: parseInt(process.env.PORT) || 3000,
        url: process.env.APP_URL || 'http://localhost:3000',
        frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
    },
    jwt: {
        secret: requiredEnv('JWT_SECRET'),
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    },

    vietqr: {
        accountNo: process.env.VIETQR_ACCOUNT_NO,
        accountName: process.env.VIETQR_ACCOUNT_NAME,
        acqId: process.env.VIETQR_ACQ_ID,
        bankName: process.env.VIETQR_BANK_NAME || 'MBBank',
        clientId: process.env.VIETQR_CLIENT_ID,
        apiKey: process.env.VIETQR_API_KEY,
        webhookSecret: process.env.VIETQR_WEBHOOK_SECRET || null,
        allowedIps: (process.env.VIETQR_WEBHOOK_IPS || '')
            .split(',')
            .map(ip => ip.trim())
            .filter(Boolean),
    },

    email: {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        user: process.env.SMTP_USER,
        password: process.env.SMTP_PASSWORD,
        from: process.env.EMAIL_FROM,
    },

    telegram: {
        botToken: process.env.TELEGRAM_BOT_TOKEN,
        chatId: process.env.TELEGRAM_CHAT_ID,
    },

    booking: {
        expireMinutes: parseInt(process.env.BOOKING_EXPIRE_MINUTES) || 15,
    },

    ical: {
        syncIntervalMinutes: parseInt(process.env.ICAL_SYNC_INTERVAL_MINUTES) || 30,
        tokenSecret: requiredEnv('ICAL_TOKEN_SECRET'),
    },

    redis: {
        url: process.env.REDIS_URL || null,
        defaultTtlSeconds: parseInt(process.env.CACHE_TTL_SECONDS) || 60,
    },
};

module.exports = config;