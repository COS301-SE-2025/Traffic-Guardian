const archivesModel = require('../models/archives');

const archivesController = {
    // Get archives with filtering and pagination
    getArchives: async (req, res) => {
        try {
            const filters = {
                type: req.query.type,
                severity: req.query.severity,
                status: req.query.status,
                camera_id: req.query.camera_id,
                incident_id: req.query.incident_id,
                date_from: req.query.date_from,
                date_to: req.query.date_to,
                search: req.query.search,
                tags: req.query.tags,
                limit: req.query.limit || 50,
                offset: req.query.offset || 0
            };
            
            // Remove undefined filters
            Object.keys(filters).forEach(key => {
                if (filters[key] === undefined) {
                    delete filters[key];
                }
            });
            
            const archivesData = await archivesModel.getArchives(filters);
            return res.status(200).json(archivesData);
            
        } catch (err) {
            console.error('Get Archives error:', err);
            return res.status(500).json({ 
                error: 'Internal server error',
                details: err.message 
            });
        }
    },
    
    // Get archive statistics
    getArchiveStats: async (req, res) => {
        try {
            const stats = await archivesModel.getArchiveStats();
            return res.status(200).json(stats);
            
        } catch (err) {
            console.error('Get Archive Stats error:', err);
            return res.status(500).json({ 
                error: 'Internal server error',
                details: err.message 
            });
        }
    },
    
    // Get specific archive by ID
    getArchiveById: async (req, res) => {
        try {
            const archiveId = req.params.id;
            
            if (!archiveId || isNaN(parseInt(archiveId))) {
                return res.status(400).json({ error: 'Valid archive ID is required' });
            }
            
            const archive = await archivesModel.getArchiveById(archiveId);
            
            if (!archive) {
                return res.status(404).json({ error: 'Archive not found' });
            }
            
            return res.status(200).json(archive);
            
        } catch (err) {
            console.error('Get Archive By ID error:', err);
            return res.status(500).json({ 
                error: 'Internal server error',
                details: err.message 
            });
        }
    }
};

module.exports = archivesController;