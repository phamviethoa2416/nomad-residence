const { asyncHandler, AppError } = require('../../middlewares/errorHandler');
const pricingService = require('../../services/pricing.service');
const { PricingRoomParamsSchema, PricingRuleParamsSchema, CreatePricingRuleBodySchema, UpdatePricingRuleBodySchema } = require('../../validators/admin/pricing.validators');

const listRules = asyncHandler(async (req, res) => {
    const params = PricingRoomParamsSchema.parse(req.params);
    const rules = await pricingService.getRoomPricingRules(params.id);
    res.json({
        success: true,
        data: rules
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
        data: rule
    });
});

const updateRule = asyncHandler(async (req, res) => {
    const params = PricingRuleParamsSchema.parse(req.params);
    const data = UpdatePricingRuleBodySchema.parse(req.body || {});

    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.rule_type !== undefined) updateData.ruleType = data.rule_type;
    if (data.date_from !== undefined) updateData.dateFrom = data.date_from;
    if (data.date_to !== undefined) updateData.dateTo = data.date_to;
    if (data.day_of_week !== undefined) updateData.dayOfWeek = data.day_of_week;
    if (data.price_modifier !== undefined) updateData.priceModifier = data.price_modifier;
    if (data.modifier_type !== undefined) updateData.modifierType = data.modifier_type;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.is_active !== undefined) updateData.isActive = data.is_active;

    const rule = await pricingService.updatePricingRule(params.ruleId, updateData);
    res.json({
        success: true,
        data: rule
    });
});

const deleteRule = asyncHandler(async (req, res) => {
    const params = PricingRuleParamsSchema.parse(req.params);
    await pricingService.deletePricingRule(params.ruleId);
    res.json({
        success: true,
        message: 'Đã xóa rule giá'
    });
});

module.exports = {
    listRules,
    createRule,
    updateRule,
    deleteRule
};