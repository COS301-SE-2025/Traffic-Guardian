import React, { useEffect } from "react";
import { useTheme } from "../consts/ThemeContext";
import './Archives.css';
import underConstructionIcon from '../assets/UnderCon_icon.png';

const Archives: React.FC = () => {
  const { isDarkMode } = useTheme();

  useEffect(() => {
    document.body.classList.add('no-scroll');
    return () => {
      document.body.classList.remove('no-scroll');
    };
  }, []);

  return (
    <div className={`archives-page ${isDarkMode ? 'dark-mode' : 'light-mode'}`}>
      <div className="under-construction">
        <img src={underConstructionIcon} alt="Under Construction" />
        <p>Archives Page is Under Construction</p>
      </div>
    </div>
  );
};

export default Archives;
