import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import './NavBar.css';
import logo from '../assets/TrafficGuardianLogo1_LightFinal.png';
import dataPrefetchService from '../services/DataPrefetchService';

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
    <nav className="navbar" data-testid="navbar">
      <div
        data-testid="mobile-nav"
        className="mobile-nav"
        style={{ visibility: 'hidden', position: 'absolute' }}
      >
        Mobile Nav
      </div>
      <button
        data-testid="hamburger-menu"
        className="hamburger-menu"
        style={{ visibility: 'hidden', position: 'absolute' }}
      >
        Menu
      </button>
      <div className="navbar-content">
        <ul className="tg-nav-links">
          {navItems.slice(0, 4).map(item => (
            <li
              key={item.label}
              className={`nav-item ${
                location.pathname === item.path ? 'active' : ''
              }`}
            >
              <Link
                to={item.path}
                data-testid={`nav-${item.label
                  .toLowerCase()
                  .replace(' ', '-')}`}
                onMouseEnter={() => {
                  // Preload page data on hover for instant loading
                  const pageMap: Record<string, string> = {
                    '/dashboard': 'dashboard',
                    '/analytics': 'analytics',
                    '/incidents': 'incidents',
                    '/map': 'map',
                    '/live-feed': 'livefeed',
                  };
                  const pageName = pageMap[item.path];
                  if (pageName) {
                    dataPrefetchService.preloadPageData(pageName);
                  }
                }}
              >
                {item.label}
              </Link>
            </li>
          ))}

          <li className="logo-container">
            <img src={logo} alt="Logo" className="navbar-logo" />
          </li>

          {navItems.slice(4, 7).map(item => (
            <li
              key={item.label}
              className={`nav-item ${
                location.pathname === item.path ? 'active' : ''
              }`}
            >
              <Link
                to={item.path}
                data-testid={`nav-${item.label
                  .toLowerCase()
                  .replace(' ', '-')}`}
                onMouseEnter={() => {
                  // Preload page data on hover for instant loading
                  const pageMap: Record<string, string> = {
                    '/dashboard': 'dashboard',
                    '/analytics': 'analytics',
                    '/incidents': 'incidents',
                    '/map': 'map',
                    '/live-feed': 'livefeed',
                  };
                  const pageName = pageMap[item.path];
                  if (pageName) {
                    dataPrefetchService.preloadPageData(pageName);
                  }
                }}
              >
                {item.label}
              </Link>
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
