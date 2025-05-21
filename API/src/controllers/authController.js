const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const userModel = require('../models/user');

const authController = {  login: async (req, res) => {
    try {
      const { User_Email, User_Password } = req.body;
      
      if (!User_Email || !User_Password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }
      
      const user = await userModel.findByEmail(User_Email);
      
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
        const isMatch = await bcrypt.compare(User_Password, user.User_Password);
      
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      // Generate JWT token
      const token = jwt.sign(
        { id: user.User_ID, username: user.User_Username, role: user.User_Role },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
      );
      
      // Set token as HTTP-only cookie
      res.cookie('token', token, {
        httpOnly: true,
        maxAge: 8 * 60 * 60 * 1000, // 8 hours
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });
      
      // Return user data (excluding password)
      const { password: _, ...userData } = user;
      return res.status(200).json({ 
        message: 'Login successful',
        user: userData,
        token
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },
  
  logout: (req, res) => {
    // Clear the auth cookie
    res.clearCookie('token');
    return res.status(200).json({ message: 'Logout successful' });
  },
    register: async (req, res) => {
    try {
      const { User_Username, User_Password, User_Email, User_Role, User_Preferences } = req.body;
        if (!User_Username || !User_Password || !User_Email) {
        return res.status(400).json({ error: 'Username, password, and email are required' });
      }
      
      // Check if username is already taken
      const existingUserByUsername = await userModel.findByUsername(User_Username);
      if (existingUserByUsername) {
        return res.status(409).json({ error: 'Username is already taken' });
      }
      
      // Check if email is already taken
      const existingUserByEmail = await userModel.findByEmail(User_Email);
      if (existingUserByEmail) {
        return res.status(409).json({ error: 'Email is already in use' });
      }
      
      // Create new user
      const newUser = await userModel.createUser({
        User_Username,
        User_Password,
        User_Email,
        User_Role: User_Role || 'user', // Default role
        User_Preferences: User_Preferences || '{}'
      });
      
      return res.status(201).json({ 
        message: 'User registered successfully',
        user: newUser
      });
    } catch (error) {
      console.error('Registration error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },
  
  getProfile: async (req, res) => {
    try {
      // req.user is set by the authenticate middleware
      const { password, ...userData } = req.user;
      return res.status(200).json(userData);
    } catch (error) {
      console.error('Get profile error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
};

module.exports = authController;