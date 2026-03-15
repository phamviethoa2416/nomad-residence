const z = require('zod');

const LoginSchema = z.object({
    email: z.email('Email không hợp lệ'),
    password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

const ChangePasswordSchema = z.object({
    current_password: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
    new_password: z
        .string()
        .min(8, 'Mật khẩu mới phải có ít nhất 8 ký tự')
        .regex(/[A-Z]/, 'Mật khẩu phải chứa ít nhất 1 chữ hoa')
        .regex(/[a-z]/, 'Mật khẩu phải chứa ít nhất 1 chữ thường')
        .regex(/[0-9]/, 'Mật khẩu phải chứa ít nhất 1 chữ số'),
});

module.exports = {
    LoginSchema,
    ChangePasswordSchema,
};
