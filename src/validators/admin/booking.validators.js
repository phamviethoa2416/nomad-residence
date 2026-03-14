const z = require('zod');

const BookingParamsSchema = z.object({
    id: z.coerce.number().int().positive('ID không hợp lệ')
});

const ListBookingsQuerySchema = z.object({
    status: z.string().optional(),

    room_id: z.coerce.number().int().positive().optional(),

    date_from: z.coerce.date().refine(d => !isNaN(d.getTime()), {
        message: 'Ngày bắt đầu không hợp lệ'
    }),

    date_to: z.coerce.date().refine(d => !isNaN(d.getTime()), {
        message: 'Ngày kết thúc không hợp lệ'
    }),

    page: z.coerce.number().int().catch(1).transform(val => Math.max(val, 1)),

    limit: z.coerce.number().int().catch(20)
        .transform(val => Math.min(Math.max(val, 1), 100))

}).refine(data => {
    if (data.date_from && data.date_to) {
        return data.date_from <= data.date_to;
    }
    return true;
}, {
    message: 'date_from phải trước date_to',
    path: ['date_to']
});

const ConfirmBookingBodySchema = z.object({
    admin_note: z.string().trim().optional()
});

const CancelBookingBodySchema = z.object({
    reason: z.string().min(1, 'Lý do hủy không được để trống')
});

const CreateManualBookingBodySchema = z.object({

    room_id: z.coerce.number().int().positive('Thiếu ID phòng'),

    checkin_date: z.coerce.date({
        required_error: 'Thiếu ngày checkin',
        invalid_type_error: 'Ngày checkin không hợp lệ'
    }).refine(d => !isNaN(d.getTime()), {
        message: 'Ngày checkin không hợp lệ'
    }),

    checkout_date: z.coerce.date({
        required_error: 'Thiếu ngày checkout',
        invalid_type_error: 'Ngày checkout không hợp lệ'
    }).refine(d => !isNaN(d.getTime()), {
        message: 'Ngày checkout không hợp lệ'
    }),

    guest_name: z.string().min(1, 'Tên khách không được để trống'),

    guest_phone: z.string().min(1, 'Số điện thoại không được để trống'),

    guest_email: z.union([
        z.email('Email không hợp lệ'),
        z.literal('')
    ]).optional(),

    guest_note: z.string().optional(),

    num_guests: z.coerce.number().int().positive().optional().default(1),

    source: z.string().optional().default('admin_manual'),

    payment_method: z.string().optional().default('cash'),

    admin_note: z.string().optional()

}).refine(data => data.checkin_date < data.checkout_date, {
    message: 'Ngày checkout phải sau checkin',
    path: ['checkout_date']
});

module.exports = {
    BookingParamsSchema,
    ListBookingsQuerySchema,
    ConfirmBookingBodySchema,
    CancelBookingBodySchema,
    CreateManualBookingBodySchema
};
