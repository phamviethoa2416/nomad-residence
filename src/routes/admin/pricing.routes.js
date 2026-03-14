const express = require('express');
const router = express.Router();
const controller = require('../../controllers/admin/pricing.controller');

router.put('/:ruleId', controller.updateRule);
router.delete('/:ruleId', controller.deleteRule);

module.exports = router;