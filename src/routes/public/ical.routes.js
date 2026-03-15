const express = require('express');
const router = express.Router();
const controller = require('../../controllers/public/ical.controller');

router.get('/:room_id/calendar.ics', controller.exportIcal);

module.exports = router;
