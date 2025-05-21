import React from 'react';
import './Account.css';

const Account: React.FC = () => {
  return (
    <div className="dashboard">
      <div className="login-container">
        <h2>Welcome Back</h2>
        <p>Welcome to Traffic Guardian - Sign in</p>
        <form>
          <div className="form-group">
            <label htmlFor="username">Username:</label>
            <input type="text" id="username" name="username" required />
          </div>

          <div className="form-group password-row">
            <label htmlFor="password">Password:</label>
            <span className="forgot-link">Forgot?</span>
            <input type="password" id="password" name="password" required />
          </div>

          <button type="submit">Login</button>
        </form>

        <div className="signup-text">
          Don’t have an account? <span className="signup-link">Sign up</span>
        </div>
      </div>

      <div className="showcase-container">
        {/* You can add an image here later */}
      </div>
    </div>
  );
};

export default Account;
