const db = require('../config/db');

const archivesModel = {
    getArchives: async (req, res)=>{
        const query = `SELECT * FROM "Archives"`;    
        const { rows } = await db.query(query);
    
        return rows;
    }
};

module.exports = archivesModel;