const z = require('zod');

const LoginSchema = z.object({
    email: z.email('Email không hợp lệ'),
    password: z.string().min(1, 'Vui lòng nhập mật khẩu')
});

const ChangePasswordSchema = z.object({
    current_password: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
    new_password: z.string().min(6, 'Mật khẩu mới phải có ít nhất 6 ký tự')
});

module.exports = {
    LoginSchema,
    ChangePasswordSchema
};