// src/components/IncidentCarousel.tsx
import React from 'react';
// import './IncidentCarousel.css';

const images = [
  '/images/incident1.jpg',
  '/images/incident2.jpg',
  '/images/incident3.jpg',
];

const IncidentCarousel: React.FC = () => {
  return (
    <div className="incident-carousel">
      {images.map((src, index) => (
        <div key={index} className="carousel-item">
          <img src={src} alt={`Incident ${index + 1}`} />
        </div>
      ))}
    </div>
  );
};

export default IncidentCarousel;