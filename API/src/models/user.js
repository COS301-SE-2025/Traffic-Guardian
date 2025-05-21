const db = require('../config/db');
const bcrypt = require('bcrypt');

const userModel = {  async findByUsername(username) {
    const query = 'SELECT * FROM "TrafficGuardian"."User" WHERE "User_Username" = $1';
    const { rows } = await db.query(query, [username]);
    return rows[0];
  },
  
  async findByEmail(email) {
    const query = 'SELECT * FROM "TrafficGuardian"."User" WHERE "User_Email" = $1';
    const { rows } = await db.query(query, [email]);
    return rows[0];
  },
  async findById(id) {
    const query = 'SELECT * FROM "TrafficGuardian"."User" WHERE "User_ID" = $1';
    const { rows } = await db.query(query, [id]);
    return rows[0];
  },
  async createUser(userData) {
    const { User_Username, User_Password, User_Email, User_Role, User_Preferences } = userData;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(User_Password, salt);
      const query = `
      INSERT INTO "TrafficGuardian"."User" ("User_Username", "User_Password", "User_Email", "User_Role", "User_Preferences") 
      VALUES ($1, $2, $3, $4, $5) 
      RETURNING "User_ID", "User_Username", "User_Email", "User_Role", "User_Preferences"
    `;
    
    const values = [User_Username, hashedPassword, User_Email, User_Role || 'user', User_Preferences || '{}'];
    const { rows } = await db.query(query, values);
    return rows[0];
  },
  async updatePreferences(userId, preferences) {
    // Convert preferences object to JSON if it's not already a string
    const preferencesJson = typeof preferences === 'string' 
      ? preferences 
      : JSON.stringify(preferences);
    
    const query = `
      UPDATE "TrafficGuardian"."User"
      SET "User_Preferences" = $1
      WHERE "User_ID" = $2 
      RETURNING "User_ID", "User_Username", "User_Email", "User_Role", "User_Preferences"
    `;
    
    const { rows } = await db.query(query, [preferencesJson, userId]);
    return rows[0];
  },

  async getPreferences(userId) {
    const query = 'SELECT "User_Preferences" FROM "TrafficGuardian"."User" WHERE "User_ID" = $1';
    const { rows } = await db.query(query, [userId]);
    return rows[0]?.User_Preferences || {};
  }
};

module.exports = userModel;