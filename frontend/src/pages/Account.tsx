import React, { useState, useEffect } from 'react';
import './Account.css';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../consts/ThemeContext';
import CarLoadingAnimation from '../components/CarLoadingAnimation';

const Account: React.FC = () => {
  const navigate = useNavigate();
  const { toggleDarkMode } = useTheme();
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

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
            }
          );

          if (prefsResponse.ok) {
            const prefsData = await prefsResponse.json();
            console.log('Account fetched preferences:', prefsData);
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
                err
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

            console.log('Account processed preferences:', preferences);
            localStorage.setItem('theme', preferences.theme);
            toggleDarkMode(preferences.theme === 'dark');
          } else {
            console.warn(
              'Account: Failed to fetch preferences, using saved theme:',
              savedTheme
            );
            if (savedTheme) {
              toggleDarkMode(savedTheme === 'dark');
            }
          }
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
      console.log('Account: No apiKey, showing login form');
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
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/auth/login`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            User_Email: loginData.email,
            User_Password: loginData.password,
          }),
        }
      );

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
        throw new Error(
          data.message || 'Login failed. Check your credentials.'
        );
      }

      if (data.apiKey) {
        sessionStorage.setItem('apiKey', data.apiKey);
        sessionStorage.setItem('userEmail', loginData.email);
      }

      const prefsResponse = await fetch(
        `${process.env.REACT_APP_API_URL}/api/user/preferences`,
        {
          headers: {
            'X-API-Key': data.apiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      let preferences;
      if (prefsResponse.ok) {
        const prefsData = await prefsResponse.json();
        console.log('Account login fetched preferences:', prefsData);
        try {
          preferences =
            typeof prefsData.preferences === 'string' &&
            prefsData.preferences.trim()
              ? JSON.parse(prefsData.preferences)
              : prefsData.preferences || {};
        } catch (err) {
          console.warn(
            'Account login: Failed to parse preferences, using fallback',
            err
          );
          preferences = {};
        }

        // Validate theme
        const savedTheme = localStorage.getItem('theme');
        const validTheme =
          preferences.theme === 'dark' || preferences.theme === 'light'
            ? preferences.theme
            : savedTheme || 'dark';
        preferences = {
          notifications: preferences.notifications ?? true,
          alertLevel: preferences.alertLevel || 'medium',
          theme: validTheme,
        };

        console.log('Account login processed preferences:', preferences);
        localStorage.setItem('theme', preferences.theme);
        toggleDarkMode(preferences.theme === 'dark');
      } else {
        console.warn(
          'Account login: Failed to fetch preferences, using saved theme'
        );
        const savedTheme = localStorage.getItem('theme');
        preferences = {
          notifications: true,
          alertLevel: 'medium',
          theme: savedTheme || 'dark',
        };
        localStorage.setItem('theme', preferences.theme);
        toggleDarkMode(preferences.theme === 'dark');
      }

      navigate('/profile');
    } catch (err: any) {
      setError(err.message || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  if (isChecking) {
    return <CarLoadingAnimation />;
  }

  return (
    <div className="account-page">
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
            />
          </div>

          <div className="form-group password-row">
            <label htmlFor="password">Password:</label>
            <span className="forgot-link" data-testid="forgot-link">
              Forgot?
            </span>
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

          <button
            className="signup-btn"
            type="submit"
            disabled={loading}
            data-testid="submit-button"
          >
            {loading ? <CarLoadingAnimation /> : 'Login'}
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
  );
};

export default Account;
