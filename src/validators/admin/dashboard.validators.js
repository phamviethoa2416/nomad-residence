const z = require('zod');

const SettingItemSchema = z.object({
    key: z.string().min(1, 'Key không được để trống'),
    value: z.string(),
});

const UpdateSettingsBodySchema = z
    .object({
        key: z.string().min(1, 'Key không được để trống').optional(),
        value: z.string().optional(),
        settings: z.array(SettingItemSchema).optional(),
    })
    .refine(
        (data) => {
            if (data.settings && data.settings.length > 0) return true;
            return typeof data.key === 'string' && data.value !== undefined;
        },
        {
            message: 'Thiếu cấu hình thiết lập đơn lẻ hoặc mảng settings',
            path: ['settings'],
        },
    );

module.exports = {
    UpdateSettingsBodySchema,
};
