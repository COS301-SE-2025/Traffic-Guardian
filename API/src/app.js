const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const incidentRoutes = require('./routes/incidents');
const alertRoutes = require('./routes/alerts');
const trafficRoutes = require('./routes/traffic'); // NEW LINE ADDED
const archivesRoutes = require('./routes/archives');
const adminRoutes = require('./routes/admin');

// Create Express application
const app = express();

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(cookieParser()); // Parse cookies
app.use(morgan('dev')); // HTTP request logger

// Define routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/traffic', trafficRoutes); // NEW LINE ADDED
app.use('/api/archives', archivesRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
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

module.exports = app;