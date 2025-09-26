import React from 'react';
import './DataAttribution.css';

const DataAttribution: React.FC = () => {
  return (
    <div className="data-attribution">
      <div className="attribution-content">
        <span className="attribution-text">
          Traffic data provided by Caltrans and PeMS
        </span>
        <div className="attribution-links">
          <a
            href="https://dot.ca.gov"
            target="_blank"
            rel="noopener noreferrer"
            className="attribution-link"
          >
            Caltrans
          </a>
          <span className="attribution-separator">•</span>
          <a
            href="https://pems.dot.ca.gov"
            target="_blank"
            rel="noopener noreferrer"
            className="attribution-link"
          >
            PeMS
          </a>
        </div>
      </div>
    </div>
  );
};

export default DataAttribution;