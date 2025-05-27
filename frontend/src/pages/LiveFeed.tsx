import React from 'react';
import './LiveFeed.css';
import itrafficimg1 from '../assets/itrafficimg1.jpeg';
import itrafficimg2 from '../assets/itrafficimg2.jpeg';
import itrafficimg3 from '../assets/itrafficimg3.jpeg';
import itrafficimg4 from '../assets/itrafficimg4.jpeg';
import itrafficimg5 from '../assets/itrafficimg5.jpeg';
import itrafficimg6 from '../assets/itrafficimg6.jpeg';

interface CameraFeed {
  id: string;
  location: string;
  status: 'Online' | 'Offline';
  image: string;
}

const cameraFeeds: CameraFeed[] = [
  { id: 'CAM-N1-03', location: 'N1 Western Bypass', status: 'Online', image: itrafficimg1 },
  { id: 'CAM-M1-15', location: 'M1 Sandton Junction', status: 'Online', image: itrafficimg2 },
  { id: 'CAM-R21-08', location: 'R21 OR Tambo', status: 'Offline', image: itrafficimg3 },
  { id: 'CAM-N3-12', location: 'N3 Johannesburg South', status: 'Online', image: itrafficimg4 },
  { id: 'CAM-M2-07', location: 'M2 Germiston East', status: 'Online', image: itrafficimg5 },
  { id: 'CAM-R24-05', location: 'R24 Edenvale', status: 'Online', image: itrafficimg6 },
];

const LiveFeed: React.FC = () => {
  const getStatusClass = (status: string) => status.toLowerCase();

  return (
    <div className="livefeed-page" data-cy="livefeed-page">
      <div className="livefeed-header">
        <h2 data-cy="livefeed-title">Live Camera Feeds</h2>
        <div className="livefeed-subtitle" data-cy="livefeed-subtitle">
          Real-time traffic monitoring
        </div>
      </div>
      <div className="livefeed-grid" data-cy="livefeed-grid">
        {cameraFeeds.map((feed) => (
          <div key={feed.id} className="feed-tile" data-cy={`feed-tile-${feed.id}`}>
            <div className="feed-image-container">
              <img src={feed.image} alt={`Camera feed from ${feed.location}`} className="feed-image" data-cy="feed-image" />
              <div className="live-feed-overlay" data-cy="live-feed-overlay">
                <div className={`status-badge ${getStatusClass(feed.status)}`} data-cy="feed-status">
                  {feed.status}
                </div>
              </div>
            </div>
            <div className="feed-details" data-cy="feed-details">
              <div className="feed-info">
                <div>
                  <h4 data-cy="feed-id">{feed.id}</h4>
                  <p data-cy="feed-location">{feed.location}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default LiveFeed;