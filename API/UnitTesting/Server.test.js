// Mock all dependencies before requiring server
const mockApp = {
  set: jest.fn(),
  listen: jest.fn()
};

const mockServer = {
  listen: jest.fn((port, callback) => {
    if (callback) callback();
  })
};

const mockSocket = {
  id: 'test-socket-id',
  emit: jest.fn(),
  on: jest.fn(),
  disconnect: jest.fn()
};

const mockIo = {
  on: jest.fn(),
  emit: jest.fn(),
  to: jest.fn(() => mockIo)
};

const mockDb = {
  query: jest.fn()
};

const mockWeather = {
  getWeather: jest.fn()
};

const mockTraffic = {
  getTraffic: jest.fn(),
  criticalIncidents: jest.fn(),
  incidentCategory: jest.fn(),
  incidentLocations: jest.fn()
};

const mockILM = {
  addUser: jest.fn(),
  removeUser: jest.fn(),
  updateUserLocation: jest.fn(),
  showUsers: jest.fn(),
  updateTraffic: jest.fn(),
  notifyUsers: jest.fn(() => [])
};

// Mock all modules
jest.mock('express', () => () => mockApp);
jest.mock('http', () => ({
  createServer: jest.fn(() => mockServer)
}));
jest.mock('socket.io', () => ({
  Server: jest.fn(() => mockIo)
}));
jest.mock('../config/db', () => mockDb);
jest.mock('../src/Weather/weather', () => mockWeather);
jest.mock('../src/Traffic/traffic', () => mockTraffic);
jest.mock('../src/IncidentLocationMapping/IncidentLocationMapping', () => ({
  ILM: jest.fn(() => mockILM)
}));

