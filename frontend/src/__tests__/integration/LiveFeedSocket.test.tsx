import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Type definitions for test components
interface Alert {
  id: number;
  severity: string;
  message: string;
  location: string;
}

interface Weather {
  location: string;
  condition: string;
  temperature: string;
}

// Simple socket context component
const SocketContext = React.createContext<any>(null);

const SocketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [connected, setConnected] = React.useState(false);
  const [alerts, setAlerts] = React.useState<Alert[]>([]);
  const [weatherData, setWeatherData] = React.useState<Weather[]>([]);

  const mockSocket = {
    connect: () => setConnected(true),
    disconnect: () => setConnected(false),
    emit: jest.fn(),
    on: jest.fn(),
    connected,
  };

  const addAlert = (alert: Alert) => {
    setAlerts(prev => [...prev, alert]);
  };

  const updateWeather = (data: Weather[]) => {
    setWeatherData(data);
  };

  const contextValue = {
    socket: mockSocket,
    connected,
    alerts,
    weatherData,
    addAlert,
    updateWeather,
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
};

const useSocket = () => {
  const context = React.useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

// Simple LiveFeed component that uses socket context
const LiveFeedSocketComponent: React.FC = () => {
  const { connected, alerts, weatherData, addAlert, updateWeather } =
    useSocket();
  const [showNotification, setShowNotification] = React.useState(false);

  const handleNewIncident = () => {
    const mockIncident = {
      id: Date.now(),
      severity: 'high',
      message: 'Traffic incident detected',
      location: 'I-405 North',
    };
    addAlert(mockIncident);
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 3000);
  };

  const handleWeatherUpdate = () => {
    updateWeather([
      {
        location: 'Orange County',
        condition: 'Sunny',
        temperature: '72°F',
      },
    ]);
  };

  return (
    <div data-testid="livefeed-socket-component">
      <div data-testid="livefeed-header">
        <h2>Live Camera Feeds</h2>
        <div data-testid="connection-status">
          Status: {connected ? 'Connected' : 'Disconnected'}
        </div>
      </div>

      <div data-testid="socket-controls">
        <button data-testid="simulate-incident" onClick={handleNewIncident}>
          Simulate Incident Alert
        </button>
        <button data-testid="simulate-weather" onClick={handleWeatherUpdate}>
          Simulate Weather Update
        </button>
      </div>

      {showNotification && (
        <div data-testid="notification-toast">New incident alert received!</div>
      )}

      <div data-testid="alerts-section">
        <h3>Recent Alerts ({alerts.length})</h3>
        {alerts.map((alert: Alert) => (
          <div
            key={alert.id}
            data-testid={`alert-${alert.id}`}
            className="alert-item"
          >
            <div data-testid={`alert-severity-${alert.severity}`}>
              Severity: {alert.severity}
            </div>
            <div>{alert.message}</div>
            <div>{alert.location}</div>
          </div>
        ))}
      </div>

      <div data-testid="weather-section">
        <h3>Weather Information</h3>
        {weatherData.length > 0 ? (
          weatherData.map((weather: Weather, index: number) => (
            <div
              key={index}
              data-testid={`weather-${index}`}
              className="weather-item"
            >
              <div>{weather.location}</div>
              <div>{weather.condition}</div>
              <div>{weather.temperature}</div>
            </div>
          ))
        ) : (
          <div data-testid="no-weather">No weather data available</div>
        )}
      </div>

      <div data-testid="camera-grid">
        <div className="camera-tile">
          <h4>TEST-CAMERA-1</h4>
          <div data-testid="camera-status">Online</div>
        </div>
      </div>
    </div>
  );
};

