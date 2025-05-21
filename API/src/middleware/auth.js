const jwt = require('jsonwebtoken');
const userModel = require('../models/user');

const authMiddleware = {
  authenticate: async (req, res, next) => {
    try {
      const token = req.cookies.token || req.header('Authorization')?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await userModel.findById(decoded.id);
      
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }
      
      // Attach user to request for use in route handlers
      req.user = user;
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired' });
      }
      return res.status(401).json({ error: 'Invalid token' });
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