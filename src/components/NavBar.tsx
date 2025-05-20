import React, { useState } from "react";
import "./NavBar.css";

import logo from "../assets/TrafficGuardianLogo1_LightFinal.png";
import searchIcon from "../assets/thin-white-search.png";

const Navbar = () => {
  const [active, setActive] = useState("Dashboard");

  const navItems = [
    "Dashboard",
    "Live Feed",
    "Incidents",
    "Archives",
    "Analytics",
    "Account",
  ];

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <ul className="nav-links">
          {navItems.slice(0, 3).map((item) => (
            <li
              key={item}
              className={active === item ? "nav-item active" : "nav-item"}
              onClick={() => setActive(item)}
            >
              {item}
            </li>
          ))}

          <li className="logo-container">
            <img src={logo} alt="Logo" className="navbar-logo" />
          </li>

          {navItems.slice(3).map((item) => (
            <li
              key={item}
              className={active === item ? "nav-item active" : "nav-item"}
              onClick={() => setActive(item)}
            >
              {item}
            </li>
          ))}

          <li>
            <img src={searchIcon} alt="Search" className="search-icon" />
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
