const jwt = require('jsonwebtoken');
const config = require('../config');
const prisma = require('../config/database');
const { AppError } = require('./errorHandler');

const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(new AppError('Vui lòng đăng nhập', 401, 'UNAUTHORIZED'));
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
        return next(new AppError('Token không tồn tại', 401, 'INVALID_TOKEN'));
    }

    try {
        const decoded = jwt.verify(token, config.jwt.secret);

        if (!decoded || !decoded.id) {
            return next(
                new AppError(
                    "Token không hợp lệ, vui lòng đăng nhập lại",
                    401,
                    'INVALID_TOKEN')
            );
        }

        const admin = await prisma.admin.findUnique({
            where: { id: decoded.id },
            select: { id: true, email: true, fullName: true, role: true, updatedAt: true },
        });

        if (!admin) {
            return next(
                new AppError(
                    "Tài khoản không tồn tại",
                    401,
                    'INVALID_TOKEN')
            );
        }

        if (decoded.pwdChangedAt && admin.updatedAt) {
            const tokenTime = new Date(decoded.pwdChangedAt).getTime();
            const currentTime = new Date(admin.updatedAt).getTime();
            if (currentTime > tokenTime) {
                return next(
                    new AppError(
                        'Phiên đăng nhập đã bị thu hồi, vui lòng đăng nhập lại',
                        401,
                        'TOKEN_REVOKED'
                    )
                );
            }
        }

        req.admin = {
            id: admin.id,
            email: admin.email,
            fullName: admin.fullName,
            role: admin.role,
        };

        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return next(
                new AppError(
                    'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại',
                    401,
                    'TOKEN_EXPIRED'
                )
            );
        }
        return next(
            new AppError(
                "Token không hợp lệ, vui lòng đăng nhập lại",
                401,
                'INVALID_TOKEN')
        );
    }
};

module.exports = { authenticate };