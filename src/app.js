const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const {errorHandler} = require('./middlewares/errorHandler');
const {authenticate} = require('./middlewares/authenticate');
const authorize = require('./middlewares/authorize');
const config = require('./config');

// ─── Public routes ───────────────────────────────────────────────────────────
const roomPublicRoutes = require('./routes/public/room.routes');
const bookingPublicRoutes = require('./routes/public/booking.routes');
const paymentPublicRoutes = require('./routes/public/payment.routes');
const icalPublicRoutes = require('./routes/public/ical.routes');

// ─── Admin routes ────────────────────────────────────────────────────────────
const authAdminRoutes = require('./routes/admin/auth.routes');
const roomAdminRoutes = require('./routes/admin/room.routes');
const bookingAdminRoutes = require('./routes/admin/booking.routes');
const pricingAdminRoutes = require('./routes/admin/pricing.routes');
const blockedDateAdminRoutes = require('./routes/admin/blocked-dates.routes');
const icalAdminRoutes = require('./routes/admin/ical.routes');
const dashboardAdminRoutes = require('./routes/admin/dashboard.routes');
const settingAdminRoutes = require('./routes/admin/setting.routes');

const app = express();

app.use(helmet());
app.use(
    cors({
        origin: config.app.frontendUrl,
        credentials: true,
    })
);

if (config.app.env !== 'test') {
    app.use(morgan(config.app.env === 'production' ? 'combined' : 'dev'));
}

const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Quá nhiều yêu cầu, thử lại sau',
        code: 'RATE_LIMITED'
    },
});

const bookingLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10,
    message: {
        success: false,
        message: 'Quá nhiều yêu cầu đặt phòng',
        code: 'RATE_LIMITED'
    },
});

// ─── Body Parser ─────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({extended: true}));

// ─── Health check ────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
    res.json({
        success: true,
        status: 'ok',
        env: config.app.env,
        timestamp: new Date().toISOString(),
    });
});

// ─── Public API Routes ───────────────────────────────────────────────────────
app.use('/api/v1/rooms', roomPublicRoutes);
app.use('/api/v1/bookings', bookingLimiter, bookingPublicRoutes);
app.use('/api/v1/payments', paymentPublicRoutes);
app.use('/api/v1/ical', icalPublicRoutes);

app.use('/api/v1/admin', authAdminRoutes);
app.use('/api/v1/admin/rooms', authenticate, authorize('admin'), roomAdminRoutes);
app.use('/api/v1/admin/bookings', authenticate, authorize('admin'), bookingAdminRoutes);
app.use('/api/v1/admin/pricing', authenticate, authorize('admin'), pricingAdminRoutes);
app.use('/api/v1/admin/blocked-dates', authenticate, authorize('admin'), blockedDateAdminRoutes);
app.use('/api/v1/admin/ical', authenticate, authorize('admin'), icalAdminRoutes);
app.use('/api/v1/admin/dashboard', authenticate, authorize('admin'), dashboardAdminRoutes);
app.use('/api/v1/admin/settings', authenticate, authorize('admin'), settingAdminRoutes);

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.path} không tồn tại`,
        code: 'ROUTE_NOT_FOUND',
    });
});

app.use(errorHandler);

module.exports = app;
