const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../../config/database');
const config = require('../../config');
const { asyncHandler, AppError } = require('../../middlewares/errorHandler');
const { LoginSchema, ChangePasswordSchema } = require('../../validators/admin/auth.validators');
const { withRequest } = require('../../utils/logger');

const login = asyncHandler(async (req, res) => {
    const data = LoginSchema.parse(req.body || {});

    const admin = await prisma.admin.findUnique({
        where: { email: data.email },
        select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
            passwordHash: true,
            updatedAt: true,
        },
    });

    if (!admin) {
        throw new AppError('Email hoặc mật khẩu không đúng', 401, 'INVALID_CREDENTIALS');
    }

    const isMatch = await bcrypt.compare(data.password, admin.passwordHash);
    if (!isMatch) {
        throw new AppError('Email hoặc mật khẩu không đúng', 401, 'INVALID_CREDENTIALS');
    }

    const token = jwt.sign(
        {
            id: admin.id,
            email: admin.email,
            role: admin.role,
            pwdChangedAt: admin.updatedAt ? admin.updatedAt.toISOString() : new Date().toISOString(),
        },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn },
    );

    const log = withRequest(req);
    log.info('audit_admin_login', {
        action: 'login',
        adminId: admin.id,
        email: admin.email,
    });

    res.json({
        success: true,
        data: {
            token,
            admin: {
                id: admin.id,
                email: admin.email,
                fullName: admin.fullName,
                role: admin.role,
            },
        },
    });
});

const getMe = asyncHandler(async (req, res) => {
    const admin = await prisma.admin.findUnique({
        where: { id: req.admin.id },
        select: { id: true, email: true, fullName: true, phone: true, role: true, createdAt: true },
    });

    if (!admin) throw new AppError('Không tìm thấy tài khoản', 404, 'NOT_FOUND');

    res.json({ success: true, data: admin });
});

const changePassword = asyncHandler(async (req, res) => {
    const data = ChangePasswordSchema.parse(req.body || {});

    const admin = await prisma.admin.findUnique({ where: { id: req.admin.id } });

    if (!admin) {
        throw new AppError('Không tìm thấy tài khoản', 404, 'ADMIN_NOT_FOUND');
    }

    const isMatch = await bcrypt.compare(data.current_password, admin.passwordHash);
    if (!isMatch) {
        throw new AppError('Mật khẩu hiện tại không đúng', 400, 'INVALID_PASSWORD');
    }

    const hashedPassword = await bcrypt.hash(data.new_password, 12);

    await prisma.admin.update({
        where: { id: req.admin.id },
        data: { passwordHash: hashedPassword },
    });

    const log = withRequest(req);
    log.info('audit_password_change', {
        action: 'password_change',
        adminId: req.admin.id,
    });

    res.json({ success: true, message: 'Đổi mật khẩu thành công' });
});

module.exports = { login, getMe, changePassword };
