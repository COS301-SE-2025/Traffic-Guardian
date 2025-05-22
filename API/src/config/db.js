const path = require('path');
require('dotenv').config({
  override: true,
  path: path.join(__dirname, '../../development.env'),
});
const { Pool } = require('pg');

// Create a connection pool to efficiently manage database connections
const pool = new Pool({
  user: process.env.USER,
  host: process.env.HOST,
  database: process.env.DATABASE,
  password: process.env.PASSWORD,
  port: process.env.PORT,
  // Connection pool settings
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
});

// Test the database connection on startup
pool.query('SELECT NOW()')
  .then(() => console.log('Database connection established successfully'))
  .catch(err => console.error('Database connection error:', err));

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  getPool: () => pool,
};