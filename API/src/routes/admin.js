const express = require('express');
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/auth');
const router = express.Router();


router.use(authMiddleware.authenticate);


router.get('/stats', adminController.getAdminStats);

module.exports = router;