import React, { useState, useEffect } from 'react';
import './Account.css';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../consts/ThemeContext';
import { useUser } from '../contexts/UserContext';
import LoadingSpinner from '../components/LoadingSpinner';
import dataPrefetchService from '../services/DataPrefetchService';
import ApiService from '../services/apiService';
import aerialTrafficImg from '../assets/aerial_traffic_img.jpg';

const Account: React.FC = () => {
  const navigate = useNavigate();
  const { toggleDarkMode } = useTheme();
  const { login, logout: _, isAuthenticated, isLoading: userLoading } = useUser();
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const apiKey = sessionStorage.getItem('apiKey');
    const savedTheme = localStorage.getItem('theme');

    if (apiKey) {
      const fetchPreferences = async () => {
        try {
          const prefsResponse = await fetch(
            `${process.env.REACT_APP_API_URL}/api/user/preferences`,
            {
              headers: {
                'X-API-Key': apiKey,
                'Content-Type': 'application/json',
              },
            },
          );

          if (prefsResponse.ok) {
            const prefsData = await prefsResponse.json();
            let preferences;
            try {
              preferences =
                typeof prefsData.preferences === 'string' &&
                prefsData.preferences.trim()
                  ? JSON.parse(prefsData.preferences)
                  : prefsData.preferences || {};
            } catch (err) {
              console.warn(
                'Account: Failed to parse preferences, using fallback',
                err,
              );
              preferences = {};
            }

            // Validate theme
            const validTheme =
              preferences.theme === 'dark' || preferences.theme === 'light'
                ? preferences.theme
                : savedTheme || 'dark';
            preferences = {
              notifications: preferences.notifications ?? true,
              alertLevel: preferences.alertLevel || 'medium',
              theme: validTheme,
            };

            localStorage.setItem('theme', preferences.theme);
            toggleDarkMode(preferences.theme === 'dark');
          } else {
            console.warn(
              'Account: Failed to fetch preferences, using saved theme:',
              savedTheme,
            );
            if (savedTheme) {
              toggleDarkMode(savedTheme === 'dark');
            }
          }
          // Start background data prefetching after successful login
          dataPrefetchService.startPrefetching();
          navigate('/profile');
        } catch (err: any) {
          console.error('Account: Error fetching preferences:', err);
          if (savedTheme) {
            toggleDarkMode(savedTheme === 'dark');
          }
          setIsChecking(false);
        }
      };
      fetchPreferences();
    } else {
      setIsChecking(false);
    }
  }, [navigate, toggleDarkMode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoginData(prev => ({ ...prev, [name]: value }));
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await ApiService.login(loginData.email, loginData.password);

      if (result.apiKey) {
        // Use the UserContext login method
        login(result.apiKey, result.user);

        // Start background data prefetching after successful login
        dataPrefetchService.startPrefetching();

        // Navigate to dashboard for better user experience
        setTimeout(() => navigate('/dashboard'), 1000);
        return;
      }

      throw new Error('Login failed. No API key received.');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Check if user is already authenticated and redirect
  useEffect(() => {
    if (!userLoading) {
      if (isAuthenticated) {
        navigate('/profile');
      }
      setIsChecking(false);
    }
  }, [userLoading, isAuthenticated, navigate]);

  if (isChecking) {
    return (
      <LoadingSpinner
        size="large"
        text="Checking authentication..."
        className="fullscreen"
      />
    );
  }

  return (
    <div className="account-page">
      <div className="auth-container">
        <div className="image-container">
          <img
            src={aerialTrafficImg}
            alt="Aerial view of traffic infrastructure"
            className="auth-image"
          />
          <div className="image-overlay">
            <h3>Traffic Guardian</h3>
            <p>AI-Powered Traffic Monitoring & Incident Detection</p>
          </div>
        </div>

        <div className="login-container">
          <h2>Welcome Back</h2>
          <p>Welcome to Traffic Guardian - Sign in</p>
          <div className="divider" />

          {error && (
            <div className="alert alert-error" data-testid="error-message">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="stroke-current shrink-0 h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
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
                autoComplete="email"
              />
            </div>

            <div className="form-group password-row">
              <label htmlFor="password">Password:</label>
              <span className="forgot-link" data-testid="forgot-link">
                Forgot?
              </span>
              <div className="password-input-container">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={loginData.password}
                  onChange={handleChange}
                  required
                  placeholder="Enter your password"
                  data-testid="password-input"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  data-testid="password-toggle"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              className="signup-btn"
              type="submit"
              disabled={loading}
              data-testid="submit-button"
            >
              {loading ? <LoadingSpinner size="small" text="" /> : 'Login'}
            </button>
          </form>

          <div className="signup-text">
            Don't have an account?{' '}
            <span
              className="signup-link"
              onClick={() => navigate('/signup')}
              data-testid="signup-link"
            >
              Sign up
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Account;
