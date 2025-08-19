const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// Import optimization services
const cacheService = require('./services/cacheService');
const dataCleanupService = require('./services/dataCleanupService');
const rateLimiters = require('./middleware/rateLimiter');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const incidentRoutes = require('./routes/incidents');
const alertRoutes = require('./routes/alerts');
const trafficRoutes = require('./routes/traffic'); // NEW LINE ADDED
const archivesRoutes = require('./routes/archives');
const adminRoutes = require('./routes/admin');
const cameraRoutes = require('./routes/cameras');

// Create Express application
const app = express();

// Middleware
app.use(helmet()); // Security headers

// Apply general rate limiting
app.use('/api', rateLimiters.general);

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(cookieParser()); // Parse cookies
app.use(morgan('dev')); // HTTP request logger

// Define routes
app.use('/api/auth', rateLimiters.auth, authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/traffic', trafficRoutes); // NEW LINE ADDED
app.use('/api/archives', archivesRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/cameras', cameraRoutes);

// Health check endpoint (includes optimization status)
app.get('/api/health', (req, res) => {
  const healthData = {
    status: 'OK',
    timestamp: new Date(),
    optimization: {
      cacheService: 'active',
      dataCleanup: dataCleanupService.getStatus(),
      deduplicationService: 'active'
    }
  };
  res.status(200).json(healthData);
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ error: 'Not Found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Initialize optimization services
console.log('Initializing optimization services...');

// Start scheduled database cleanup
dataCleanupService.startScheduledCleanup();

// Warm up caches if needed
cacheService.warmCache().catch(err => {
  console.error('Cache warming failed:', err);
});

console.log('Optimization services initialized');

module.exports = app;