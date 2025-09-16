const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'super-secret';

exports.issue = (user) => jwt.sign({ sub:user.id, role:user.role, email:user.email }, SECRET, { expiresIn: '7d' });

exports.requireAuth = (req, res, next) => {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'missing-token' });
  try {
    req.user = jwt.verify(token, SECRET);
    return next();
  } catch {
    return res.status(401).json({ error: 'invalid-token' });
  }
};
