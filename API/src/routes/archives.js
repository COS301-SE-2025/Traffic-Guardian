const express = require('express');
const archivesController = require('../controllers/archivesController');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// All routes in this file require authentication
router.use(authMiddleware.authenticate);

router.get('/', archivesController.getArchives);

module.exports = router;