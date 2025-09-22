// src/components/StatsCard.tsx
import React from 'react';
// import './StatsCard.css';

interface StatsCardProps {
  title: string;
  value: number | string;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value }) => {
  return (
    <div className="stats-card" data-testid="stats-card">
      <h4>{title}</h4>
      <p>{value}</p>
    </div>
  );
};

export default StatsCard;
