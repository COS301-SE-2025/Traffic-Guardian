import React from 'react';
import './Account.css'; // Reuse the same styles
import { useNavigate } from "react-router-dom";
const SignUp: React.FC = () => {
    const navigate = useNavigate();
  return (
    <div className="account-page">
      <div className="login-container">
        <h2>Create Account</h2>
        <p>Welcome to Traffic Guardian - Let's create your account</p>
        <div className="divider" />

        <form>
          <div className="form-group">
            <label htmlFor="email">Email:</label>
            <input type="email" id="email" name="email" required />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password:</label>
            <input type="password" id="password" name="password" required />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Retype Password:</label>
            <input type="password" id="confirmPassword" name="confirmPassword" required />
          </div>

          <button className="signup-btn" type="submit">Sign Up</button>
        </form>

        <div className="signup-text">
          Already have an account? <span className="signup-link" onClick={()=>navigate("/account")}>
            Login</span>
        </div>
      </div>

      <div className="showcase-container">
        {/* Thinking of adding some 3d animation or some some stock footage */}
      </div>
    </div>
  );
};

export default SignUp;
