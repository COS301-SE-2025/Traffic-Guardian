const express = require('express');
const archivesController = require('../controllers/archivesController');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// All routes in this file require authentication
router.use(authMiddleware.authenticate);

// Get archives with filtering and pagination
router.get('/', archivesController.getArchives);

// Get archive statistics
router.get('/stats', archivesController.getArchiveStats);

// Get specific archive by ID
router.get('/:id', archivesController.getArchiveById);

module.exports = router;