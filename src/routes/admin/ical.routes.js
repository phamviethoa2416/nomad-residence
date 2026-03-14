const express = require('express');
const router = express.Router();
const controller = require('../../controllers/admin/ical.controller');

router.delete('/:linkId', controller.deleteIcalLink);
router.post('/:linkId/sync', controller.syncIcalLink);

module.exports = router;