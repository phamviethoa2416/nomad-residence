const { asyncHandler } = require('../../middlewares/errorHandler');
const pricingService = require('../../services/pricing.service');
const { pickAndMap } = require('../../utils/objectHelper');
const {
    PricingRoomParamsSchema,
    PricingRuleParamsSchema,
    CreatePricingRuleBodySchema,
    UpdatePricingRuleBodySchema,
} = require('../../validators/admin/pricing.validators');

const PRICING_RULE_KEY_MAP = {
    name: 'name',
    rule_type: 'ruleType',
    date_from: 'dateFrom',
    date_to: 'dateTo',
    day_of_week: 'dayOfWeek',
    price_modifier: 'priceModifier',
    modifier_type: 'modifierType',
    priority: 'priority',
    is_active: 'isActive',
};

const listRules = asyncHandler(async (req, res) => {
    const params = PricingRoomParamsSchema.parse(req.params);
    const rules = await pricingService.getRoomPricingRules(params.id);
    res.json({
        success: true,
        data: rules,
    });
});

const createRule = asyncHandler(async (req, res) => {
    const params = PricingRoomParamsSchema.parse(req.params);
    const data = CreatePricingRuleBodySchema.parse(req.body || {});

    const rule = await pricingService.createPricingRule(params.id, {
        name: data.name,
        ruleType: data.rule_type,
        dateFrom: data.date_from || null,
        dateTo: data.date_to || null,
        dayOfWeek: data.day_of_week,
        priceModifier: data.price_modifier,
        modifierType: data.modifier_type,
        priority: data.priority,
        isActive: data.is_active,
    });

    res.status(201).json({
        success: true,
        data: rule,
    });
});

const updateRule = asyncHandler(async (req, res) => {
    const params = PricingRuleParamsSchema.parse(req.params);
    const data = UpdatePricingRuleBodySchema.parse(req.body || {});

    const updateData = pickAndMap(data, PRICING_RULE_KEY_MAP);
    const rule = await pricingService.updatePricingRule(params.ruleId, updateData);
    res.json({
        success: true,
        data: rule,
    });
});

const deleteRule = asyncHandler(async (req, res) => {
    const params = PricingRuleParamsSchema.parse(req.params);
    await pricingService.deletePricingRule(params.ruleId);
    res.json({
        success: true,
        message: 'Đã xóa rule giá',
    });
});

module.exports = {
    listRules,
    createRule,
    updateRule,
    deleteRule,
};
