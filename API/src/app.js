const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// Import optimization services
const cacheService = require('./services/cacheService');
const dataCleanupService = require('./services/dataCleanupService');
const backgroundJobService = require('./services/backgroundJobService');
const rateLimiters = require('./middleware/rateLimiter');
const { requestPrioritizer, memoryOptimizer } = require('./middleware/optimization');
const { monitor, errorTrackingMiddleware, createHealthEndpoint } = require('./services/performanceMonitor');
const { circuitBreakerMiddleware } = require('./services/circuitBreaker');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const incidentRoutes = require('./routes/incidents');
const alertRoutes = require('./routes/alerts');
const trafficRoutes = require('./routes/traffic'); // NEW LINE ADDED
const pemsRoutes = require('./routes/pems'); // PEMS traffic data routes
const archivesRoutes = require('./routes/archives');
const adminRoutes = require('./routes/admin');
const cameraRoutes = require('./routes/cameras');
const systemRoutes = require('./routes/system');
const uploadRoutes = require('./routes/voice');

// Create Express application
const app = express();

// Middleware
app.use(helmet()); // Security headers

// Performance monitoring middleware
app.use(monitor.middleware());
app.use(requestPrioritizer);
app.use(memoryOptimizer);
app.use(circuitBreakerMiddleware);

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(cookieParser()); // Parse cookies
app.use(morgan('dev')); // HTTP request logger

// Enhanced health check endpoint with comprehensive metrics (no general rate limiting)
app.get('/api/health', rateLimiters.health, createHealthEndpoint());

// Apply general rate limiting to remaining API routes
app.use('/api', rateLimiters.general);

// Define routes with optimized rate limiting
app.use('/api/auth', rateLimiters.auth, authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/incidents', rateLimiters.incidents, incidentRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/traffic', trafficRoutes);
app.use('/api/pems', pemsRoutes);
app.use('/api/archives', archivesRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/cameras', rateLimiters.camera, cameraRoutes);
app.use('/api/system', rateLimiters.internal, systemRoutes);
app.use('/api/uploads', uploadRoutes);

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ error: 'Not Found' });
});

// Error handler with performance tracking
app.use(errorTrackingMiddleware);
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Initialize optimization services
console.log('Initializing optimization services...');

// Start scheduled database cleanup
dataCleanupService.startScheduledCleanup();

// Start background job processor
backgroundJobService.start();
backgroundJobService.scheduleCameraDataSync();

// Warm up caches if needed
cacheService.warmCache().catch(err => {
  console.error('Cache warming failed:', err);
});

console.log('Optimization services initialized');


module.exports = app;