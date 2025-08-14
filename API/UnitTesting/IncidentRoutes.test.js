const request = require('supertest');
const express = require('express');

// Mock the auth middleware
const mockAuthMiddleware = {
  authenticate: (req, res, next) => {
    req.user = { User_ID: 'test-user-id', User_Email: 'test@example.com' };
    next();
  }
};

// Mock the incident controller
const mockIncidentController = {
  createIncident: jest.fn(),
  getIncidents: jest.fn(),
  getTodaysIncidents: jest.fn(),
  getIncidentStats: jest.fn(),
  getIncident: jest.fn(),
  updateIncident: jest.fn()
};

// Mock the alert controller
const mockAlertController = {
  getAlertsByIncident: jest.fn()
};

jest.mock('../middleware/auth', () => mockAuthMiddleware);
jest.mock('../controllers/incidentController', () => mockIncidentController);
jest.mock('../controllers/alertController', () => mockAlertController);

describe('Incident Routes - New Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Import the routes after mocking
    const incidentRoutes = require('../routes/incidents');
    app.use('/api/incidents', incidentRoutes);
    
    jest.clearAllMocks();
  });

  describe('GET /api/incidents/today', () => {
    test('should call getTodaysIncidents controller', async () => {
      const mockResponse = {
        count: 5,
        date: '2025-01-15',
        incidents: []
      };

      mockIncidentController.getTodaysIncidents.mockImplementation((req, res) => {
        res.status(200).json(mockResponse);
      });

      const response = await request(app)
        .get('/api/incidents/today')
        .expect(200);

      expect(mockIncidentController.getTodaysIncidents).toHaveBeenCalledTimes(1);
      expect(response.body).toEqual(mockResponse);
    });

    test('should require authentication', async () => {
      // Temporarily replace auth middleware to test authentication requirement
      jest.doMock('../middleware/auth', () => ({
        authenticate: (req, res, next) => {
          res.status(401).json({ error: 'Unauthorized' });
        }
      }));

      // Re-create app with new middleware
      const newApp = express();
      newApp.use(express.json());
      
      // Clear module cache and re-require
      delete require.cache[require.resolve('../routes/incidents')];
      const incidentRoutes = require('../routes/incidents');
      newApp.use('/api/incidents', incidentRoutes);

      await request(newApp)
        .get('/api/incidents/today')
        .expect(401);
    });

    test('should handle controller errors', async () => {
      mockIncidentController.getTodaysIncidents.mockImplementation((req, res) => {
        res.status(500).json({ error: 'Internal server error' });
      });

      const response = await request(app)
        .get('/api/incidents/today')
        .expect(500);

      expect(response.body).toEqual({ error: 'Internal server error' });
    });

    test('should pass request and response to controller', async () => {
      mockIncidentController.getTodaysIncidents.mockImplementation((req, res) => {
        expect(req.user).toBeDefined();
        expect(req.user.User_ID).toBe('test-user-id');
        res.status(200).json({ success: true });
      });

      await request(app)
        .get('/api/incidents/today')
        .expect(200);

      expect(mockIncidentController.getTodaysIncidents).toHaveBeenCalledWith(
        expect.objectContaining({
          user: expect.objectContaining({
            User_ID: 'test-user-id'
          })
        }),
        expect.any(Object)
      );
    });
  });

  describe('GET /api/incidents/stats', () => {
    test('should call getIncidentStats controller', async () => {
      const mockStatsResponse = {
        total: 100,
        active: 15,
        today: 5,
        severityBreakdown: {
          low: 60,
          medium: 30,
          high: 10
        }
      };

      mockIncidentController.getIncidentStats.mockImplementation((req, res) => {
        res.status(200).json(mockStatsResponse);
      });

      const response = await request(app)
        .get('/api/incidents/stats')
        .expect(200);

      expect(mockIncidentController.getIncidentStats).toHaveBeenCalledTimes(1);
      expect(response.body).toEqual(mockStatsResponse);
    });

    test('should require authentication', async () => {
      // Test with mock that returns unauthorized
      jest.doMock('../middleware/auth', () => ({
        authenticate: (req, res, next) => {
          res.status(401).json({ error: 'API key required' });
        }
      }));

      const newApp = express();
      newApp.use(express.json());
      
      delete require.cache[require.resolve('../routes/incidents')];
      const incidentRoutes = require('../routes/incidents');
      newApp.use('/api/incidents', incidentRoutes);

      await request(newApp)
        .get('/api/incidents/stats')
        .expect(401);
    });

    test('should handle controller errors', async () => {
      mockIncidentController.getIncidentStats.mockImplementation((req, res) => {
        res.status(500).json({ error: 'Database error' });
      });

      const response = await request(app)
        .get('/api/incidents/stats')
        .expect(500);

      expect(response.body).toEqual({ error: 'Database error' });
    });

    test('should pass authenticated user to controller', async () => {
      mockIncidentController.getIncidentStats.mockImplementation((req, res) => {
        expect(req.user).toBeDefined();
        expect(req.user.User_Email).toBe('test@example.com');
        res.status(200).json({ success: true });
      });

      await request(app)
        .get('/api/incidents/stats')
        .expect(200);
    });
  });

  describe('Route Order and Specificity', () => {
    test('should handle /today route before /:id route', async () => {
      // Mock both controllers
      mockIncidentController.getTodaysIncidents.mockImplementation((req, res) => {
        res.status(200).json({ route: 'today' });
      });

      mockIncidentController.getIncident.mockImplementation((req, res) => {
        res.status(200).json({ route: 'by-id', id: req.params.id });
      });

      // Test /today route
      const todayResponse = await request(app)
        .get('/api/incidents/today')
        .expect(200);

      expect(todayResponse.body.route).toBe('today');
      expect(mockIncidentController.getTodaysIncidents).toHaveBeenCalled();
      expect(mockIncidentController.getIncident).not.toHaveBeenCalled();

      jest.clearAllMocks();

      // Test /:id route
      const idResponse = await request(app)
        .get('/api/incidents/123')
        .expect(200);

      expect(idResponse.body.route).toBe('by-id');
      expect(idResponse.body.id).toBe('123');
      expect(mockIncidentController.getIncident).toHaveBeenCalled();
      expect(mockIncidentController.getTodaysIncidents).not.toHaveBeenCalled();
    });

    test('should handle /stats route before /:id route', async () => {
      mockIncidentController.getIncidentStats.mockImplementation((req, res) => {
        res.status(200).json({ route: 'stats' });
      });

      mockIncidentController.getIncident.mockImplementation((req, res) => {
        res.status(200).json({ route: 'by-id', id: req.params.id });
      });

      // Test /stats route
      const statsResponse = await request(app)
        .get('/api/incidents/stats')
        .expect(200);

      expect(statsResponse.body.route).toBe('stats');
      expect(mockIncidentController.getIncidentStats).toHaveBeenCalled();
      expect(mockIncidentController.getIncident).not.toHaveBeenCalled();
    });
  });

  describe('Existing Routes - Regression Tests', () => {
    test('should still handle POST /', async () => {
      mockIncidentController.createIncident.mockImplementation((req, res) => {
        res.status(201).json({ success: true });
      });

      await request(app)
        .post('/api/incidents')
        .send({
          Incident_Date: '2025-01-15',
          Incident_Location: 'Test Location',
          Incident_Status: 'ongoing'
        })
        .expect(201);

      expect(mockIncidentController.createIncident).toHaveBeenCalledTimes(1);
    });

    test('should still handle GET /', async () => {
      mockIncidentController.getIncidents.mockImplementation((req, res) => {
        res.status(200).json([]);
      });

      await request(app)
        .get('/api/incidents')
        .expect(200);

      expect(mockIncidentController.getIncidents).toHaveBeenCalledTimes(1);
    });

    test('should still handle GET /:id', async () => {
      mockIncidentController.getIncident.mockImplementation((req, res) => {
        res.status(200).json({ id: req.params.id });
      });

      await request(app)
        .get('/api/incidents/123')
        .expect(200);

      expect(mockIncidentController.getIncident).toHaveBeenCalledWith(
        expect.objectContaining({
          params: { id: '123' }
        }),
        expect.any(Object)
      );
    });

    test('should still handle PUT /:id', async () => {
      mockIncidentController.updateIncident.mockImplementation((req, res) => {
        res.status(200).json({ success: true });
      });

      await request(app)
        .put('/api/incidents/123')
        .send({ Incident_Status: 'resolved' })
        .expect(200);

      expect(mockIncidentController.updateIncident).toHaveBeenCalledTimes(1);
    });

    test('should still handle GET /:id/alerts', async () => {
      mockAlertController.getAlertsByIncident.mockImplementation((req, res) => {
        res.status(200).json([]);
      });

      await request(app)
        .get('/api/incidents/123/alerts')
        .expect(200);

      expect(mockAlertController.getAlertsByIncident).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    test('should handle middleware errors', async () => {
      jest.doMock('../middleware/auth', () => ({
        authenticate: (req, res, next) => {
          const error = new Error('Auth middleware error');
          next(error);
        }
      }));

      const errorApp = express();
      errorApp.use(express.json());
      
      // Add error handling middleware
      errorApp.use((err, req, res, next) => {
        res.status(500).json({ error: err.message });
      });

      delete require.cache[require.resolve('../routes/incidents')];
      const incidentRoutes = require('../routes/incidents');
      errorApp.use('/api/incidents', incidentRoutes);

      await request(errorApp)
        .get('/api/incidents/today')
        .expect(500);
    });

    test('should handle invalid JSON in request body', async () => {
      mockIncidentController.createIncident.mockImplementation((req, res) => {
        res.status(201).json({ success: true });
      });

      await request(app)
        .post('/api/incidents')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);
    });
  });

  describe('Route Parameters and Query Strings', () => {
    test('should pass query parameters to getIncidents', async () => {
      mockIncidentController.getIncidents.mockImplementation((req, res) => {
        expect(req.query.limit).toBe('10');
        expect(req.query.offset).toBe('20');
        expect(req.query.status).toBe('active');
        res.status(200).json([]);
      });

      await request(app)
        .get('/api/incidents?limit=10&offset=20&status=active')
        .expect(200);
    });

    test('should pass path parameters to getIncident', async () => {
      mockIncidentController.getIncident.mockImplementation((req, res) => {
        expect(req.params.id).toBe('abc123');
        res.status(200).json({ id: req.params.id });
      });

      await request(app)
        .get('/api/incidents/abc123')
        .expect(200);
    });
  });
});