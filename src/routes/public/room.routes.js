const express = require('express');
const router = express.Router();
const controller = require('../../controllers/public/room.controller');

router.get('/', controller.listRooms);
router.get('/:slug', controller.getRoomDetail);
router.get('/:slug/calendar', controller.getRoomCalendar);

module.exports = router;