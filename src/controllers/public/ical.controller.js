const { asyncHandler, AppError } = require('../../middlewares/errorHandler');
const icalService = require('../../services/ical.service');
const { ExportIcalParamsSchema, ExportIcalQuerySchema } = require('../../validators/public/ical.validators');

const exportIcal = asyncHandler(async (req, res) => {
    const params = ExportIcalParamsSchema.parse(req.params || {});
    const query = ExportIcalQuerySchema.parse(req.query || {});

    if (!icalService.verifyIcalToken(params.room_id, query.token)) {
        throw new AppError('Mã xác thực (token) không hợp lệ', 403, 'FORBIDDEN_ICAL');
    }

    const icsContent = await icalService.generateIcal(params.room_id);

    if (!icsContent) {
        throw new AppError(
            'Không thể tạo iCal cho phòng này',
            500,
            'ICAL_GENERATION_FAILED'
        );
    }

    res.status(200);

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="room-${params.room_id}.ics"`);
    res.setHeader('Cache-Control', 'public, max-age=300');

    res.send(icsContent);
});

module.exports = { exportIcal };
