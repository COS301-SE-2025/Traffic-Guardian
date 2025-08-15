const db = require('../config/db');

const archivesModel = {
    getArchives: async (filters = {}) => {
        let query = `SELECT * FROM "ArchivesV2"`;
        const values = [];
        const conditions = [];
        
        // Build WHERE clause based on provided filters
        if (filters.type) {
            values.push(filters.type);
            conditions.push(`"Archive_Type" = $${values.length}`);
        }
        
        if (filters.severity) {
            values.push(filters.severity);
            conditions.push(`"Archive_Severity" = $${values.length}`);
        }
        
        if (filters.status) {
            values.push(filters.status);
            conditions.push(`"Archive_Status" = $${values.length}`);
        }
        
        if (filters.camera_id) {
            values.push(parseInt(filters.camera_id));
            conditions.push(`"Archive_CameraID" = $${values.length}`);
        }
        
        if (filters.incident_id) {
            values.push(parseInt(filters.incident_id));
            conditions.push(`"Archive_IncidentID" = $${values.length}`);
        }
        
        // Date range filtering
        if (filters.date_from) {
            values.push(filters.date_from);
            conditions.push(`"Archive_DateTime" >= $${values.length}`);
        }
        
        if (filters.date_to) {
            values.push(filters.date_to);
            conditions.push(`"Archive_DateTime" <= $${values.length}`);
        }
        
        // Search functionality using the search text field
        if (filters.search) {
            values.push(`%${filters.search.toLowerCase()}%`);
            conditions.push(`LOWER("Archive_SearchText") LIKE $${values.length}`);
        }
        
        // Tag filtering
        if (filters.tags) {
            // Handle both single tag and array of tags
            const tagsArray = Array.isArray(filters.tags) ? filters.tags : [filters.tags];
            tagsArray.forEach(tag => {
                values.push(tag);
                conditions.push(`"Archive_Tags" @> $${values.length}::jsonb`);
            });
        }
        
        // Add WHERE clause if we have conditions
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        
        // Add ordering (newest first)
        query += ' ORDER BY "Archive_Date" DESC';
        
        // Add pagination if provided
        if (filters.limit) {
            values.push(parseInt(filters.limit));
            query += ` LIMIT $${values.length}`;
            
            if (filters.offset) {
                values.push(parseInt(filters.offset));
                query += ` OFFSET $${values.length}`;
            }
        }
        
        try {
            const { rows } = await db.query(query, values);
            return rows;
        } catch (error) {
            console.error('Database query error in getArchives:', error);
            throw error;
        }
    },
    
    // Get archive statistics
    getArchiveStats: async () => {
        const query = `
            SELECT 
                "Archive_Type" as type,
                "Archive_Severity" as severity,
                "Archive_Status" as status,
                COUNT(*) as count
            FROM "ArchivesV2"
            GROUP BY "Archive_Type", "Archive_Severity", "Archive_Status"
            ORDER BY count DESC
        `;
        
        try {
            const { rows } = await db.query(query);
            return rows;
        } catch (error) {
            console.error('Database query error in getArchiveStats:', error);
            throw error;
        }
    },
    
    // Get archive by ID
    getArchiveById: async (archiveId) => {
        const query = `SELECT * FROM "ArchivesV2" WHERE "Archive_ID" = $1`;
        
        try {
            const { rows } = await db.query(query, [archiveId]);
            return rows[0];
        } catch (error) {
            console.error('Database query error in getArchiveById:', error);
            throw error;
        }
    }
};

module.exports = archivesModel;