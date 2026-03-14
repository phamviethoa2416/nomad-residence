const {createLogger, format, transports} = require('winston');
const config = require('../config');

const isProduction = config.app.env === 'production';

const logger = createLogger({
    level: isProduction ? 'info' : 'debug',
    format: format.combine(
        format.timestamp(),
        format.errors({stack: true}),
        format.splat(),
        format.json()
    ),
    defaultMeta: {service: 'nomad-residence-api'},
    transports: [
        new transports.Console({
            format: isProduction
                ? format.json()
                : format.combine(
                    format.colorize(),
                    format.printf(({level, message, timestamp, ...meta}) => {
                        const rest = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
                        return `[${timestamp}] ${level}: ${message}${rest}`;
                    })
                ),
        }),
    ],
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
        info: (msg, extra) => logger.info(msg, {...meta, ...extra}),
        warn: (msg, extra) => logger.warn(msg, {...meta, ...extra}),
        error: (msg, extra) => logger.error(msg, {...meta, ...extra}),
        debug: (msg, extra) => logger.debug(msg, {...meta, ...extra}),
    };
};

module.exports = {
    logger,
    withRequest,
};

