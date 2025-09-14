import React from 'react';
import './LoadingSpinner.css';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  text?: string;
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'medium', 
  text = 'Loading...', 
  className = '' 
}) => {
  return (
    <div className={`loading-spinner-container ${className}`}>
      <div className={`loading-spinner ${size}`}></div>
      {text && <div className="loading-text">{text}</div>}
    </div>
  );
};

export default LoadingSpinner;