const z = require('zod');

const BOOKING_CODE_REGEX = /^BK-\d{8}-\d{3}$/;

const BookingQuerySchema = z.object({
    booking_code: z.string({
        required_error: 'Thiếu mã đặt phòng', invalid_type_error: 'Thiếu mã đặt phòng'
    })
        .trim()
        .toUpperCase()
        .regex(BOOKING_CODE_REGEX, 'Mã đặt phòng không hợp lệ')
});

const WebhookHeadersSchema = z.object({
    authorization: z.string({
        required_error: 'Thiếu Authorization header'
    }).min(1, 'Thiếu Authorization header')
}).catchall(z.any());

const WebhookBodySchema = z
    .record(z.string(), z.any())
    .refine(data => Object.keys(data).length > 0, {
        message: 'Webhook payload không hợp lệ'
    });

module.exports = {
    BookingQuerySchema,
    WebhookHeadersSchema,
    WebhookBodySchema
};
