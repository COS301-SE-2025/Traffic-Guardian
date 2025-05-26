import React from 'react';
import './LiveFeed.css'; 

const LiveFeed: React.FC = () => {
  return (
    <div className="livefeed-page">
      <h2>Live Feed</h2>
      <div className="livefeed-grid">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={idx} className="feed-tile">
            <div className="feed-placeholder">Camera Feed {idx + 1}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LiveFeed;
