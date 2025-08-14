const incidentController = require('../controllers/incidentController');

// Mock database
const mockDb = {
  query: jest.fn()
};

jest.mock('../config/db', () => mockDb);

describe('IncidentController - New Methods', () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      query: {},
      user: { id: 'test-user-id' }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    jest.clearAllMocks();
  });

  describe('getTodaysIncidents', () => {
    test('should return today\'s incidents successfully', async () => {
      const mockIncidents = [
        {
          Incidents_ID: 1,
          Incidents_DateTime: new Date(),
          Incidents_Longitude: 28.0406,
          Incidents_Latitude: -26.1438,
          Incident_Severity: 'medium',
          Incident_Status: 'ongoing'
        },
        {
          Incidents_ID: 2,
          Incidents_DateTime: new Date(),
          Incidents_Longitude: 28.0847,
          Incidents_Latitude: -26.0911,
          Incident_Severity: 'high',
          Incident_Status: 'resolved'
        }
      ];

      mockDb.query.mockResolvedValue({ rows: mockIncidents });

      await incidentController.getTodaysIncidents(req, res);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM "Incidents"'),
        expect.arrayContaining([expect.any(Date), expect.any(Date)])
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        count: 2,
        date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        incidents: mockIncidents
      });
    });

    test('should handle empty incidents for today', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });

      await incidentController.getTodaysIncidents(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        count: 0,
        date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        incidents: []
      });
    });

    test('should handle database error', async () => {
      const error = new Error('Database connection failed');
      mockDb.query.mockRejectedValue(error);

      await incidentController.getTodaysIncidents(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Internal server error'
      });
    });

    test('should query with correct date range', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });

      await incidentController.getTodaysIncidents(req, res);

      const call = mockDb.query.mock.calls[0];
      const [query, params] = call;
      
      expect(query).toContain('WHERE "Incidents_DateTime" >= $1 AND "Incidents_DateTime" <= $2');
      expect(params).toHaveLength(2);
      expect(params[0]).toBeInstanceOf(Date);
      expect(params[1]).toBeInstanceOf(Date);
      
      // Check that end date is later than start date
      expect(params[1].getTime()).toBeGreaterThan(params[0].getTime());
    });
  });

  describe('getIncidentStats', () => {
    test('should return complete incident statistics', async () => {
      // Mock total incidents query
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ total: '15' }] })
        .mockResolvedValueOnce({ rows: [{ active: '3' }] })
        .mockResolvedValueOnce({ rows: [{ today: '2' }] })
        .mockResolvedValueOnce({
          rows: [
            { Incident_Severity: 'low', count: '8' },
            { Incident_Severity: 'medium', count: '5' },
            { Incident_Severity: 'high', count: '2' }
          ]
        });

      await incidentController.getIncidentStats(req, res);

      expect(mockDb.query).toHaveBeenCalledTimes(4);
      
      // Check total incidents query
      expect(mockDb.query).toHaveBeenNthCalledWith(1,
        'SELECT COUNT(*) as total FROM "Incidents"'
      );
      
      // Check active incidents query
      expect(mockDb.query).toHaveBeenNthCalledWith(2,
        'SELECT COUNT(*) as active FROM "Incidents" WHERE "Incident_Status" = $1',
        ['ongoing']
      );
      
      // Check today's incidents query
      expect(mockDb.query).toHaveBeenNthCalledWith(3,
        expect.stringContaining('SELECT COUNT(*) as today'),
        expect.arrayContaining([expect.any(Date), expect.any(Date)])
      );
      
      // Check severity breakdown query
      expect(mockDb.query).toHaveBeenNthCalledWith(4,
        expect.stringContaining('GROUP BY "Incident_Severity"')
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        total: 15,
        active: 3,
        today: 2,
        severityBreakdown: {
          low: 8,
          medium: 5,
          high: 2
        }
      });
    });

    test('should handle zero values in statistics', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ total: '0' }] })
        .mockResolvedValueOnce({ rows: [{ active: '0' }] })
        .mockResolvedValueOnce({ rows: [{ today: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      await incidentController.getIncidentStats(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        total: 0,
        active: 0,
        today: 0,
        severityBreakdown: {}
      });
    });

    test('should handle null/undefined values in database response', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ total: null }] })
        .mockResolvedValueOnce({ rows: [{ active: undefined }] })
        .mockResolvedValueOnce({ rows: [{ today: '' }] })
        .mockResolvedValueOnce({ rows: [] });

      await incidentController.getIncidentStats(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        total: 0,
        active: 0,
        today: 0,
        severityBreakdown: {}
      });
    });

    test('should handle database error in total query', async () => {
      const error = new Error('Database error');
      mockDb.query.mockRejectedValue(error);

      await incidentController.getIncidentStats(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Internal server error'
      });
    });

    test('should handle database error in active query', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ total: '15' }] })
        .mockRejectedValue(new Error('Active query failed'));

      await incidentController.getIncidentStats(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Internal server error'
      });
    });

    test('should handle database error in today query', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ total: '15' }] })
        .mockResolvedValueOnce({ rows: [{ active: '3' }] })
        .mockRejectedValue(new Error('Today query failed'));

      await incidentController.getIncidentStats(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Internal server error'
      });
    });

    test('should handle database error in severity query', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ total: '15' }] })
        .mockResolvedValueOnce({ rows: [{ active: '3' }] })
        .mockResolvedValueOnce({ rows: [{ today: '2' }] })
        .mockRejectedValue(new Error('Severity query failed'));

      await incidentController.getIncidentStats(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Internal server error'
      });
    });

    test('should handle complex severity breakdown', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ total: '100' }] })
        .mockResolvedValueOnce({ rows: [{ active: '25' }] })
        .mockResolvedValueOnce({ rows: [{ today: '10' }] })
        .mockResolvedValueOnce({
          rows: [
            { Incident_Severity: 'critical', count: '5' },
            { Incident_Severity: 'high', count: '15' },
            { Incident_Severity: 'medium', count: '45' },
            { Incident_Severity: 'low', count: '30' },
            { Incident_Severity: 'info', count: '5' }
          ]
        });

      await incidentController.getIncidentStats(req, res);

      expect(res.json).toHaveBeenCalledWith({
        total: 100,
        active: 25,
        today: 10,
        severityBreakdown: {
          critical: 5,
          high: 15,
          medium: 45,
          low: 30,
          info: 5
        }
      });
    });
  });

  // Test existing methods to ensure they still work (regression testing)
  describe('Existing Methods - Regression Tests', () => {
    test('createIncident should still work', async () => {
      req.body = {
        Incident_Date: '2025-01-01',
        Incident_Location: 'Test Location',
        Incident_Status: 'ongoing'
      };

      req.app = {
        get: jest.fn().mockReturnValue({
          emit: jest.fn()
        })
      };

      const mockIncidentModel = {
        createIncident: jest.fn().mockResolvedValue({
          Incidents_ID: 1,
          ...req.body
        })
      };

      // Mock the incident model
      jest.doMock('../models/incident', () => mockIncidentModel);

      // Re-require to get mocked version
      const { createIncident } = require('../controllers/incidentController');

      await createIncident(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    test('getIncidents should still work', async () => {
      req.query = {
        limit: '10',
        offset: '0'
      };

      const mockIncidentModel = {
        getIncidents: jest.fn().mockResolvedValue([])
      };

      jest.doMock('../models/incident', () => mockIncidentModel);

      const { getIncidents } = require('../controllers/incidentController');

      await getIncidents(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});