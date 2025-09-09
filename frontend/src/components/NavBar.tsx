import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import './NavBar.css';
import logo from '../assets/TrafficGuardianLogo1_LightFinal.png';

const navItems = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Live Feed', path: '/live-feed' },
  { label: 'Map', path: '/map' },
  { label: 'Incidents', path: '/incidents' },
  { label: 'Archives', path: '/archives' },
  { label: 'Analytics', path: '/analytics' },
  { label: 'Account', path: '/account' },
  { label: 'Help', path: '/help' },
];

const Navbar = () => {
  const location = useLocation();
  return (
    <nav className="navbar">
      <div className="navbar-content">
        <ul className="tg-nav-links">
          {navItems.slice(0, 3).map(item => (
            <li
              key={item.label}
              className={`nav-item ${
                location.pathname === item.path ? 'active' : ''
              }`}
            >
              <Link to={item.path}>{item.label}</Link>
            </li>
          ))}

          <li className="logo-container">
            <img src={logo} alt="Logo" className="navbar-logo" />
          </li>

          {navItems.slice(3, 7).map(item => (
            <li
              key={item.label}
              className={`nav-item ${
                location.pathname === item.path ? 'active' : ''
              }`}
            >
              <Link to={item.path}>{item.label}</Link>
            </li>
          ))}

          <li className="icon-group">
            <div className="help-icon-container">
              <Link
                to="/help"
                className={`help-link ${
                  location.pathname === '/help' ? 'active' : ''
                }`}
              >
                <HelpOutlineIcon className="help-icon" />
              </Link>
            </div>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
