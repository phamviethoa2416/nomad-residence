const z = require("zod");
const normalizePhone = (phone) => {
    if (!phone) return null;
    let normalized = phone.trim().replace(/\s+/g, '');
    if (normalized.startsWith('+84')) {
        normalized = '0' + normalized.slice(3);
    }
    return normalized;
};

const CreateBookingSchema = z.object({
    room_id: z.coerce.number().int().positive('Thiếu room_id'),
    checkin_date: z.coerce.date({
        required_error: 'Thiếu ngày checkin',
        invalid_type_error: 'Ngày checkin không hợp lệ'
    }),
    checkout_date: z.coerce.date({
        required_error: 'Thiếu ngày checkout',
        invalid_type_error: 'Ngày checkout không hợp lệ'
    }),
    num_guests: z.coerce.number().int().positive('Số lượng khách không hợp lệ'),
    guest_name: z.string().trim().min(1, 'Vui lòng nhập tên khách'),
    guest_phone: z.string().trim().min(8, 'Vui lòng nhập số điện thoại').transform(normalizePhone),
    guest_email: z.email('Email không hợp lệ').trim().toLowerCase().optional(),
    guest_note: z.string().trim().optional()
}).refine(data => data.checkin_date < data.checkout_date, {
    message: 'checkout phải sau checkin',
    path: ['checkout_date']
});

const LookupBookingSchema = z.object({
    code: z.string().trim().min(1, 'Vui lòng cung cấp mã đặt phòng'),
    phone: z.string().trim().min(1, 'Vui lòng cung cấp số điện thoại').transform(normalizePhone)
});

module.exports = {CreateBookingSchema, LookupBookingSchema};