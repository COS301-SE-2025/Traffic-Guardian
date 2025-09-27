// Test utilities for Cypress component testing

export interface MockUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  districts?: number[];
  permissions: string[];
}

export interface MockUserContextValue {
  user: MockUser | null;
  isAuthenticated: boolean;
  userRole: string;
  login: () => void;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  updateUser: () => void;
  loading: boolean;
}

// Common mock users for testing
export const mockUsers = {
  public: {
    user: null,
    isAuthenticated: false,
    userRole: 'public',
    permissions: [],
    districts: []
  },
  trafficController: {
    user: {
      id: '1',
      email: 'controller@example.com',
      firstName: 'Traffic',
      lastName: 'Controller',
      role: 'traffic_controller',
      districts: [4],
      permissions: ['VIEW_PEMS_DATA']
    },
    isAuthenticated: true,
    userRole: 'traffic_controller',
    permissions: ['VIEW_PEMS_DATA'],
    districts: [4]
  },
  admin: {
    user: {
      id: '2',
      email: 'admin@example.com',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      districts: [4, 7, 11],
      permissions: [
        'VIEW_PEMS_DATA',
        'VIEW_DETAILED_ANALYTICS',
        'VIEW_DISTRICT_SPECIFIC',
        'EXPORT_DATA',
        'MANAGE_INCIDENTS',
        'VIEW_LIVE_FEEDS'
      ]
    },
    isAuthenticated: true,
    userRole: 'admin',
    permissions: [
      'VIEW_PEMS_DATA',
      'VIEW_DETAILED_ANALYTICS',
      'VIEW_DISTRICT_SPECIFIC',
      'EXPORT_DATA',
      'MANAGE_INCIDENTS',
      'VIEW_LIVE_FEEDS'
    ],
    districts: [4, 7, 11]
  }
};

// Mock API responses
export const mockApiResponses = {
  pemsAnalytics: {
    timestamp: new Date().toISOString(),
    overview: {
      total_detectors: 1024,
      avg_speed_mph: 62.5,
      high_risk_count: 15,
    },
    regional_status: [
      {
        region: 'Los Angeles County',
        detector_count: 285,
        avg_speed: 58.2,
        high_risk_count: 8,
        alerts_count: 3,
        status: 'HEALTHY'
      },
      {
        region: 'San Francisco Bay Area',
        detector_count: 198,
        avg_speed: 61.5,
        high_risk_count: 4,
        alerts_count: 2,
        status: 'HEALTHY'
      },
      {
        region: 'Orange County',
        detector_count: 147,
        avg_speed: 64.1,
        high_risk_count: 2,
        alerts_count: 1,
        status: 'HEALTHY'
      }
    ],
    risk_analysis: {
      distribution: {
        critical: 3,
        medium: 28,
        low: 957,
      },
    },
  },

  highRiskAreas: {
    high_risk_areas: [
      {
        location: 'I-405 North',
        risk: 8.5,
        flow: 1200,
        speed: 35.2,
        detector_id: 'DET-001',
        risk_level: 'HIGH',
        freeway: 'I-405',
        direction: 'North',
        region_name: 'Los Angeles',
        risk_score: 8.5
      },
      {
        location: 'I-101 South',
        risk: 7.2,
        flow: 980,
        speed: 42.1,
        detector_id: 'DET-002',
        risk_level: 'MEDIUM',
        freeway: 'I-101',
        direction: 'South',
        region_name: 'San Francisco',
        risk_score: 7.2
      }
    ]
  },

  alerts: {
    priority_breakdown: {
      high: 5,
      medium: 12,
      low: 8,
    },
  },

  districtData: {
    district: '4',
    region_name: 'Los Angeles County',
    summary: {
      avg_speed: 58.2,
      total_flow: 147500,
      avg_risk_score: 3.2,
      total_detectors: 285,
      active_detectors: 275,
    },
  },

  incidents: [
    {
      id: '1',
      type: 'accident',
      location: 'I-405 @ Wilshire Blvd',
      severity: 'high',
      status: 'active',
      timestamp: new Date().toISOString(),
      description: 'Multi-vehicle collision blocking two lanes'
    },
    {
      id: '2',
      type: 'construction',
      location: 'I-101 @ Main St',
      severity: 'medium',
      status: 'scheduled',
      timestamp: new Date().toISOString(),
      description: 'Lane closure for maintenance work'
    }
  ]
};

// Helper function to create mock API service
export const createMockApiService = (overrides: Record<string, any> = {}) => {
  return {
    fetchPEMSAnalyticsData: cy.stub().resolves(overrides.pemsAnalytics || mockApiResponses.pemsAnalytics),
    fetchPEMSDashboardSummary: cy.stub().resolves(overrides.dashboardSummary || null),
    fetchPEMSHighRiskAreas: cy.stub().resolves(overrides.highRiskAreas || mockApiResponses.highRiskAreas),
    fetchPEMSAlerts: cy.stub().resolves(overrides.alerts || mockApiResponses.alerts),
    fetchPEMSDistrictData: cy.stub().resolves(overrides.districtData || mockApiResponses.districtData),
    fetchIncidents: cy.stub().resolves(overrides.incidents || mockApiResponses.incidents),
    fetchLiveFeeds: cy.stub().resolves(overrides.liveFeeds || []),
    fetchWeeklyTrafficData: cy.stub().resolves(overrides.weeklyTraffic || []),
    ...overrides
  };
};

// Helper function to setup common mocks before each test
export const setupComponentTestMocks = (apiOverrides: Record<string, any> = {}) => {
  beforeEach(() => {
    // Mock API Service
    cy.window().then((win: any) => {
      win.ApiService = createMockApiService(apiOverrides);
    });

    // Mock other global services
    cy.window().then((win: any) => {
      win.dataPrefetchService = {
        prefetchRoute: cy.stub(),
        clearCache: cy.stub(),
      };

      // Mock console methods to avoid noise in tests
      win.console = {
        ...win.console,
        warn: cy.stub(),
        error: cy.stub(),
      };
    });

    // Mock fetch for any direct API calls
    cy.intercept('GET', '/api/**', { fixture: 'default-api-response.json' }).as('apiCall');
  });
};

// Helper to create mock theme context
export const createMockThemeContext = (isDarkMode = false) => ({
  isDarkMode,
  toggleTheme: cy.stub(),
});

// Common assertions
export const commonAssertions = {
  shouldBeVisible: (selector: string) => {
    cy.get(selector).should('be.visible');
  },

  shouldContainText: (selector: string, text: string) => {
    cy.get(selector).should('contain', text);
  },

  shouldHaveClass: (selector: string, className: string) => {
    cy.get(selector).should('have.class', className);
  },

  shouldBeClickable: (selector: string) => {
    cy.get(selector).should('be.visible').and('not.be.disabled');
  }
};

// Test data generators
export const generateTestData = {
  incident: (overrides: Partial<any> = {}) => ({
    id: Math.random().toString(36).substr(2, 9),
    type: 'accident',
    location: 'I-405 @ Test Ave',
    severity: 'medium',
    status: 'active',
    timestamp: new Date().toISOString(),
    description: 'Test incident',
    ...overrides
  }),

  user: (overrides: Partial<MockUser> = {}) => ({
    id: Math.random().toString(36).substr(2, 9),
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'traffic_controller',
    permissions: ['VIEW_PEMS_DATA'],
    ...overrides
  })
};