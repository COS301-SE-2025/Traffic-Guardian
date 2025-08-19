import React from 'react';
const RoutePlanner: React.FC = () => {
  return (
    <div className="routeplanner-view">
      <h2>Map View</h2>
      <p>This is where the routeplanner will be displayed.</p>
      <div className="routeplanner-container">
        {/* Placeholder for routeplanner */}
        <div className="routeplanner-placeholder">
          <p>Map Placeholder</p>
        </div>
      </div>
    </div>
  );
};
export default RoutePlanner;
