const db = require('../config/db');

const alertModel = {  async createAlert(alertData) {
    const { 
      Alerts_IncidentID, 
      Alerts_Message, 
      //Alert_Type, 
      Alert_recipients
    } = alertData;
    
    // Always let PostgreSQL handle the ID generation for primary keys
    const query = `
      INSERT INTO "Alerts" (
      "Alerts_IncidentID", 
      "Alerts_Message", 
      "Alert_recipients"
      ) 
      VALUES ($1, $2, $3) 
      RETURNING *
    `;
      
    const values = [
      Alerts_IncidentID, 
      Alerts_Message, 
      Alert_recipients || '{}'
    ];
    
    const { rows } = await db.query(query, values);
    return rows[0];
  },  async getAlertsByIncidentId(Alerts_IncidentID) {
    const query = 'SELECT * FROM "Alerts" WHERE "Alerts_IncidentID" = $1';
    const { rows } = await db.query(query, [Alerts_IncidentID]);
    return rows;
  },  async updateAlertMessage(Alerts_ID, Alerts_Message) {
    const query = `
      UPDATE "Alerts"
      SET "Alerts_Message" = $1
      WHERE "Alerts_ID" = $2 
      RETURNING *
    `;
    
    const { rows } = await db.query(query, [Alerts_Message, Alerts_ID]);
    return rows[0];

  },  async getAllAlerts() {
    const query = `SELECT * FROM "Alerts"`;    
    const { rows } = await db.query(query);

    return rows;
  }
};

module.exports = alertModel;