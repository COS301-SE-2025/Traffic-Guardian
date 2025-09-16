const db = require('../config/db');
const reportGen = require('../ReportGenerator/reportGenerator');

const incidentModel = {  async createIncident(incidentData) {
    const { 
      Incidents_DateTime, 
      Incidents_Longitude, 
      Incidents_Latitude, 
      Incident_Severity, 
      Incident_Status, 
      Incident_Reporter,
      Incident_CameraID,
      Incident_Description
    } = incidentData;
      const query = `
      INSERT INTO "Incidents" (
        "Incidents_DateTime", 
        "Incidents_Longitude", 
        "Incidents_Latitude", 
        "Incident_Severity", 
        "Incident_Status", 
        "Incident_Reporter",
        "Incident_CameraID",
        "Incident_Description"
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
      RETURNING *
    `;
    
    const values = [
      Incidents_DateTime || new Date(), 
      Incidents_Longitude,
      Incidents_Latitude, 
      Incident_Severity || 'medium', 
      Incident_Status || 'ongoing', 
      Incident_Reporter,
      Incident_CameraID,
      Incident_Description
    ];
    
    const { rows } = await db.query(query, values);
    //reportGen.generatePDF(values) did not test yet
    return rows[0];
  },  async getIncidentById(Incidents_ID) {
    const query = 'SELECT * FROM "Incidents" WHERE "Incidents_ID" = $1';
    const { rows } = await db.query(query, [Incidents_ID]);
    return rows[0];
  },async updateIncident(Incidents_ID, incidentData) {
    const allowedFields = [
      'Incidents_DateTime', 
      'Incidents_Longitude', 
      'Incidents_Latitude', 
      'Incident_Severity', 
      'Incident_Status', 
      'Incident_Reporter',
      'Incident_CameraID',
      'Incident_Description'
    ];
    
    // Safely truncate string values to max 10 characters
    for (let v in incidentData) {
        // Only apply length check and truncation to string values
        if (incidentData[v] && typeof incidentData[v] === 'string' && incidentData[v].length > 10) {
            incidentData[v] = incidentData[v].substring(0, 10);
        }
    }
      
    // Filter out undefined fields and only include allowed fields
    const validFields = Object.keys(incidentData)
      .filter(key => allowedFields.includes(key) && incidentData[key] !== undefined);
    
    if (validFields.length === 0) {
      throw new Error('No valid fields to update');
    }
    
    // Build the parameterized query
    const setClause = validFields.map((key, i) => `"${key}" = $${i + 2}`).join(', ');
    const queryParams = [Incidents_ID, ...validFields.map(key => incidentData[key])];
    
    const query = `
      UPDATE "Incidents"
      SET ${setClause}
      WHERE "Incidents_ID" = $1 
      RETURNING *
    `;
    
    const { rows } = await db.query(query, queryParams);
    return rows[0];
  },

  async getIncidents(filters = {}) {
    let query = 'SELECT * FROM "Incidents"';
    const values = [];
    const conditions = [];
    
    // Build WHERE clause based on provided filters
    if (filters.status) {
      values.push(filters.status);
      conditions.push(`Incident_Status = $${values.length}`);
    }
    
    if (filters.severity) {
      values.push(filters.severity);
      conditions.push(`Incident_Severity = $${values.length}`);
    }
    
    if (filters.reported_by) {
      values.push(filters.reported_by);
      conditions.push(`Incident_Reporter = $${values.length}`);
    }

    // if (filters.incident_type) {
    //   values.push(filters.incident_type);
    //   conditions.push(`incident_type = $${values.length}`);
    // }
    
    // Add WHERE clause if we have conditions
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    // // Add ordering
    // query += ' ORDER BY created_at DESC';
    
    // Add pagination if provided
    if (filters.limit) {
      values.push(parseInt(filters.limit));
      query += ` LIMIT $${values.length}`;
      
      if (filters.offset) {
        values.push(parseInt(filters.offset));
        query += ` OFFSET $${values.length}`;
      }
    }
    
    const { rows } = await db.query(query, values);
    return rows;
  }, async getIncidentCount() {
    const query = 'SELECT COUNT(*) as count FROM "Incidents"';
    const { rows } = await db.query(query);
    return parseInt(rows[0].count);
  },

  async getIncidentStats() {
    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN "Incident_Severity" = 'high' THEN 1 END) as high_severity,
        COUNT(CASE WHEN "Incident_Severity" = 'medium' THEN 1 END) as medium_severity,
        COUNT(CASE WHEN "Incident_Severity" = 'low' THEN 1 END) as low_severity,
        COUNT(CASE WHEN "Incident_Status" = 'open' THEN 1 END) as open_status,
        COUNT(CASE WHEN "Incident_Status" = 'ongoing' THEN 1 END) as ongoing_status,
        COUNT(CASE WHEN "Incident_Status" = 'resolved' THEN 1 END) as resolved_status,
        COUNT(CASE WHEN "Incident_Status" = 'closed' THEN 1 END) as closed_status
      FROM "Incidents"
    `;
    const { rows } = await db.query(query);
    return rows[0];
  },

  async getIncidentsByDateRange(filters) {
    const { startDate, endDate } = filters;
    const query = `
      SELECT * FROM "Incidents" 
      WHERE "Incidents_DateTime" BETWEEN $1 AND $2 
      ORDER BY "Incidents_DateTime" DESC
    `;
    const { rows } = await db.query(query, [startDate, endDate]);
    return rows;
  }
};

module.exports = incidentModel;