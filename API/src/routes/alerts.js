const express = require('express');
const alertController = require('../controllers/alertController');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// All routes in this file require authentication
router.use(authMiddleware.authenticate);

router.post('/', alertController.createAlert);
router.get('/incident/:incidentId', alertController.getAlertsByIncident);
router.put('/:id/status', alertController.updateAlertStatus);
router.get('/user', alertController.getUserAlerts);

module.exports = router;