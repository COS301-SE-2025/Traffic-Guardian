import React from 'react';
import './LoadingSpinner.css';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  text?: string;
  className?: string;
  'data-testid'?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  text = 'Loading...',
  className = '',
  'data-testid': dataTestId,
}) => {
  return (
    <div
      className={`loading-spinner-container ${className}`}
      data-testid={dataTestId}
    >
      <div className={`loading-spinner ${size}`} />
      {text && <div className="loading-text">{text}</div>}
    </div>
  );
};

export default LoadingSpinner;
