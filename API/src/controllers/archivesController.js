const archivesModel = require('../models/archives');

const archivesController = {
    getArchives: async(req, res)=>{
        try{
            const archivesData = await archivesModel.getArchives();
            return res.status(200).json(archivesData);

        }catch(err){
            console.error('Get Archives status error:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
};

module.exports = archivesController;