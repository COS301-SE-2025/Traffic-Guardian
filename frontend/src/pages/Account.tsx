import React, { useState, useEffect } from 'react';
import './Account.css';
import { useNavigate } from 'react-router-dom';

const Account: React.FC = () => {
  const navigate = useNavigate();
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Check if user is already logged in
  useEffect(() => {
    const apiKey = localStorage.getItem('apiKey');
    if (apiKey) {
      navigate('/profile');
    }
  }, [navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoginData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          User_Email: loginData.email,
          User_Password: loginData.password
        }),
      });

      const contentType = response.headers.get('content-type');
      let data: any = {};

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        if (response.ok) {
          setTimeout(() => navigate('/profile'), 2000);
          return;
        }
        throw new Error(text || 'Login failed');
      }

      if (!response.ok) {
        throw new Error(data.message || 'Login failed. Check your credentials.');
      }

      if (data.apiKey) {
        localStorage.setItem('apiKey', data.apiKey);
      }
      
      navigate('/profile');

    } catch (err: any) {
      setError(err.message || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="account-page">
      <div className="login-container">
        <h2>Welcome Back</h2>
        <p>Welcome to Traffic Guardian - Sign in</p>
        <div className="divider" />
        
        {error && (
          <div className="alert alert-error" data-testid="error-message">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} data-testid="login-form">
          <div className="form-group">
            <label htmlFor="email">Email:</label>
            <input
              type="email"
              id="email"
              name="email"
              value={loginData.email}
              onChange={handleChange}
              required
              placeholder="Enter your email"
              data-testid="email-input"
            />
          </div>
          
          <div className="form-group password-row">
            <label htmlFor="password">Password:</label>
            <span className="forgot-link" data-testid="forgot-link">Forgot?</span>
            <input
              type="password"
              id="password"
              name="password"
              value={loginData.password}
              onChange={handleChange}
              required
              placeholder="Enter your password"
              data-testid="password-input"
            />
          </div>
          
          <button className="signup-btn" type="submit" disabled={loading} data-testid="submit-button">
            {loading ? (
              <>
                <span className="loading loading-spinner"></span>
                Logging in...
              </>
            ) : (
              'Login'
            )}
          </button>
        </form>

        <div className="signup-text">
          Don't have an account?{' '}
          <span className="signup-link" onClick={() => navigate('/signup')} data-testid="signup-link">
            Sign up
          </span>
        </div>
      </div>
      <div className="showcase-container">
        {/* Add image or animation later */}
      </div>
    </div>
  );
};

export default Account;