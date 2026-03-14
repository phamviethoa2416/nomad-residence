const {ZodError} = require('zod');
const {Prisma} = require('@prisma/client');
const { logger, withRequest } = require('../utils/logger');

class AppError extends Error {
    constructor(message, statusCode = 500, code = "INTERNAL_SERVER_ERROR") {
        super(message);

        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

const errorHandler = (err, req, res, next) => {
    const log = withRequest(req);

    if (err instanceof ZodError) {
        log.warn('Validation error', { type: 'validation_error', errors: err.errors });
        return res.status(400).json({
            success: false,
            message: "Dữ liệu đầu vào không hợp lệ",
            code: "VALIDATION_ERROR",
            errors: err.errors.map((e) => ({
                field: e.path.join('.'),
                message: e.message,
            })),
        });
    }

    if (err instanceof Prisma.PrismaClientKnownRequestError) {

        if (err.code === "P2002") {
            log.warn('Prisma unique constraint error', { code: err.code, meta: err.meta });
            return res.status(409).json({
                success: false,
                message: "Dữ liệu đã tồn tại",
                code: "DUPLICATE_ENTRY",
            });
        }

        if (err.code === "P2025") {
            log.warn('Prisma record not found error', { code: err.code, meta: err.meta });
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy dữ liệu",
                code: "NOT_FOUND",
            });
        }
    }

    if (err.isOperational) {
        log.warn('Operational error', {
            type: 'operational_error',
            code: err.code,
            statusCode: err.statusCode,
        });
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message,
            code: err.code || "INTERNAL_SERVER_ERROR",
        });
    }

    logger.error('Unhandled error', { err });
    return res.status(500).json({
        success: false,
        message: "Lỗi server, vui lòng thử lại sau",
        code: "INTERNAL_SERVER_ERROR",
    });
};

const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {AppError, errorHandler, asyncHandler};