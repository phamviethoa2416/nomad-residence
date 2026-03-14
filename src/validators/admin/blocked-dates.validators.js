const z = require('zod');

const RoomParamsSchema = z.object({
    id: z.coerce.number().int().positive()
});

const BlockedDateParamsSchema = z.object({
    id: z.coerce.number().int().positive('ID không hợp lệ')
});

const ListBlockedDatesQuerySchema = z.object({
    from: z.coerce.date({
        invalid_type_error: 'Ngày từ không hợp lệ'
    }).refine(d => !isNaN(d.getTime()), {
        message: 'Ngày từ không hợp lệ'
    }),

    to: z.coerce.date({
        invalid_type_error: 'Ngày đến không hợp lệ'
    }).optional()
}).refine(data => {
    if (data.from && data.to) {
        return data.from <= data.to;
    }
    return true;
}, {
    message: 'Ngày từ phải trước ngày đến',
    path: ['to']
});

const BlockDatesBodySchema = z.object({
    dates: z.array(
        z.coerce.date({
            invalid_type_error: 'Định dạng ngày không hợp lệ'
        }).refine(d => !isNaN(d.getTime()), {
            message: 'Định dạng ngày không hợp lệ'
        })
    ).min(1, 'Vui lòng cung cấp danh sách ngày'),

    reason: z.string().trim().optional()
});

module.exports = {
    RoomParamsSchema,
    BlockedDateParamsSchema,
    ListBlockedDatesQuerySchema,
    BlockDatesBodySchema
};
