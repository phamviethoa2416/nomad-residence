const express = require('express');
const router = express.Router();
const controller = require('../../controllers/admin/auth.controller');
const { authenticate } = require('../../middlewares/authenticate');

router.post('/login', controller.login);
router.get('/me', authenticate, controller.getMe);
router.put('/change-password', authenticate, controller.changePassword);

module.exports = router;
