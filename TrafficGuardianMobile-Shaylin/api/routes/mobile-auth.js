const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const router = express.Router();

// Mock user database - replace with our actual database
const users = [
  {
    id: 1,
    email: 'admin@trafficguardian.com',
    password: '$2a$10$8K1p/a0dDqFKLWoAYNWAhOpQ9xE2.QcgS5GmwP4zOQwKJ8yrHkYQm', // 'password123'
    role: 'admin',
    name: 'System Administrator',
    phone: '+27123456789',
    isVerified: true,
    permissions: ['view_all_incidents', 'manage_incidents', 'view_analytics', 'manage_users']
  },
  {
    id: 2,
    email: 'responder@trafficguardian.com',
    password: '$2a$10$8K1p/a0dDqFKLWoAYNWAhOpQ9xE2.QcgS5GmwP4zOQwKJ8yrHkYQm',
    role: 'field_responder',
    name: 'Emergency Responder',
    phone: '+27123456790',
    isVerified: true,
    permissions: ['view_incidents', 'update_incidents', 'create_reports']
  },
  {
    id: 3,
    email: 'citizen@example.com',
    password: '$2a$10$8K1p/a0dDqFKLWoAYNWAhOjQ9xE2.QcgS5GmwP4zOQwKJ8yrHkYQm',
    role: 'citizen',
    name: 'John Citizen',
    phone: '+27123456791',
    isVerified: true,
    permissions: ['view_public_data', 'report_incidents']
  }
];

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, phone, role = 'citizen' } = req.body;

    // Validation
    if (!email || !password || !name || !phone) {
      return res.status(400).json({ 
        error: 'All fields are required',
        required: ['email', 'password', 'name', 'phone']
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Password validation
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Check if user already exists
    const existingUser = users.find(user => user.email.toLowerCase() === email.toLowerCase());
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists with this email' });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Role-based permissions
    let permissions = ['view_public_data'];
    switch (role) {
      case 'field_responder':
        permissions = ['view_incidents', 'update_incidents', 'create_reports', 'view_public_data'];
        break;
      case 'admin':
        permissions = ['view_all_incidents', 'manage_incidents', 'view_analytics', 'manage_users', 'view_public_data'];
        break;
      case 'citizen':
      default:
        permissions = ['view_public_data', 'report_incidents'];
        break;
    }

    // Create new user
    const newUser = {
      id: users.length + 1,
      email: email.toLowerCase(),
      password: hashedPassword,
      name,
      phone,
      role,
      permissions,
      isVerified: false,
      createdAt: new Date().toISOString(),
      lastLogin: null
    };

    users.push(newUser);

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: newUser.id, 
        email: newUser.email, 
        role: newUser.role,
        permissions: newUser.permissions
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Remove password from response
    const { password: _, ...userResponse } = newUser;

    res.status(201).json({
      message: 'User registered successfully',
      user: userResponse,
      token,
      expiresIn: '24h'
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password are required' 
      });
    }

    // Find user
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    user.lastLogin = new Date().toISOString();

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role,
        permissions: user.permissions
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Remove password from response
    const { password: _, ...userResponse } = user;

    res.json({
      message: 'Login successful',
      user: userResponse,
      token,
      expiresIn: '24h'
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Verify token and get user info
router.get('/me', authenticateToken, (req, res) => {
  try {
    const user = users.find(u => u.id === req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { password: _, ...userResponse } = user;
    res.json({ user: userResponse });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user information' });
  }
});

// Refresh token
router.post('/refresh', authenticateToken, (req, res) => {
  try {
    const user = users.find(u => u.id === req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate new token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role,
        permissions: user.permissions
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      expiresIn: '24h'
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

// Logout (invalidate token - in the real app, we would maintain a blacklist)
router.post('/logout', authenticateToken, (req, res) => {
  // In the real app, we would add the token to a blacklist
  res.json({ message: 'Logged out successfully' });
});

// Middleware to authenticate JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired' });
      }
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
}

// Export the middleware for use in other routes
router.authenticateToken = authenticateToken;

module.exports = router;