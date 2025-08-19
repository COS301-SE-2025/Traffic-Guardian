const express = require('express');
const incidentController = require('../controllers/incidentController');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// All routes in this file require authentication
router.use(authMiddleware.authenticate);

router.post('/', incidentController.createIncident);
router.get('/', incidentController.getIncidents);

// Specific routes must come BEFORE parameterized routes
router.get('/stats', incidentController.getIncidentStats);
router.get('/today', incidentController.getTodayIncidents);

// Parameterized routes come last
router.get('/:id', incidentController.getIncident);
router.put('/:id', incidentController.updateIncident);

// Import alertController to handle alert-related endpoints within incidents
const alertController = require('../controllers/alertController');
router.get('/:id/alerts', alertController.getAlertsByIncident);

module.exports = router;