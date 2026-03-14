const jwt = require('jsonwebtoken');
const config = require('../config');
const { AppError } = require('./errorHandler');

const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(new AppError('Vui lòng đăng nhập', 401, 'UNAUTHORIZED'));
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
        return next(new AppError('Token không tồn tại', 401, 'INVALID_TOKEN'));
    }

    try {
        req.admin = jwt.verify(token, config.jwt.secret);

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