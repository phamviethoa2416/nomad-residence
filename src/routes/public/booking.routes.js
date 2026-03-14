const express = require('express');
const router = express.Router();
const controller = require('../../controllers/public/booking.controller');

router.post('/', controller.createBooking);
router.get('/lookup', controller.lookupBooking);

module.exports = router;