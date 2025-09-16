import ApiService, {
  DatabaseIncident,
  ArchiveData,
  ArchiveStats,
  TodaysIncidentsData,
  IncidentStats,
} from './apiService';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

describe('ApiService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue('test-api-key');
    jest.resetModules();
    process.env = { ...originalEnv };
    process.env.REACT_APP_SERVER_URL = 'http://test-server.com/api';
    console.log = jest.fn();
    console.error = jest.fn();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Authentication Headers', () => {
    test('includes API key from localStorage in headers', async () => {
      mockLocalStorage.getItem.mockReturnValue('my-test-key');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      await ApiService.fetchIncidents();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/incidents'),
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': 'my-test-key',
          },
        }
      );
    });

    test('uses empty string when no API key in localStorage', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      await ApiService.fetchIncidents();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/incidents'),
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': '',
          },
        }
      );
    });
  });

  describe('Error Handling', () => {
    test('handles network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      console.error = jest.fn();

      const result = await ApiService.fetchIncidents();

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalledWith(
        'Error fetching incidents:',
        expect.any(Error)
      );
    });

    test('handles HTTP error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Not found' }),
      });
      console.error = jest.fn();

      const result = await ApiService.fetchIncidents();

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalled();
    });

    test('handles malformed JSON responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });
      console.error = jest.fn();

      const result = await ApiService.fetchIncidents();

      expect(result).toEqual([]);
    });
  });

  describe('fetchIncidents', () => {
    test('fetches incidents successfully', async () => {
      const mockIncidents: DatabaseIncident[] = [
        {
          Incident_ID: 1,
          Incident_Date: '2024-01-01',
          Incident_Location: 'Test Location',
          Incident_Severity: 'High',
          Incident_Status: 'Active',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockIncidents,
      });

      const result = await ApiService.fetchIncidents();

      expect(result).toEqual(mockIncidents);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/incidents'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-API-Key': 'test-api-key',
          }),
        })
      );
    });

    test('returns empty array on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Server error'));
      console.error = jest.fn();

      const result = await ApiService.fetchIncidents();

      expect(result).toEqual([]);
    });
  });

  describe('fetchTodaysIncidents', () => {
    test("fetches today's incidents successfully", async () => {
      const mockTodaysData: TodaysIncidentsData = {
        count: 5,
        date: '2024-01-01',
        incidents: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTodaysData,
      });

      const result = await ApiService.fetchTodaysIncidents();

      expect(result).toEqual(mockTodaysData);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/incidents/today'),
        expect.any(Object)
      );
    });

    test('returns null on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Server error'));
      console.error = jest.fn();

      const result = await ApiService.fetchTodaysIncidents();

      expect(result).toBe(null);
    });
  });

  describe('fetchIncidentStats', () => {
    test('fetches incident statistics successfully', async () => {
      const mockStats: IncidentStats = {
        total: 100,
        active: 25,
        today: 5,
        severityBreakdown: {
          High: 10,
          Medium: 15,
          Low: 75,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStats,
      });

      const result = await ApiService.fetchIncidentStats();

      expect(result).toEqual(mockStats);
    });
  });

  describe('Archive Methods', () => {
    test('fetchArchives with no filters', async () => {
      const mockArchives: ArchiveData[] = [
        {
          Archive_ID: 1,
          Archive_Date: '2024-01-01',
          Archive_Type: 'incident',
          Archive_IncidentID: 1,
          Archive_CameraID: 1,
          Archive_IncidentData: {},
          Archive_AlertsData: {},
          Archive_Severity: 'High',
          Archive_Status: 'Active',
          Archive_DateTime: '2024-01-01T12:00:00Z',
          Archive_SearchText: 'test search',
          Archive_Tags: ['tag1'],
          Archive_Metadata: {},
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockArchives,
      });

      const result = await ApiService.fetchArchives();

      expect(result).toEqual(mockArchives);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/archives'),
        expect.any(Object)
      );
    });

    test('fetchArchives with filters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      await ApiService.fetchArchives({
        type: 'incident',
        severity: 'High',
        limit: 10,
        offset: 0,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(
          '/archives?type=incident&severity=High&limit=10&offset=0'
        ),
        expect.any(Object)
      );
    });

    test('fetchArchiveStats', async () => {
      const mockStats: ArchiveStats[] = [
        {
          type: 'incident',
          severity: 'High',
          status: 'Active',
          count: 5,
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStats,
      });

      const result = await ApiService.fetchArchiveStats();

      expect(result).toEqual(mockStats);
    });
  });

  describe('Authentication Methods', () => {
    test('isAuthenticated returns true when API key exists', () => {
      mockLocalStorage.getItem.mockReturnValue('valid-key');

      const result = ApiService.isAuthenticated();

      expect(result).toBe(true);
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('apiKey');
    });

    test('isAuthenticated returns false when API key is empty', () => {
      mockLocalStorage.getItem.mockReturnValue('');

      const result = ApiService.isAuthenticated();

      expect(result).toBe(false);
    });

    test('isAuthenticated returns false when API key is null', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const result = ApiService.isAuthenticated();

      expect(result).toBe(false);
    });

    test('getCurrentUser returns parsed user data', () => {
      const mockUser = { id: 1, name: 'Test User' };
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockUser));

      const result = ApiService.getCurrentUser();

      expect(result).toEqual(mockUser);
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('user');
    });

    test('getCurrentUser returns null when no user data', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const result = ApiService.getCurrentUser();

      expect(result).toBe(null);
    });

    test('logout removes stored data', () => {
      ApiService.logout();

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('apiKey');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('user');
    });
  });

  describe('Login', () => {
    test('login successfully stores API key and user data', async () => {
      const mockResponse = {
        apiKey: 'new-api-key',
        user: { id: 1, email: 'test@example.com' },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await ApiService.login('test@example.com', 'password');

      expect(result).toEqual(mockResponse);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'apiKey',
        'new-api-key'
      );
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'user',
        JSON.stringify(mockResponse.user)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/login'),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            User_Email: 'test@example.com',
            User_Password: 'password',
          }),
        }
      );
    });

    test('login throws error on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Invalid credentials' }),
      });

      await expect(
        ApiService.login('test@example.com', 'wrong-password')
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('Health Check', () => {
    test('healthCheck returns true when server is healthy', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      const result = await ApiService.healthCheck();

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/health')
      );
    });

    test('healthCheck returns false on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      console.error = jest.fn();

      const result = await ApiService.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe('URL Configuration', () => {
    test('uses environment variable for API base URL', async () => {
      process.env.REACT_APP_SERVER_URL = 'https://custom-server.com/api';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      await ApiService.fetchIncidents();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/incidents'),
        expect.any(Object)
      );
    });

    test('uses default URL when environment variable not set', async () => {
      delete process.env.REACT_APP_SERVER_URL;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      await ApiService.fetchIncidents();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/incidents'),
        expect.any(Object)
      );
    });
  });
});
