const {ZodError} = require('zod');
const {Prisma} = require('@prisma/client');

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

    if (err instanceof ZodError) {
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
            return res.status(409).json({
                success: false,
                message: "Dữ liệu đã tồn tại",
                code: "DUPLICATE_ENTRY",
            });
        }

        if (err.code === "P2025") {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy dữ liệu",
                code: "NOT_FOUND",
            });
        }
    }

    if (err.isOperational) {
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message,
            code: err.code || "INTERNAL_SERVER_ERROR",
        });
    }

    console.error(err);
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