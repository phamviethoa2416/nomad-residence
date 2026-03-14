const express = require('express');
const router = express.Router();
const controller = require('../../controllers/public/payment.controller');

router.get('/vietqr', controller.getQRPayment);
router.post('/vietqr/webhook', controller.vietqrWebhook);
router.get('/status', controller.checkStatus);

module.exports = router;