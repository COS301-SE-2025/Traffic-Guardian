const app = require('./app');
const db = require('./config/db');
require('dotenv').config();
const PORT = 5000;
const HOST = process.env.HOST || 'localhost';

// Test database connection before starting server
db.query('SELECT NOW()')
  .then(() => {
    console.log('Database connection established');
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`Database connection established`);
      console.log(`Server running on port ${PORT}`);
      console.log(`API available at: http://${HOST}:${PORT}`);
      console.log(`API documentation available at: http://${HOST}:${PORT}/api-docs`);
    });
  })
  .catch(err => {
    console.error('Database connection failed:', err);
    process.exit(1);
  });