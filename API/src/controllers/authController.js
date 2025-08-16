const bcrypt = require('bcrypt');
const userModel = require('../models/user');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey"; //will sort out soon

const authController = {  login: async (req, res) => {
    try {
      const { User_Email, User_Password } = req.body;
      
      if (!User_Email || !User_Password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const validEmail = User_Email.match(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/);
      const validPassword = User_Password.match(/^(?=.*[a-z])(?=.*\d).+$/);

      if(validEmail === null){
        return res.status(400).json({error: 'Invalid password and/or email'});
      }

      
      const user = await userModel.findByEmail(User_Email);
      
      if (!user) {
        return res.status(401).json({ error: 'Invalid email' });
      }
      
      const isMatch = await bcrypt.compare(User_Password, user.User_Password);
      
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid password' });
      }
      
      // Generate or retrieve API key
      let userWithKey = user;
      if (!user.User_APIKey) {
        userWithKey = await userModel.generateAPIKey(user.User_ID);
      }

      //jwt stuff here
      const payload = { 
        id: userWithKey.User_ID, 
        email: userWithKey.User_Email, 
        role: userWithKey.User_Role 
      };
      
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });
      //jwt stuff end

        // Return user data with API key (excluding password) + token
      const { User_Password: _, ...userData } = userWithKey;      return res.status(200).json({
        message: 'Login successful',
        user: userData,
        apiKey: userData.User_APIKey,
        token
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },
    logout: (req, res) => {
    // API keys don't need to be cleared server-side
    return res.status(200).json({ message: 'Logout successful. Please discard the API key on the client side.' });
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
        // Create new user with API key
      const newUser = await userModel.createUser({
        User_Username,
        User_Password,
        User_Email,
        User_Role: User_Role || 'user', // Default role
        User_Preferences: User_Preferences || '{}'
        // API key will be generated automatically
      });
      
      return res.status(201).json({ 
        message: 'User registered successfully',
        user: newUser,
        apiKey: newUser.User_APIKey
      });
    } catch (error) {
      console.error('Registration error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },
    getProfile: async (req, res) => {
    try {
      // req.user is set by the authenticate middleware
      const { User_Password, ...userData } = req.user;
      return res.status(200).json(userData);
    } catch (error) {
      console.error('Get profile error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
};

module.exports = authController;