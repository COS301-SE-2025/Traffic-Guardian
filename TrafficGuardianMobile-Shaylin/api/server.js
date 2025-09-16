const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(helmet());
app.use(cors({
  origin: ['http://localhost:19006', 'exp://127.0.0.1:19000'], // Expo development URLs
  credentials: true
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100 
});
app.use('/api/mobile', limiter);

app.use(express.json({ limit: '10mb' }));

const mobileAuthRoutes = require('./routes/mobile-auth');
const mobileIncidentRoutes = require('./routes/mobile-incidents');
const mobileAnalyticsRoutes = require('./routes/mobile-analytics');
const mobileLocationRoutes = require('./routes/mobile-location');

app.use('/api/mobile/auth', mobileAuthRoutes);
app.use('/api/mobile/incidents', mobileIncidentRoutes);
app.use('/api/mobile/analytics', mobileAnalyticsRoutes);
app.use('/api/mobile/location', mobileLocationRoutes);

app.get('/api/mobile/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Traffic Guardian Mobile API' 
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, () => {
  console.log(`Traffic Guardian Mobile API running on port ${PORT}`);
});

module.exports = app;