const z = require('zod');

const IcalRoomParamsSchema = z.object({
    id: z.coerce.number().int().positive('ID phòng không hợp lệ')
});

const IcalLinkParamsSchema = z.object({
    linkId: z.coerce.number().int().positive('ID liên kết không hợp lệ')
});

const AddIcalLinkBodySchema = z.object({
    platform: z.string().min(1, 'Platform là bắt buộc'),

    import_url: z.union([
        z.url('URL không hợp lệ'),
        z.literal('')
    ]).optional()
});

module.exports = {
    IcalRoomParamsSchema,
    IcalLinkParamsSchema,
    AddIcalLinkBodySchema
};
