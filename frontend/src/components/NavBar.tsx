import React from "react";
import { Link, useLocation } from "react-router-dom";
import SearchIcon from "@mui/icons-material/Search"; // Import MUI Search icon
import "./NavBar.css";

import logo from "../assets/TrafficGuardianLogo1_LightFinal.png";

const navItems = [
  { label: "Dashboard", path: "/dashboard" },
  { label: "Live Feed", path: "/live-feed" },
  { label: "Incidents", path: "/incidents" },
  { label: "Archives", path: "/archives" },
  { label: "Analytics", path: "/analytics" },
  { label: "Account", path: "/account" },
];

const Navbar = () => {
  const location = useLocation();
  return (
    <nav className="navbar">
      <div className="navbar-content">
        <ul className="nav-links">
          {navItems.slice(0, 3).map((item) => (
            <li
              key={item.label}
              className={`nav-item ${
                location.pathname === item.path ? "active" : ""
              }`}
            >
              <Link to={item.path}>{item.label}</Link>
            </li>
          ))}

          <li className="logo-container">
            <img src={logo} alt="Logo" className="navbar-logo" />
          </li>

          {navItems.slice(3).map((item) => (
            <li
              key={item.label}
              className={`nav-item ${
                location.pathname === item.path ? "active" : ""
              }`}
            >
              <Link to={item.path}>{item.label}</Link>
            </li>
          ))}

          <li className="search-icon-container">
            <SearchIcon className="search-icon" />
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;