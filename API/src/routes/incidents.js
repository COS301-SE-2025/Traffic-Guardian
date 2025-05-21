const express = require('express');
const incidentController = require('../controllers/incidentController');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// All routes in this file require authentication
router.use(authMiddleware.authenticate);

router.post('/', incidentController.createIncident);
router.get('/', incidentController.getIncidents);
router.get('/:id', incidentController.getIncident);
router.put('/:id', incidentController.updateIncident);

module.exports = router;