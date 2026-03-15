const { asyncHandler } = require('../../middlewares/errorHandler');
const icalService = require('../../services/ical.service');
const {
    IcalRoomParamsSchema,
    IcalLinkParamsSchema,
    AddIcalLinkBodySchema,
} = require('../../validators/admin/ical.validators');

const listIcalLinks = asyncHandler(async (req, res) => {
    const params = IcalRoomParamsSchema.parse(req.params);
    const links = await icalService.getIcalLinks(params.id);
    res.json({
        success: true,
        data: links,
    });
});

const addIcalLink = asyncHandler(async (req, res) => {
    const params = IcalRoomParamsSchema.parse(req.params);
    const data = AddIcalLinkBodySchema.parse(req.body || {});

    const link = await icalService.addIcalLink(params.id, {
        platform: data.platform,
        importUrl: data.import_url || null,
    });

    res.status(201).json({
        success: true,
        data: link,
    });
});

const deleteIcalLink = asyncHandler(async (req, res) => {
    const params = IcalLinkParamsSchema.parse(req.params);
    await icalService.deleteIcalLink(params.linkId);
    res.json({
        success: true,
        message: 'Đã xóa liên kết iCal',
    });
});

const syncIcalLink = asyncHandler(async (req, res) => {
    const params = IcalLinkParamsSchema.parse(req.params);
    const result = await icalService.syncIcalLink(params.linkId);
    res.json({
        success: true,
        data: result,
    });
});

const getExportUrl = asyncHandler(async (req, res) => {
    const params = IcalRoomParamsSchema.parse(req.params);
    const url = icalService.getExportUrl(params.id);
    res.json({
        success: true,
        data: { exportUrl: url },
    });
});

module.exports = {
    listIcalLinks,
    addIcalLink,
    deleteIcalLink,
    syncIcalLink,
    getExportUrl,
};
