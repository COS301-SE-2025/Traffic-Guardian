const userModel = require('../models/user');

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

      //jwt auth code here:
      /*
      const authHeader = req.headers['authorization'] || req.cookies?.token;
      const token = authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : authHeader;

      if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ error: 'Invalid or expired token' });
        req.user = decoded; // decoded contains payload like { id, username }
        next();
      });
      */
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