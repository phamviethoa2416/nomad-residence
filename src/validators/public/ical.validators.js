const z = require('zod');

const ExportIcalParamsSchema = z.object({
    room_id: z.coerce.number().int().positive('Room ID không hợp lệ'),
});

const ExportIcalQuerySchema = z.object({
    token: z
        .string({
            required_error: 'Yêu cầu mã xác thực (token)',
        })
        .min(1, 'Token không hợp lệ'),
});

module.exports = {
    ExportIcalParamsSchema,
    ExportIcalQuerySchema,
};
