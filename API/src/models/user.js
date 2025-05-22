const db = require('../config/db');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const userModel = {  async findByUsername(username) {
    const query = 'SELECT * FROM "TrafficGuardian"."Users" WHERE "User_Username" = $1';
    const { rows } = await db.query(query, [username]);
    return rows[0];
  },
  
  async findByEmail(email) {
    const query = 'SELECT * FROM "TrafficGuardian"."Users" WHERE "User_Email" = $1';
    const { rows } = await db.query(query, [email]);
    return rows[0];
  },
  async findById(id) {
    const query = 'SELECT * FROM "TrafficGuardian"."Users" WHERE "User_ID" = $1';
    const { rows } = await db.query(query, [id]);
    return rows[0];
  },  async createUser(userData) {
    const { User_Username, User_Password, User_Email, User_Role, User_Preferences, User_APIKey } = userData;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(User_Password, salt);
    
    // Generate a random API key if not provided
    const apiKey = User_APIKey || crypto.randomBytes(10).toString('hex').slice(0, 15);
    
    const query = `
      INSERT INTO "TrafficGuardian"."Users" ("User_Username", "User_Password", "User_Email", "User_Role", "User_Preferences", "User_APIKey") 
      VALUES ($1, $2, $3, $4, $5, $6) 
      RETURNING "User_ID", "User_Username", "User_Email", "User_Role", "User_Preferences", "User_APIKey"
    `;
    
    const values = [User_Username, hashedPassword, User_Email, User_Role || 'user', User_Preferences || '{}', apiKey];
    const { rows } = await db.query(query, values);
    return rows[0];
  },
  async updatePreferences(userId, preferences) {
    // Convert preferences object to JSON if it's not already a string
    const preferencesJson = typeof preferences === 'string' 
      ? preferences 
      : JSON.stringify(preferences);
    
    const query = `
      UPDATE "TrafficGuardian"."Users"
      SET "User_Preferences" = $1
      WHERE "User_ID" = $2 
      RETURNING "User_ID", "User_Username", "User_Email", "User_Role", "User_Preferences"
    `;
    
    const { rows } = await db.query(query, [preferencesJson, userId]);
    return rows[0];
  },

  async getPreferences(userId) {
    const query = 'SELECT "User_Preferences" FROM "TrafficGuardian"."Users" WHERE "User_ID" = $1';
    const { rows } = await db.query(query, [userId]);
    return rows[0]?.User_Preferences || {};
  },

  async generateAPIKey(userId) {
    // Generate a random API key (15 characters)
    const apiKey = crypto.randomBytes(10).toString('hex').slice(0, 15);
    
    const query = `
      UPDATE "TrafficGuardian"."Users" 
      SET "User_APIKey" = $1 
      WHERE "User_ID" = $2 
      RETURNING "User_ID", "User_Username", "User_Email", "User_Role", "User_APIKey"
    `;
    
    const { rows } = await db.query(query, [apiKey, userId]);
    return rows[0];
  },
  
  async validateAPIKey(apiKey) {
    const query = 'SELECT * FROM "TrafficGuardian"."Users" WHERE "User_APIKey" = $1';
    const { rows } = await db.query(query, [apiKey]);
    return rows[0];
  },
};

module.exports = userModel;