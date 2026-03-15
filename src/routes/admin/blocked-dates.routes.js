const express = require('express');
const router = express.Router();
const controller = require('../../controllers/admin/blocked-dates.controller');

router.delete('/:id', controller.unblockDate);

module.exports = router;
