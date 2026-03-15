const express = require('express');
const router = express.Router();
const controller = require('../../controllers/admin/dashboard.controller');

router.get('/', controller.getSettings);
router.put('/', controller.updateSettings);

module.exports = router;