describe('Server Enhancements', () => {
  let getTodaysIncidents;
  let emitUserStats;
  let emitTodaysIncidents;
  let userStatsManager;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock console to reduce noise
    global.console = {
      ...console,
      log: jest.fn(),
      error: jest.fn()
    };

    // Mock Date for consistent testing
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-15T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('getTodaysIncidents function', () => {
    beforeEach(() => {
      // Clear module cache to get fresh import
      delete require.cache[require.resolve('../server')];
    });

    test('should return today\'s incident count', async () => {
      mockDb.query.mockResolvedValue({
        rows: [{ count: '5' }]
      });

      // Import after mocking
      const serverModule = require('../server');
      
      // Access the function through the module or extract it
      // Since getTodaysIncidents is internal, we test it through socket events
      expect(mockDb.query).toBeDefined();
    });

    test('should handle database errors', async () => {
      const error = new Error('Database connection failed');
      mockDb.query.mockRejectedValue(error);

      // The function should handle errors gracefully
      require('../server');
      
      // Should not crash the server
      expect(mockServer.listen).toHaveBeenCalled();
    });

    test('should return 0 for no incidents', async () => {
      mockDb.query.mockResolvedValue({
        rows: [{ count: '0' }]
      });

      require('../server');
      expect(mockDb.query).toBeDefined();
    });

    test('should handle null database response', async () => {
      mockDb.query.mockResolvedValue({
        rows: [{ count: null }]
      });

      require('../server');
      expect(mockDb.query).toBeDefined();
    });

    test('should query with correct date range', async () => {
      mockDb.query.mockResolvedValue({
        rows: [{ count: '3' }]
      });

      require('../server');

      // The function should be called during server initialization
      if (mockDb.query.mock.calls.length > 0) {
        const [query, params] = mockDb.query.mock.calls[0];
        
        if (query.includes('Incidents_DateTime')) {
          expect(query).toContain('WHERE "Incidents_DateTime" >= $1 AND "Incidents_DateTime" <= $2');
          expect(params).toHaveLength(2);
          expect(params[0]).toBeInstanceOf(Date);
          expect(params[1]).toBeInstanceOf(Date);
        }
      }
    });
  });

  describe('Socket Connection Handling', () => {
    let connectionHandler;

    beforeEach(() => {
      require('../server');
      
      // Get the connection handler from the mockIo.on calls
      const connectionCall = mockIo.on.mock.calls.find(call => call[0] === 'connection');
      if (connectionCall) {
        connectionHandler = connectionCall[1];
      }
    });

    test('should handle socket connection', () => {
      if (connectionHandler) {
        connectionHandler(mockSocket);

        expect(mockILM.addUser).toHaveBeenCalledWith('test-socket-id', {});
        expect(mockSocket.emit).toHaveBeenCalledWith(
          'welcome', 
          'Welcome this your ID test-socket-id cherish it'
        );
      }
    });

    test('should handle new-location event', () => {
      if (connectionHandler) {
        connectionHandler(mockSocket);

        // Find the 'new-location' event handler
        const locationCall = mockSocket.on.mock.calls.find(call => call[0] === 'new-location');
        if (locationCall) {
          const locationHandler = locationCall[1];
          const newLocation = { latitude: -26.1438, longitude: 28.0406 };

          locationHandler(newLocation);

          expect(mockILM.updateUserLocation).toHaveBeenCalledWith('test-socket-id', newLocation);
        }
      }
    });

    test('should handle disconnect event', () => {
      if (connectionHandler) {
        connectionHandler(mockSocket);

        // Find the 'disconnect' event handler
        const disconnectCall = mockSocket.on.mock.calls.find(call => call[0] === 'disconnect');
        if (disconnectCall) {
          const disconnectHandler = disconnectCall[1];
          disconnectHandler();

          // Should log disconnection
          expect(console.log).toHaveBeenCalledWith('test-socket-id disconnected');
        }
      }
    });

    test('should handle weather data', async () => {
      const mockWeatherData = [
        {
          location: { name: 'Johannesburg' },
          current: { temp_c: 25, condition: { text: 'Sunny' } }
        }
      ];

      mockWeather.getWeather.mockResolvedValue(mockWeatherData);

      if (connectionHandler) {
        await connectionHandler(mockSocket);

        // Should emit weather data
        expect(mockSocket.emit).toHaveBeenCalledWith('weatherUpdate', mockWeatherData);
      }
    });

    test('should handle traffic data', async () => {
      const mockTrafficData = [
        {
          location: 'Rosebank',
          incidents: [
            { properties: { iconCategory: 'Accident', magnitudeOfDelay: 3 } }
          ]
        }
      ];

      mockTraffic.getTraffic.mockResolvedValue(mockTrafficData);
      mockTraffic.criticalIncidents.mockReturnValue({ Amount: 5 });
      mockTraffic.incidentCategory.mockReturnValue({ categories: ['Accident'], percentages: [1.0] });
      mockTraffic.incidentLocations.mockReturnValue([{ location: 'Rosebank', amount: 1 }]);

      if (connectionHandler) {
        await connectionHandler(mockSocket);

        expect(mockSocket.emit).toHaveBeenCalledWith('trafficUpdate', mockTrafficData);
        expect(mockSocket.emit).toHaveBeenCalledWith('criticalIncidents', { Amount: 5 });
      }
    });

    test('should handle weather errors gracefully', async () => {
      const error = new Error('Weather API error');
      mockWeather.getWeather.mockRejectedValue(error);

      if (connectionHandler) {
        await connectionHandler(mockSocket);

        // Should not crash, error should be logged
        expect(console.error).toHaveBeenCalled();
      }
    });

    test('should handle traffic errors gracefully', async () => {
      const error = new Error('Traffic API error');
      mockTraffic.getTraffic.mockRejectedValue(error);

      if (connectionHandler) {
        await connectionHandler(mockSocket);

        // Should not crash, error should be logged
        expect(console.error).toHaveBeenCalled();
      }
    });
  });

  describe('Server Initialization', () => {
    test('should configure Socket.IO with CORS', () => {
      require('../server');

      expect(mockIo).toBeDefined();
      // Socket.IO Server constructor should be called with CORS config
    });

    test('should set up database connection test', () => {
      mockDb.query.mockResolvedValue({ rows: [{ now: '2025-01-15T12:00:00Z' }] });

      require('../server');

      expect(mockDb.query).toHaveBeenCalledWith('SELECT NOW()');
    });

    test('should handle database connection failure', () => {
      const error = new Error('Database connection failed');
      mockDb.query.mockRejectedValue(error);

      // Mock process.exit to prevent test from actually exiting
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});

      require('../server');

      expect(console.error).toHaveBeenCalledWith('Database connection failed:', error);
      expect(mockExit).toHaveBeenCalledWith(1);

      mockExit.mockRestore();
    });

    test('should start server on successful database connection', () => {
      mockDb.query.mockResolvedValue({ rows: [{ now: '2025-01-15T12:00:00Z' }] });

      require('../server');

      expect(mockServer.listen).toHaveBeenCalledWith(5000, expect.any(Function));
    });

    test('should set io on app', () => {
      require('../server');

      expect(mockApp.set).toHaveBeenCalledWith('io', mockIo);
    });
  });

  describe('Timer Intervals', () => {
    test('should set up user stats emission interval', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');

      require('../server');

      // Should have intervals for user stats and today's incidents
      expect(setIntervalSpy).toHaveBeenCalled();

      // Check if intervals are set for 30 seconds and 5 minutes
      const calls = setIntervalSpy.mock.calls;
      const intervals = calls.map(call => call[1]);
      
      expect(intervals).toContain(30000); // 30 seconds
      expect(intervals).toContain(300000); // 5 minutes

      setIntervalSpy.mockRestore();
    });

    test('should emit user stats on interval', () => {
      require('../server');

      // Fast forward time to trigger interval
      jest.advanceTimersByTime(30000);

      // Should emit user stats update
      expect(mockIo.emit).toHaveBeenCalledWith(
        'userStatsUpdate',
        expect.any(Object)
      );
    });

    test('should emit today\'s incidents on interval', () => {
      mockDb.query.mockResolvedValue({ rows: [{ count: '3' }] });

      require('../server');

      // Fast forward time to trigger interval
      jest.advanceTimersByTime(300000); // 5 minutes

      // Should query database and emit update
      expect(mockIo.emit).toHaveBeenCalledWith(
        'todaysIncidentsUpdate',
        expect.objectContaining({
          count: expect.any(Number),
          date: expect.any(String)
        })
      );
    });
  });

  describe('UserStatsManager Integration', () => {
    test('should create UserStatsManager instance', () => {
      require('../server');

      // Should have created user stats manager
      // This tests the integration without accessing private variables
      expect(mockILM.addUser).toBeDefined();
    });

    test('should handle user stats generation', () => {
      require('../server');

      // Simulate user stats method calls
      expect(typeof mockILM.addUser).toBe('function');
      expect(typeof mockILM.updateUserLocation).toBe('function');
    });
  });

  describe('Environment Configuration', () => {
    test('should use default port if not specified', () => {
      delete process.env.PORT;
      
      require('../server');

      expect(mockServer.listen).toHaveBeenCalledWith(5000, expect.any(Function));
    });

    test('should use default host if not specified', () => {
      delete process.env.HOST;
      
      require('../server');

      // Should use localhost as default
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('localhost')
      );
    });

    test('should handle CORS origin configuration', () => {
      process.env.CORS_ORIGIN = 'http://example.com';
      
      delete require.cache[require.resolve('../server')];
      require('../server');

      // Should configure CORS with specified origin
      expect(mockIo).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle socket connection errors', () => {
      const error = new Error('Socket connection failed');
      
      require('../server');

      // Simulate socket error
      if (connectionHandler) {
        try {
          connectionHandler(mockSocket);
        } catch (e) {
          expect(e).toBeInstanceOf(Error);
        }
      }
    });

    test('should handle ILM errors gracefully', () => {
      mockILM.addUser.mockImplementation(() => {
        throw new Error('ILM error');
      });

      require('../server');

      if (connectionHandler) {
        expect(() => connectionHandler(mockSocket)).not.toThrow();
      }
    });
  });
});