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
    console.warn(`⚠️  Rate limit exceeded for ${type} from ${req.ip} (${violationData.count} violations in last minute)`);
  }
  
  // Send response without additional logging
  res.status(429).json({
    error: `Too many ${type} requests from this IP, please try again later.`,
    retryAfter: req.rateLimit?.resetTime ? new Date(req.rateLimit.resetTime) : 'soon'
  });
};

// Different rate limits for different endpoints
const rateLimiters = {
  // General API rate limit - 100 requests per 15 minutes
  general: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: createSmartRateLimitHandler('general'),
  }),

  // Camera operations - more restrictive (20 requests per 5 minutes)
  camera: rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 20, // limit each IP to 20 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req, res) => {
      // Use both IP and user ID for authenticated requests
      return req.user ? `${req.ip}-${req.user.User_ID}` : req.ip;
    },
    handler: createSmartRateLimitHandler('camera'),
  }),

  // Camera bulk operations - very restrictive (5 requests per 10 minutes)
  cameraBulk: rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req, res) => {
      return req.user ? `${req.ip}-${req.user.User_ID}` : req.ip;
    },
    handler: createSmartRateLimitHandler('cameraBulk'),
  }),

  // Camera status updates - moderate (50 requests per 10 minutes)
  cameraStatus: rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 50, // limit each IP to 50 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req, res) => {
      return req.user ? `${req.ip}-${req.user.User_ID}` : req.ip;
    },
    handler: createSmartRateLimitHandler('cameraStatus'),
  }),

  // Authentication - strict (10 attempts per 15 minutes)
  auth: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // limit each IP to 10 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful requests
    handler: createSmartRateLimitHandler('auth'),
  }),

  // Dashboard/Analytics - moderate (30 requests per 10 minutes)
  dashboard: rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    handler: createSmartRateLimitHandler('dashboard'),
  }),
};

module.exports = rateLimiters;