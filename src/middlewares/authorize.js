const { AppError } = require('./errorHandler');

const authorize = (...allowed) => {
    return (req, res, next) => {
        if (!req.admin) {
            return next(new AppError('Vui lòng đăng nhập', 401, 'UNAUTHORIZED'));
        }

        if (!allowed || allowed.length === 0) {
            return next();
        }

        const userRole = req.admin.role;
        const userPermissions = Array.isArray(req.admin.permissions) ? req.admin.permissions : [];

        const hasRole = userRole && allowed.includes(userRole);

        const hasPermission = userPermissions.length > 0 && allowed.some((p) => userPermissions.includes(p));

        if (hasRole || hasPermission) {
            return next();
        }

        return next(new AppError('Bạn không có quyền truy cập', 403, 'FORBIDDEN'));
    };
};

module.exports = authorize;
