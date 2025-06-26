const { Pool } = require('pg');

// For local development, load environment variables from .env file if GitHub secrets aren't available
if (!process.env.DATABASE_HOST) {
  console.log('GitHub Codespace secrets not found. Loading from .env file for local development...');
  require('dotenv').config({
    path: require('path').join(__dirname, '../../.env')
  });
}

// Validate required database credentials
const requiredSecrets = [
  'DATABASE_USERNAME',
  'DATABASE_HOST', 
  'DATABASE_NAME',
  'DATABASE_PASSWORD',
  'DATABASE_PORT'
];

// DATABASE_SSL is optional with a default (AWS RDS requires SSL)
if (!process.env.DATABASE_SSL) {
  console.log('DATABASE_SSL not set, defaulting to true for AWS RDS compatibility');
  process.env.DATABASE_SSL = 'true';
}

const missingSecrets = requiredSecrets.filter(secret => !process.env[secret]);
if (missingSecrets.length > 0) {
  console.error('Missing required database credentials:', missingSecrets);
  console.error('For local development, create a .env file with these variables.');
  console.error('For production, ensure GitHub Codespace secrets are configured.');
  process.exit(1);
}

// Create a connection pool to efficiently manage database connections
const pool = new Pool({
  user: process.env.DATABASE_USERNAME,
  host: process.env.DATABASE_HOST,
  database: process.env.DATABASE_NAME, 
  password: process.env.DATABASE_PASSWORD,
  port: parseInt(process.env.DATABASE_PORT, 10),
  // Connection pool settings
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 50000, // Return an error after 5 seconds if connection could not be established
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
});

// Log connection attempt but hide sensitive information
console.log('Database configuration loaded:');
console.log(`- Host: ${process.env.DATABASE_HOST}`);
console.log(`- Database: ${process.env.DATABASE_NAME}`);
console.log(`- User: ${process.env.DATABASE_USERNAME}`);
console.log(`- Password: [REDACTED]`);
console.log(`- Port: ${process.env.DATABASE_PORT}`);
console.log(`- SSL: ${process.env.DATABASE_SSL === 'true' ? 'Enabled (required for AWS RDS)' : 'Disabled'}`);

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