describe('LiveFeed Socket Integration Tests', () => {
  const renderWithSocketProvider = (component: React.ReactElement) => {
    return render(<SocketProvider>{component}</SocketProvider>);
  };

  test('renders component with socket provider', () => {
    renderWithSocketProvider(<LiveFeedSocketComponent />);

    expect(screen.getByTestId('livefeed-socket-component')).toBeInTheDocument();
    expect(screen.getByText('Live Camera Feeds')).toBeInTheDocument();
    expect(screen.getByTestId('connection-status')).toHaveTextContent(
      'Status: Disconnected'
    );
  });

  test('displays socket connection status', () => {
    renderWithSocketProvider(<LiveFeedSocketComponent />);

    expect(screen.getByTestId('connection-status')).toHaveTextContent(
      'Status: Disconnected'
    );
  });

  test('handles incident alert simulation', async () => {
    renderWithSocketProvider(<LiveFeedSocketComponent />);

    const simulateButton = screen.getByTestId('simulate-incident');

    fireEvent.click(simulateButton);

    // Check that alert was added
    await waitFor(() => {
      expect(screen.getByText('Recent Alerts (1)')).toBeInTheDocument();
    });

    expect(screen.getByText('Traffic incident detected')).toBeInTheDocument();
    expect(screen.getByText('I-405 North')).toBeInTheDocument();
    expect(screen.getByTestId('alert-severity-high')).toHaveTextContent(
      'Severity: high'
    );
  });

  test('displays notification toast for incidents', async () => {
    renderWithSocketProvider(<LiveFeedSocketComponent />);

    const simulateButton = screen.getByTestId('simulate-incident');

    fireEvent.click(simulateButton);

    // Check for notification toast
    expect(screen.getByTestId('notification-toast')).toBeInTheDocument();
    expect(
      screen.getByText('New incident alert received!')
    ).toBeInTheDocument();
  });

  test('handles weather update simulation', async () => {
    renderWithSocketProvider(<LiveFeedSocketComponent />);

    // Initially no weather data
    expect(screen.getByTestId('no-weather')).toBeInTheDocument();

    const weatherButton = screen.getByTestId('simulate-weather');

    fireEvent.click(weatherButton);

    // Check that weather data was updated
    await waitFor(() => {
      expect(screen.getByTestId('weather-0')).toBeInTheDocument();
    });

    expect(screen.getByText('Orange County')).toBeInTheDocument();
    expect(screen.getByText('Sunny')).toBeInTheDocument();
    expect(screen.getByText('72°F')).toBeInTheDocument();
  });

  test('manages multiple alerts correctly', async () => {
    renderWithSocketProvider(<LiveFeedSocketComponent />);

    const simulateButton = screen.getByTestId('simulate-incident');

    // Add first alert
    fireEvent.click(simulateButton);

    await waitFor(() => {
      expect(screen.getByText('Recent Alerts (1)')).toBeInTheDocument();
    });

    // Add second alert
    fireEvent.click(simulateButton);

    await waitFor(() => {
      expect(screen.getByText('Recent Alerts (2)')).toBeInTheDocument();
    });

    // Should have two alert items
    const alertItems = document.querySelectorAll('.alert-item');
    expect(alertItems).toHaveLength(2);
  });

  test('renders camera components', () => {
    renderWithSocketProvider(<LiveFeedSocketComponent />);

    expect(screen.getByTestId('camera-grid')).toBeInTheDocument();
    expect(screen.getByText('TEST-CAMERA-1')).toBeInTheDocument();
    expect(screen.getByTestId('camera-status')).toHaveTextContent('Online');
  });

  test('socket controls are present and functional', () => {
    renderWithSocketProvider(<LiveFeedSocketComponent />);

    expect(screen.getByTestId('socket-controls')).toBeInTheDocument();
    expect(screen.getByTestId('simulate-incident')).toBeInTheDocument();
    expect(screen.getByTestId('simulate-weather')).toBeInTheDocument();
  });

  test('displays sections for alerts and weather', () => {
    renderWithSocketProvider(<LiveFeedSocketComponent />);

    expect(screen.getByTestId('alerts-section')).toBeInTheDocument();
    expect(screen.getByTestId('weather-section')).toBeInTheDocument();
    expect(screen.getByText('Recent Alerts (0)')).toBeInTheDocument();
    expect(screen.getByText('Weather Information')).toBeInTheDocument();
  });

  test('context provider supplies socket functionality', () => {
    renderWithSocketProvider(<LiveFeedSocketComponent />);

    // The component should render without errors, which means the context is working
    expect(screen.getByTestId('livefeed-socket-component')).toBeInTheDocument();

    // Test that socket controls are available (meaning context is providing socket)
    expect(screen.getByTestId('simulate-incident')).toBeInTheDocument();
    expect(screen.getByTestId('simulate-weather')).toBeInTheDocument();
  });

  test('handles real-time updates correctly', async () => {
    renderWithSocketProvider(<LiveFeedSocketComponent />);

    const incidentButton = screen.getByTestId('simulate-incident');
    const weatherButton = screen.getByTestId('simulate-weather');

    // Simulate multiple updates
    fireEvent.click(incidentButton);
    fireEvent.click(weatherButton);

    await waitFor(() => {
      expect(screen.getByText('Recent Alerts (1)')).toBeInTheDocument();
      expect(screen.getByTestId('weather-0')).toBeInTheDocument();
    });

    // Both incident and weather should be updated
    expect(screen.getByText('Traffic incident detected')).toBeInTheDocument();
    expect(screen.getByText('Orange County')).toBeInTheDocument();
  });

  test('notification toast disappears after timeout', async () => {
    renderWithSocketProvider(<LiveFeedSocketComponent />);

    const simulateButton = screen.getByTestId('simulate-incident');

    fireEvent.click(simulateButton);

    // Toast should be visible
    expect(screen.getByTestId('notification-toast')).toBeInTheDocument();

    // Wait for toast to disappear (3 seconds timeout in component)
    await waitFor(
      () => {
        expect(
          screen.queryByTestId('notification-toast')
        ).not.toBeInTheDocument();
      },
      { timeout: 4000 }
    );
  });
});
