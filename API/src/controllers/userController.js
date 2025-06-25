const userModel = require('../models/user');

const userController = {  updatePreferences: async (req, res) => {
    try {
      const userId = req.body.User_Email;
      const preferences = req.body.preferences;
      
      if (!preferences) {
        return res.status(400).json({ error: 'Preferences data is required' });
      }
      
      const updatedUser = await userModel.updatePreferences(userId, preferences);
      
      if (!updatedUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      return res.status(200).json({
        message: 'User preferences updated successfully',
        user: updatedUser
      });
    } catch (error) {
      console.error('Update preferences error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },
    getPreferences: async (req, res) => {
    try {
      const userId = req.user.User_ID;
      const preferences = await userModel.getPreferences(userId);
      
      return res.status(200).json({ preferences });
    } catch (error) {
      console.error('Get preferences error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
};

module.exports = userController;