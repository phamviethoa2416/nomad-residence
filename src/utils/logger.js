const { createLogger, format, transports } = require('winston');
const config = require('../config');

const isProduction = config.app.env === 'production';

const serializeError = (err) => {
    if (!err) return undefined;
    if (err instanceof Error) {
        return {
            message: err.message,
            stack: err.stack,
            code: err.code,
        };
    }
    if (typeof err === 'object' && err.message) {
        return {
            message: err.message,
            stack: err.stack,
            code: err.code,
        };
    }
    return {
        message: String(err),
    };
};

const errorSerializer = format((info) => {
    if (info.err) info.err = serializeError(info.err);
    if (info.error) info.error = serializeError(info.error);
    return info;
});

const logTransports = [];

logTransports.push(
    new transports.Console({
        format: isProduction
            ? format.json()
            : format.combine(
                  format.colorize(),
                  format.printf(({ level, message, timestamp, ...meta }) => {
                      const rest = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
                      return `[${timestamp}] ${level}: ${message}${rest}`;
                  }),
              ),
    }),
);

if (isProduction) {
    try {
        const DailyRotateFile = require('winston-daily-rotate-file');
        logTransports.push(
            new DailyRotateFile({
                filename: 'logs/app-%DATE%.log',
                datePattern: 'YYYY-MM-DD',
                maxSize: '20m',
                maxFiles: '14d',
                zippedArchive: true,
            }),
        );
    } catch {}
}

const logger = createLogger({
    level: config.log.level,
    format: format.combine(
        format.timestamp(),
        format.errors({ stack: true }),
        format.splat(),
        errorSerializer(),
        format.json(),
    ),
    defaultMeta: { service: 'nomad-residence-api' },
    transports: logTransports,
});

const withRequest = (req, baseMeta = {}) => {
    const requestId = req.requestId || req.id;
    const meta = {
        ...baseMeta,
        requestId,
        method: req.method,
        path: req.path,
    };
    return {
        info: (msg, extra) => logger.info(msg, { ...meta, ...extra }),
        warn: (msg, extra) => logger.warn(msg, { ...meta, ...extra }),
        error: (msg, extra) => logger.error(msg, { ...meta, ...extra }),
        debug: (msg, extra) => logger.debug(msg, { ...meta, ...extra }),
    };
};

module.exports = {
    logger,
    withRequest,
};
