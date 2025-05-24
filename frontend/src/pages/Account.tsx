import React from 'react';
import './Account.css';
import { useNavigate } from "react-router-dom";

const Account: React.FC = () => {
const navigate = useNavigate();
  return (
    <div className="account-page">
      <div className="login-container">
        <h2>Welcome Back</h2>
        <p>Welcome to Traffic Guardian - Sign in</p>
        <div className="divider" />
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

          <button className='signup-btn' type="submit" onClick={() => navigate("/profile")}>Login</button>
        </form>

        <div className="signup-text">
          Don’t have an account? <span className="signup-link" onClick={() => navigate("/signup")}>
      Sign up
    </span>
        </div>
      </div>

      <div className="showcase-container">
        {/* You can add an image here later */}
      </div>
    </div>
  );
};

export default Account;
