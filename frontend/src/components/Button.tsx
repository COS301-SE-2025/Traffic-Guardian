import React from 'react';
import './Button.css';

interface ButtonProps {
  label: string;
  onClick: () => void;
  type?: 'button' | 'submit';
  className?: string;
}

const Button: React.FC<ButtonProps> = ({
  label,
  onClick,
  type = 'button',
  className = '',
}) => {
  return (
    <button
      className={`custom-button ${className}`}
      type={type}
      onClick={onClick}
    >
      {label}
    </button>
  );
};

export default Button;
