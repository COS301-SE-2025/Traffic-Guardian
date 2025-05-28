import React from "react";
import { useTheme } from "../consts/ThemeContext";
import './Analytics.css';
import underConstructionIcon from '../assets/UnderCon_icon.png'; // Make sure this path is correct

const Analytics: React.FC = () => {
  const { isDarkMode } = useTheme();

  return (
    <div className={`analytics-container ${isDarkMode ? 'dark-mode' : 'light-mode'}`}>
      <div className="under-construction">
        <img src={underConstructionIcon} alt="Under Construction" />
        <p>Analytics Page is Under Construction</p>
      </div>
    </div>
  );
};

export default Analytics;
