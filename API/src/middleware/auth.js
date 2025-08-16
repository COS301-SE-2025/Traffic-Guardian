/*
const userModel = require('../models/user');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

const authMiddleware = {
  authenticate: async (req, res, next) => {
    try {
      // Get API key from header
      const apiKey = req.header('X-API-Key');
      
      if (!apiKey) {
        return res.status(401).json({ error: 'API key required' });
      }
      
      // Validate API key
      const user = await userModel.validateAPIKey(apiKey);
      
      if (!user) {
        return res.status(401).json({ error: 'Invalid API key' });
      }
      
      // Attach user to request for use in route handlers
      req.user = user;
      next();
    } catch (error) {
      console.error('Authentication error:', error);
      return res.status(500).json({ error: 'Authentication failed' });
    }
  },
  
  authorize: (roles = []) => {
    // Convert string to array if needed
    if (typeof roles === 'string') {
      roles = [roles];
    }
    
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      if (roles.length && !roles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      
      next();
    };
  }
};

module.exports = authMiddleware;
*/
const jwt = require('jsonwebtoken');
const userModel = require('../models/user');

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

const authMiddleware = {
  authenticate: async (req, res, next) => {
    try {
      const apiKey = req.header('X-API-Key');
      if (apiKey) {
        const user = await userModel.validateAPIKey(apiKey);
        if (!user) {
          return res.status(401).json({ error: 'Invalid API key' });
        }
        req.user = user;
        return next();
      }

      const authHeader = req.headers['authorization'] || req.cookies?.token;
      const token =
        authHeader && authHeader.startsWith("Bearer ")
          ? authHeader.split(" ")[1]
          : authHeader;

      if (token) {
        jwt.verify(token, JWT_SECRET, async (err, decoded) => {
          if (err) return res.status(403).json({ error: 'Invalid or expired token' });

          // Optionally fetch full user if you want DB data instead of just payload
          const user = await userModel.findById(decoded.id);
          if (!user) return res.status(401).json({ error: 'Invalid token user' });

          req.user = user;
          return next();
        });
        return;
      }

      // 3. If neither provided
      return res.status(401).json({ error: 'Authentication required' });
    } catch (error) {
      console.error('Authentication error:', error);
      return res.status(500).json({ error: 'Authentication failed' });
    }
  },

  authorize: (roles = []) => {
    if (typeof roles === 'string') {
      roles = [roles];
    }

    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (roles.length && !roles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      next();
    };
  }
};

module.exports = authMiddleware;
