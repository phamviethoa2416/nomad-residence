const z = require('zod');

const ListRoomsSchema = z.object({
    checkin: z.coerce.date({
        invalid_type_error: 'Ngày checkin không hợp lệ'
    }).optional(),
    checkout: z.coerce.date({
        invalid_type_error: 'Ngày checkout không hợp lệ'
    }).optional(),
    guests: z.coerce.number().int().optional(),
    room_type: z.string().optional(),
    min_price: z.coerce.number().int().optional(),
    max_price: z.coerce.number().int().optional(),
    sort: z.string().default('sort_order'),
    page: z.coerce.number().int().catch(1).transform(val => Math.max(val, 1)),
    limit: z.coerce.number().int().catch(12).transform(val => Math.min(Math.max(val, 1), 50))
}).refine(data => {
    if (data.checkin && data.checkout) {
        return data.checkin < data.checkout;
    }
    return true;
}, {
    message: 'Ngày checkout phải sau ngày checkin',
    path: ['checkout']
});

const GetRoomDetailSchema = z.object({
    checkin: z.coerce.date({
        invalid_type_error: 'Ngày checkin không hợp lệ'
    }).optional(),
    checkout: z.coerce.date({
        invalid_type_error: 'Ngày checkout không hợp lệ'
    }).optional(),
}).refine(data => {
    if (data.checkin && data.checkout) {
        return data.checkin < data.checkout;
    }
    return true;
}, {
    message: 'Ngày checkout phải sau ngày checkin',
    path: ['checkout']
});

const GetRoomCalendarSchema = z.object({
    from: z.coerce.date({
        invalid_type_error: 'Ngày bắt đầu không hợp lệ'
    }).optional(),
    to: z.coerce.date({
        invalid_type_error: 'Ngày đến không hợp lệ'
    }).optional()
}).refine(data => {
    if (data.from && data.to) {
        return data.from <= data.to;
    }
    return true;
}, {
    message: 'Ngày bắt đầu phải trước ngày đến',
    path: ['to']
});

module.exports = {
    ListRoomsSchema,
    GetRoomDetailSchema,
    GetRoomCalendarSchema
};
