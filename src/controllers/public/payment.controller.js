const { asyncHandler} = require('../../middlewares/errorHandler');
const paymentService = require('../../services/payment.service');
const { BookingQuerySchema, WebhookHeadersSchema, WebhookBodySchema } = require('../../validators/public/payment.validators');

const getQRPayment = asyncHandler(async (req, res) => {
    const data = BookingQuerySchema.parse(req.query || {});

    const paymentInfo = await paymentService.createVietQRPayment(data.booking_code);

    res.json({
        success: true,
        data: paymentInfo
    });
});

const vietqrWebhook = asyncHandler(async (req, res) => {
    const headers = WebhookHeadersSchema.parse(req.headers);

    const body = WebhookBodySchema.parse(req.body || {});

    const result = await paymentService.handleVietQRWebhook(
        headers.authorization,
        body,
        req.ip
    );

    res.status(200).json(result);
});

const checkStatus = asyncHandler(async (req, res) => {
    const data = BookingQuerySchema.parse(req.query || {});

    const status = await paymentService.checkPaymentStatus(data.booking_code);

    res.json({
        success: true,
        data: status
    });
});

module.exports = {
    getQRPayment,
    vietqrWebhook,
    checkStatus
};
