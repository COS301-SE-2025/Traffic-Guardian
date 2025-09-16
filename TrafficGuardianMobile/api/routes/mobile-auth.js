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

