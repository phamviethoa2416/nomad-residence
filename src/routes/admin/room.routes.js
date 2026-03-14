const express = require('express');
const router = express.Router();
const controller = require('../../controllers/admin/room.controller');
const pricingController = require('../../controllers/admin/pricing.controller');
const blockedController = require('../../controllers/admin/blocked-dates.controller');
const icalController = require('../../controllers/admin/ical.controller');

// Room CRUD
router.get('/', controller.listRooms);
router.post('/', controller.createRoom);
router.get('/:id', controller.getRoom);
router.put('/:id', controller.updateRoom);
router.delete('/:id', controller.deleteRoom);

// Images
router.post('/:id/images', controller.addImage);
router.delete('/:id/images/:imageId', controller.deleteImage);
router.put('/:id/images/reorder', controller.reorderImages);

// Amenities
router.put('/:id/amenities', controller.updateAmenities);

// Pricing rules
router.get('/:id/pricing', pricingController.listRules);
router.post('/:id/pricing', pricingController.createRule);

// Blocked dates
router.get('/:id/blocked-dates', blockedController.listBlockedDates);
router.post('/:id/blocked-dates', blockedController.blockDates);

// iCal
router.get('/:id/ical', icalController.listIcalLinks);
router.post('/:id/ical', icalController.addIcalLink);
router.get('/:id/ical/export-url', icalController.getExportUrl);

module.exports = router;