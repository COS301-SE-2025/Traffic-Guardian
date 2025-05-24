const db = require('../config/db');

const alertModel = {  async createAlert(alertData) {
    const { 
      Alert_IncidentID, 
      Alert_Message, 
      Alert_Type, 
      Alert_Severity,
      Alert_Recipients,
      Alert_Status
    } = alertData;
    
    // Always let PostgreSQL handle the ID generation for primary keys
    const query = `
      INSERT INTO "TrafficGuardian"."Alerts" (
      "Alert_IncidentID", 
      "Alert_Message", 
      "Alert_Type", 
      "Alert_Severity",
      "Alert_Recipients",
      "Alert_Status"
      ) 
      VALUES ($1, $2, $3, $4, $5, $6) 
      RETURNING *
    `;
      
    const values = [
      Alert_IncidentID, 
      Alert_Message, 
      Alert_Type, 
      Alert_Severity || 'medium',
      Array.isArray(Alert_Recipients) ? Alert_Recipients : [Alert_Recipients],
      Alert_Status || 'pending'
    ];
    
    const { rows } = await db.query(query, values);
    return rows[0];
  },
  async getAlertsByIncidentId(Alert_IncidentID) {
    const query = 'SELECT * FROM "TrafficGuardian"."Alerts" WHERE "Alert_IncidentID" = $1';
    const { rows } = await db.query(query, [Alert_IncidentID]);
    return rows;
  },
  async updateAlertStatus(Alert_ID, Alert_Status) {
    const query = `
      UPDATE "TrafficGuardian"."Alerts"
      SET "Alert_Status" = $1
      WHERE "Alert_ID" = $2 
      RETURNING *
    `;
    
    const { rows } = await db.query(query, [Alert_Status, Alert_ID]);
    return rows[0];
  },
  async getActiveAlerts(userId) {
    // Get alerts where the user is in the recipients array and status is not 'resolved'
    /* const query0 = `
      SELECT * FROM "TrafficGuardian"."Alerts"
      WHERE $1 = ANY("Alert_Recipients") 
      AND "Alert_Status" != 'resolved' 
    `; */

    const query = `SELECT * FROM "TrafficGuardian"."Alerts"`;


    
    const { rows } = await db.query(query/* , [userId] */);
    return rows;
  }
};

module.exports = alertModel;