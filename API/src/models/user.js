const db = require('../config/db');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const userModel = {  async findByUsername(username) {
    const query = 'SELECT * FROM "User" WHERE "User_Username" = $1';
    const { rows } = await db.query(query, [username]);
    return rows[0];
  },
  
  async findByEmail(email) {
    const query = 'SELECT * FROM "User" WHERE "User_Email" = $1';
    const { rows } = await db.query(query, [email]);
    return rows[0];
  },
  // Email is now the primary key
  async findById(email) {
    const query = 'SELECT * FROM "User" WHERE "User_Email" = $1';
    const { rows } = await db.query(query, [email]);
    return rows[0];
  },async createUser(userData) {
    const { User_Username, User_Password, User_Email, User_Role, User_Preferences, User_APIKey, User_Fullname, User_Cellphone } = userData;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(User_Password, salt);
    
    // Generate a random API key if not provided
    const apiKey = User_APIKey || crypto.randomBytes(10).toString('hex').slice(0, 15);
      const query = `
      INSERT INTO "User" ("User_Email", "User_Preferences", "User_Username", "User_Password", "User_Fullname", "User_Cellphone", "User_Role", "User_APIKey") 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
      RETURNING "User_Email", "User_Username", "User_Role", "User_Preferences", "User_APIKey", "User_Fullname", "User_Cellphone"
    `;
      const values = [
      User_Email, 
      User_Preferences || '{}',
      User_Username, 
      hashedPassword, 
      User_Fullname || '',
      User_Cellphone || '',
      User_Role || 'User', 
      apiKey
    ];
    const { rows } = await db.query(query, values);
    return rows[0];
  },  async updatePreferences(userEmail, preferences) {
    // Convert preferences object to JSON if it's not already a string
    const preferencesJson = typeof preferences === 'string' 
      ? preferences 
      : JSON.stringify(preferences);
      const query = `
      UPDATE "User"
      SET "User_Preferences" = $1
      WHERE "User_Email" = $2 
      RETURNING "User_Email", "User_Username", "User_Role", "User_Preferences"
    `;
    
    const { rows } = await db.query(query, [preferencesJson, userEmail]);
    return rows[0];
  },  async getPreferences(userEmail) {
    const query = 'SELECT "User_Preferences" FROM "User" WHERE "User_Email" = $1';
    const { rows } = await db.query(query, [userEmail]);
    return rows[0]?.User_Preferences || {};
  },

  async generateAPIKey(userEmail) {
    // Generate a random API key (15 characters)
    const apiKey = crypto.randomBytes(10).toString('hex').slice(0, 15);
    
    const query = `
      UPDATE "User" 
      SET "User_APIKey" = $1 
      WHERE "User_Email" = $2 
      RETURNING "User_Email", "User_Username", "User_Role", "User_APIKey"
    `;
    
    const { rows } = await db.query(query, [apiKey, userEmail]);
    return rows[0];
  },
  
  async validateAPIKey(apiKey) {
    const query = 'SELECT * FROM "User" WHERE "User_APIKey" = $1';
    const { rows } = await db.query(query, [apiKey]);
    return rows[0];
  },
};

module.exports = userModel;