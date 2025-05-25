const db = require('../config/db');

const incidentModel = {  async createIncident(incidentData) {
    const { 
      Incident_Date, 
      Incident_Location, 
      Incident_CarID, 
      Incident_Severity, 
      Incident_Status, 
      Incident_Reporter
    } = incidentData;
    
    const query = `
      INSERT INTO "TrafficGuardian"."Incidents" (
        "Incident_Date", 
        "Incident_Location", 
        "Incident_CarID", 
        "Incident_Severity", 
        "Incident_Status", 
        "Incident_Reporter"
      ) 
      VALUES ($1, $2, $3, $4, $5, $6) 
      RETURNING *
    `;
    
    const values = [
      Incident_Date, 
      Incident_Location, 
      Incident_CarID, 
      Incident_Severity, 
      Incident_Status || 'open', 
      Incident_Reporter
    ];
    
    const { rows } = await db.query(query, values);
    return rows[0];
  },
  async getIncidentById(Incident_ID) {
    const query = 'SELECT * FROM "TrafficGuardian"."Incidents" WHERE "Incident_ID" = $1';
    const { rows } = await db.query(query, [Incident_ID]);
    return rows[0];
  },
  async updateIncident(Incident_ID, incidentData) {
    const allowedFields = [
      'Incident_Date', 
      'Incident_Location', 
      'Incident_CarID', 
      'Incident_Severity', 
      'Incident_Status', 
      'Incident_Reporter'
    ];
    
    // Filter out undefined fields and only include allowed fields
    const updates = Object.keys(incidentData)
      .filter(key => allowedFields.includes(key) && incidentData[key] !== undefined)
      .map(key => `"${key}" = '${incidentData[key]}'`)
      .join(', ');
    
    if (!updates) {
      throw new Error('No valid fields to update');
    }
    
    const query = `
      UPDATE "TrafficGuardian"."Incidents"
      SET ${updates}
      WHERE "Incident_ID" = $1 
      RETURNING *
    `;
    
    const { rows } = await db.query(query, [Incident_ID]);
    return rows[0];
  },

  async getIncidents(filters = {}) {
    let query = 'SELECT * FROM "TrafficGuardian"."Incidents"';
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
  }
};

module.exports = incidentModel;