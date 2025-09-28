const rateLimit = require('express-rate-limit');

// Track rate limit violations for smart logging
let rateLimitViolations = new Map();
const VIOLATION_LOG_THRESHOLD = 5; // Only log every 5th violation
const VIOLATION_RESET_TIME = 60000; // Reset violation count every minute

// Smart rate limit handler - reduces log spam
const createSmartRateLimitHandler = (type) => (req, res, next) => {
  const key = `${req.ip}-${type}`;
  const now = Date.now();
  
  // Get or initialize violation data
  let violationData = rateLimitViolations.get(key) || { count: 0, lastReset: now };
  
  // Reset count if enough time has passed
  if (now - violationData.lastReset > VIOLATION_RESET_TIME) {
    violationData = { count: 0, lastReset: now };
  }
  
  violationData.count++;
  rateLimitViolations.set(key, violationData);
  
  // Only log every Nth violation to reduce spam
  if (violationData.count % VIOLATION_LOG_THRESHOLD === 1) {
    console.warn(`Rate limit exceeded for ${type} from ${req.ip} (${violationData.count} violations in last minute)`);
  }
  
  // Send response without additional logging
  res.status(429).json({
    error: `Too many ${type} requests from this IP, please try again later.`,
    retryAfter: req.rateLimit?.resetTime ? new Date(req.rateLimit.resetTime) : 'soon'
  });
};

// Production-ready rate limits optimized for 50 concurrent users and 100 incident detections
const rateLimiters = {
<<<<<<< HEAD
  // General API rate limit - 100 requests per 15 minutes
  general: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // limit each IP to 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
=======
  // General API rate limit - optimized for 50 concurrent users
  general: rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes (shorter window for faster recovery)
    max: 1000, // 1000 requests per 5 minutes (allows ~200 req/min per user for 50 users)
    standardHeaders: true,
    legacyHeaders: false,
>>>>>>> Dev
    handler: createSmartRateLimitHandler('general'),
  }),

  // Camera operations - optimized for live feeds
  camera: rateLimit({
    windowMs: 2 * 60 * 1000, // 2 minutes
    max: 100, // increased for live camera data
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req, res) => {
      return req.user ? `${req.ip}-${req.user.User_ID}` : req.ip;
    },
    handler: createSmartRateLimitHandler('camera'),
  }),

<<<<<<< HEAD
  // Camera bulk operations - very restrictive (5 requests per 10 minutes)
  cameraBulk: rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 5, // limit each IP to 5 requests per windowMs
=======
  // Camera bulk operations - optimized for AI processing
  cameraBulk: rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 50, // increased for AI model batch processing
>>>>>>> Dev
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req, res) => {
      return req.user ? `${req.ip}-${req.user.User_ID}` : req.ip;
    },
    handler: createSmartRateLimitHandler('cameraBulk'),
  }),

<<<<<<< HEAD
  // Camera status updates - moderate (50 requests per 10 minutes)
=======
  // Internal system operations - very high for AI incident detection
  internal: rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 500, // high limit for 100 incident detections per minute
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req, res) => {
      return 'internal-system';
    },
    handler: createSmartRateLimitHandler('internal'),
  }),

  // Incident processing - new limiter for AI detections
  incidents: rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 150, // allows 100+ incident detections per minute with buffer
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req, res) => {
      // Use AI model identifier if available, otherwise IP
      return req.headers['x-ai-model-id'] || req.ip;
    },
    handler: createSmartRateLimitHandler('incidents'),
  }),

  // Camera status updates - optimized for real-time
>>>>>>> Dev
  cameraStatus: rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 120, // increased for real-time status updates
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req, res) => {
      return req.user ? `${req.ip}-${req.user.User_ID}` : req.ip;
    },
    handler: createSmartRateLimitHandler('cameraStatus'),
  }),

  // Authentication - still strict but reasonable
  auth: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // increased slightly for legitimate retries
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    handler: createSmartRateLimitHandler('auth'),
  }),

<<<<<<< HEAD
  // Dashboard/Analytics - moderate (30 requests per 10 minutes)
  dashboard: rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 30,
=======
  // Dashboard/Analytics - optimized for 50 concurrent users
  dashboard: rateLimit({
    windowMs: 2 * 60 * 1000, // 2 minutes
    max: 300, // increased for dashboard heavy usage (50 users * 6 requests/min)
>>>>>>> Dev
    standardHeaders: true,
    legacyHeaders: false,
    handler: createSmartRateLimitHandler('dashboard'),
  }),

  // Health checks - very lenient for monitoring
  health: rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 1000, // high limit for load balancer health checks
    standardHeaders: true,
    legacyHeaders: false,
    handler: createSmartRateLimitHandler('health'),
  }),
};

module.exports = rateLimiters;