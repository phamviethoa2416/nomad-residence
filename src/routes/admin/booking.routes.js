const express = require('express');
const router = express.Router();
const controller = require('../../controllers/admin/booking.controller');

router.get('/', controller.listBookings);
router.post('/manual', controller.createManualBooking);
router.get('/:id', controller.getBooking);
router.put('/:id/confirm', controller.confirmBooking);
router.put('/:id/cancel', controller.cancelBooking);

module.exports = router;