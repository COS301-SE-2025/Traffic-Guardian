import React, { useState } from 'react';
import './SignUp.css';
import { useNavigate } from 'react-router-dom';
import drivingCarsHighwayImg from '../assets/driving_cars_highway.jpg';

const SignUp: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = () => {
    if (!formData.username || !formData.email || !formData.password) {
      setError('All fields are required');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {return;}

    setLoading(true);

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/auth/register`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            User_Username: formData.username,
            User_Email: formData.email,
            User_Password: formData.password,
            User_Role: 'user',
            User_Preferences: '{}',
          }),
        },
      );

      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        const data = await response.json();
        if (!response.ok)
        {throw new Error(data.message || 'Registration failed');}
      } else {
        const text = await response.text();
        if (!response.ok) {throw new Error(text || 'Registration failed');}
      }

      setSuccess(true);
      setTimeout(() => navigate('/account'), 2000);
    } catch (err: any) {
      setError(err.message || 'An error occurred during registration');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="signup-page">
        <div className="signup-auth-container">
          <div className="signup-image-container">
            <img
              src={drivingCarsHighwayImg}
              alt="Cars driving on highway"
              className="signup-auth-image"
            />
            <div className="signup-image-overlay">
              <h3>Welcome Aboard</h3>
              <p>Your journey with Traffic Guardian begins now</p>
            </div>
          </div>
          <div className="signup-form-container success-message">
            <h2>Registration Successful!</h2>
            <p>You will be redirected to your profile shortly.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="signup-page">
      <div className="signup-auth-container">
        <div className="signup-image-container">
          <img
            src={drivingCarsHighwayImg}
            alt="Cars driving on highway"
            className="signup-auth-image"
          />
          <div className="signup-image-overlay">
            <h3>Join Traffic Guardian</h3>
            <p>Start your journey towards smarter traffic monitoring</p>
          </div>
        </div>

        <div className="signup-form-container">
          <h2>Create Account</h2>
          <p>Welcome to Traffic Guardian - Let's create your account</p>
          <div className="signup-divider" />

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

          <form onSubmit={handleSubmit} data-testid="signup-form" noValidate>
            <div className="signup-form-group">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                name="username"
                data-testid="username-input"
                value={formData.username}
                onChange={handleChange}
                required
                minLength={3}
                maxLength={30}
              />
            </div>

            <div className="signup-form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                data-testid="email-input"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="signup-form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                data-testid="password-input"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>

            <div className="signup-form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                data-testid="confirm-password-input"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              className="signup-btn"
              data-testid="submit-button"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="loading loading-spinner" />
                  Processing...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div className="signup-text">
            Already have an account?{' '}
            <span className="signup-link" onClick={() => navigate('/account')}>
              Sign In
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
