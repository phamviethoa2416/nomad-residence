const express = require('express');
const router = express.Router();
const controller = require('../../controllers/admin/blockedDate.controller');

router.delete('/:id', controller.unblockDate);

module.exports = router;