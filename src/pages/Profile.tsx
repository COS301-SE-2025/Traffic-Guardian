import React from 'react';
import './Profile.css';
import Button from '../components/Button'; // ⬅️ Import reusable button
import { useNavigate } from 'react-router-dom';

const Profile: React.FC = () => {
  const navigate = useNavigate();

  const handleSignOut = () => {
    // Future: clear auth state, tokens, etc.
    navigate('/');
  };

  return (
    <div className="profile-page">
      <h2>User Profile</h2>

      <div className="profile-container">
        <div className="section">
          <h3>Account Info</h3>
          <p><strong>Name:</strong> John Doe</p>
          <p><strong>Email:</strong> johndoe@example.com</p>
        </div>

        <div className="section">
          <h3>Preferences</h3>
          <label>
            <input type="checkbox" checked />
            Receive incident alerts
          </label>
          <label>
            <input type="checkbox" />
            Enable dark mode
          </label>
        </div>

        <div className="section">
          <h3>Security</h3>
          <Button label="Change Password" onClick={() => alert('Coming soon')} />
        </div>

        <div className="section">
          <Button label="Sign Out" onClick={handleSignOut} />
        </div>
      </div>
    </div>
  );
};

export default Profile;
