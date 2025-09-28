import React from 'react';
import './JSONEventDisplay.css';

interface JSONEventDisplayProps {
  event: string;
  index: number;
}

interface IncidentEvent {
  description?: string;
  code?: string;
  iconCategory?: string;
}

interface IncidentProperties {
  iconCategory?: string;
  magnitudeOfDelay?: number;
  events?: IncidentEvent[];
}

interface IncidentGeometry {
  type?: string;
  coordinates?: number[];
}

interface Incident {
  properties?: IncidentProperties;
  geometry?: IncidentGeometry;
}

interface EventData {
  location?: string;
  incidents?: Incident[];
}

interface ParsedEvent {
  timestamp: string;
  data: EventData;
}

const JSONEventDisplay: React.FC<JSONEventDisplayProps> = ({ event, index }) => {
  const parseEvent = (eventText: string): ParsedEvent | null => {
    try {
      // Extract timestamp from [HH:MM:SS] format
      const timestampMatch = eventText.match(/^\[(\d{2}:\d{2}:\d{2})\]/);
      if (!timestampMatch) {
        return null;
      }

      const timestamp = timestampMatch[1];
      const jsonText = eventText.substring(timestampMatch[0].length).trim();

      // Try to parse as JSON
      const data = JSON.parse(jsonText);
      return { timestamp, data };
    } catch {
      return null;
    }
  };

  const formatLocation = (location: string | undefined) => {
    return location?.replace(/,/g, ', ') || 'Unknown Location';
  };

  const getSeverityClass = (magnitude: number) => {
    switch (magnitude) {
      case 1:
        return 'severity-low';
      case 2:
        return 'severity-medium';
      case 3:
        return 'severity-high';
      case 4:
      case 5:
        return 'severity-critical';
      default:
        return 'severity-unknown';
    }
  };

  const getSeverityText = (magnitude: number) => {
    switch (magnitude) {
      case 1:
        return 'Low';
      case 2:
        return 'Medium';
      case 3:
        return 'High';
      case 4:
      case 5:
        return 'Critical';
      default:
        return 'Unknown';
    }
  };

  const getIconCategoryClass = (category: string) => {
    switch (category.toLowerCase()) {
      case 'road works':
        return 'icon-road-works';
      case 'slow traffic':
        return 'icon-slow-traffic';
      case 'heavy traffic':
        return 'icon-heavy-traffic';
      case 'accident':
        return 'icon-accident';
      case 'closure':
        return 'icon-closure';
      default:
        return 'icon-default';
    }
  };

  const parsedEvent = parseEvent(event);

  // If it's not JSON or doesn't match expected format, show as simple text
  if (!parsedEvent || !parsedEvent.data || !parsedEvent.data.location) {
    return (
      <div className="event-item-simple" data-cy={`event-item-${index}`}>
        <div className="event-timestamp">{parsedEvent?.timestamp || ''}</div>
        <div className="event-text">{event.replace(/^\[\d{2}:\d{2}:\d{2}\]\s*/, '')}</div>
      </div>
    );
  }

  const { timestamp, data } = parsedEvent;

  return (
    <div className="event-item-formatted" data-cy={`event-item-${index}`}>
      <div className="event-header">
        <div className="event-timestamp">{timestamp}</div>
        <div className="event-location">
          <span className="location-label">Location:</span>
          {formatLocation(data.location)}
        </div>
      </div>

      <div className="incidents-summary">
        <div className="incidents-count">
          {data.incidents?.length || 0} incident{(data.incidents?.length || 0) !== 1 ? 's' : ''} reported
        </div>
      </div>

      <div className="incidents-list">
        {data.incidents?.map((incident: Incident, incidentIndex: number) => (
          <div key={`incident-${timestamp}-${incidentIndex}`} className="incident-card">
            <div className="incident-type">
              <span className={`incident-icon ${getIconCategoryClass(incident.properties?.iconCategory || '')}`}>
                •
              </span>
              <span className="incident-category">
                {incident.properties?.iconCategory || 'Unknown'}
              </span>
            </div>

            <div className="incident-severity">
              <span className={`severity-indicator ${getSeverityClass(incident.properties?.magnitudeOfDelay || 0)}`}>
                •
              </span>
              <span className="severity-text">
                {getSeverityText(incident.properties?.magnitudeOfDelay || 0)} Impact
              </span>
            </div>

            {incident.properties?.events?.[0]?.description && (
              <div className="incident-description">
                {incident.properties.events[0].description}
              </div>
            )}

            {incident.geometry?.coordinates && (
              <div className="incident-coordinates">
                Coordinates: {incident.geometry.coordinates[1]?.toFixed(4)}, {incident.geometry.coordinates[0]?.toFixed(4)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default JSONEventDisplay;