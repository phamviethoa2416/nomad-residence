const z = require('zod');

const PricingRoomParamsSchema = z.object({
    id: z.coerce.number().int().positive('ID phòng không hợp lệ'),
});

const PricingRuleParamsSchema = z.object({
    ruleId: z.coerce.number().int().positive('ID cấu hình giá không hợp lệ'),
});

const CreatePricingRuleBodySchema = z
    .object({
        name: z.string().optional(),

        rule_type: z.string().min(1, 'Loại cấu hình là bắt buộc'),

        date_from: z.coerce.date().nullable().optional(),

        date_to: z.coerce.date().nullable().optional(),

        day_of_week: z.array(z.coerce.number().int().min(0).max(6)).optional().default([]),

        price_modifier: z.coerce.number({
            required_error: 'Giá trị điều chỉnh là bắt buộc',
        }),

        modifier_type: z.string().optional().default('fixed'),

        priority: z.coerce.number().int().optional().default(0),

        is_active: z.boolean().optional().default(true),
    })
    .refine(
        (data) => {
            if (data.date_from && data.date_to) {
                return data.date_from <= data.date_to;
            }
            return true;
        },
        {
            message: 'Ngày kết thúc phải sau ngày bắt đầu',
            path: ['date_to'],
        },
    );

const UpdatePricingRuleBodySchema = z
    .object({
        name: z.string().optional(),

        rule_type: z.string().min(1).optional(),

        date_from: z.coerce.date().nullable().optional(),

        date_to: z.coerce.date().nullable().optional(),

        day_of_week: z.array(z.coerce.number().int().min(0).max(6)).optional(),

        price_modifier: z.coerce.number().optional(),

        modifier_type: z.string().optional(),

        priority: z.coerce.number().int().optional(),

        is_active: z.boolean().optional(),
    })
    .refine(
        (data) => {
            if (data.date_from && data.date_to) {
                return data.date_from <= data.date_to;
            }
            return true;
        },
        {
            message: 'Ngày kết thúc phải sau ngày bắt đầu',
            path: ['date_to'],
        },
    );

module.exports = {
    PricingRoomParamsSchema,
    PricingRuleParamsSchema,
    CreatePricingRuleBodySchema,
    UpdatePricingRuleBodySchema,
};
