import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Search, AlertTriangle, BarChart3, Archive, Video, Settings, User, HelpCircle, MapPin, Clock, Users, Shield } from 'lucide-react';
import './Help.css'; // Import the professional CSS

// TypeScript interfaces
interface HelpContent {
  question: string;
  answer: string;
}

interface HelpSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: HelpContent[];
}

interface OpenSections {
  [key: string]: boolean;
}

const Help: React.FC = () => {
  const [openSections, setOpenSections] = useState<OpenSections>({});
  const [searchTerm, setSearchTerm] = useState<string>('');

  const toggleSection = (section: string): void => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const helpSections: HelpSection[] = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: <HelpCircle className="help-section-icon" />,
      content: [
        {
          question: 'How do I navigate the Traffic Guardian dashboard?',
          answer: 'The dashboard provides an overview of all traffic incidents and system status. Use the navigation bar to access different sections: Dashboard (overview), Live Feed (real-time data), Incidents (incident management), Archives (historical data), Analytics (reports), and Account (settings).'
        },
        {
          question: 'What do the different incident severity levels mean?',
          answer: 'High: Major incidents requiring immediate attention (accidents, road closures). Medium: Moderate traffic disruptions. Low: Minor issues with minimal impact. Critical incidents are marked with red indicators and require priority response.'
        },
        {
          question: 'How do I create my first incident report?',
          answer: 'Navigate to the Incidents page and click "Create New Incident." Fill in the required fields: date, location, car ID, severity level, and status. The system will automatically generate alerts based on your notification preferences.'
        },
        {
          question: 'Understanding user roles and permissions',
          answer: 'Traffic Guardian supports multiple user roles: Traffic Operators (real-time monitoring), Emergency Coordinators (resource dispatch), Supervisors (system oversight), System Administrators (technical management), and Data Analysts (reporting and insights).'
        }
      ]
    },
    {
      id: 'dashboard',
      title: 'Dashboard Features',
      icon: <BarChart3 className="help-section-icon" />,
      content: [
        {
          question: 'Understanding dashboard widgets',
          answer: 'The dashboard displays key metrics including active incidents requiring attention, camera operational status, average response times, and daily incident counts with comparisons to previous periods.'
        },
        {
          question: 'Quick Action cards',
          answer: 'Use the clickable Quick Action cards to navigate quickly: Live Feed (camera monitoring), Report Incident (manual reporting), Analytics (trend analysis), and Archive (historical data). Each card provides instant access to frequently used features.'
        },
        {
          question: 'Auto-refresh and real-time updates',
          answer: 'The dashboard automatically refreshes every 60 seconds to show the latest incident data and system status. The "All Systems Operational" indicator shows overall system health, and the current time is displayed in the header.'
        },
        {
          question: 'System status indicators',
          answer: 'Monitor camera operational percentages, view active incident counts, and track response time metrics. These indicators help you quickly assess system performance and operational efficiency.'
        }
      ]
    },
    {
      id: 'live-feed',
      title: 'Live Feed Monitoring',
      icon: <Video className="help-section-icon" />,
      content: [
        {
          question: 'Video stream management',
          answer: 'The Live Feed displays simultaneous video streams from multiple traffic cameras (minimum 6 feeds). Each feed shows real-time traffic conditions with AI-powered incident detection overlays highlighting areas of interest.'
        },
        {
          question: 'AI-powered incident detection',
          answer: 'The system continuously analyzes video feeds using computer vision to detect Vehicle Accidents, Vehicle Breakdowns, Traffic Congestion, Road Debris, Weather Hazards, Construction Zones, Emergency Vehicles, and other incidents.'
        },
        {
          question: 'Real-time alert system',
          answer: 'When incidents are detected, the system generates immediate visual and audio alerts on the dashboard. Alerts include incident type, severity level, location coordinates, and recommended actions for operators.'
        },
        {
          question: 'Camera status monitoring',
          answer: 'Monitor all configured cameras with real-time status indicators (Active/Offline), incident detection counts, and last-seen timestamps. Offline cameras are highlighted with red indicators for immediate attention.'
        }
      ]
    },
    {
      id: 'incidents',
      title: 'Incident Management',
      icon: <AlertTriangle className="help-section-icon" />,
      content: [
        {
          question: 'Creating manual incident reports',
          answer: 'Click "Report Incident" to manually create a new incident. Fill in required fields: Incident Date, Camera ID, Location, Incident Type, Severity, Description, and Reporter Name. Optional fields include GPS coordinates, weather conditions, traffic impact, and photos.'
        },
        {
          question: 'Managing active incidents',
          answer: 'View all active incidents with details including ID, date, type, location, camera source, severity, and current status. Use the view icon (eye) to see full metadata, edit icon to modify details, and dropdown to change status to "Resolved".'
        },
        {
          question: 'Incident classification system',
          answer: 'Incidents are classified into predefined categories: Vehicle Accident, Vehicle Breakdown, Traffic Congestion, Road Debris, Weather Hazard, Construction Zone, Emergency Vehicle, and Other. Each type has specific handling procedures and priority levels.'
        },
        {
          question: 'Search and filtering capabilities',
          answer: 'Use the search box to find incidents by ID, location, or type. Apply filters by status (Active/Resolved), severity level (Low/Medium/High), incident type, and date range. This helps operators quickly locate specific incidents during busy periods.'
        },
        {
          question: 'Geolocation and mapping',
          answer: 'Each incident is automatically mapped to precise GPS coordinates for accurate location tracking. This enables emergency responders to receive exact coordinates and helps with resource allocation and response planning.'
        }
      ]
    },
    {
      id: 'analytics',
      title: 'Analytics & Reporting',
      icon: <BarChart3 className="help-section-icon" />,
      content: [
        {
          question: 'Trend analysis and charts',
          answer: 'Access interactive charts showing incident counts over time, response-time distributions, and category breakdowns. Select custom date ranges to analyze specific periods and identify patterns in traffic incidents.'
        },
        {
          question: 'Performance metrics',
          answer: 'Monitor key performance indicators including detection accuracy, system response times, operator response times, and false positive rates. These metrics help supervisors identify areas for improvement and training needs.'
        },
        {
          question: 'Historical data analysis',
          answer: 'Query historical incidents by multiple criteria to identify patterns and correlations. Export data in CSV or JSON formats for detailed analysis using specialized tools and create comprehensive trend reports.'
        },
        {
          question: 'Custom reporting',
          answer: 'Generate comprehensive incident reports for management and stakeholders. Reports include performance data, trend analysis, high-incident locations, and recommendations for operational improvements.'
        }
      ]
    },
    {
      id: 'archives',
      title: 'Archives & Historical Data',
      icon: <Archive className="help-section-icon" />,
      content: [
        {
          question: 'Accessing archived incidents',
          answer: 'The Archives page provides access to all historical incidents with the same search, filtering, and pagination capabilities as the active incidents list. Use this for trend analysis, reporting, and training purposes.'
        },
        {
          question: 'Data retention and storage',
          answer: 'Incident data is automatically archived with searchable metadata for long-term analysis. Raw data is stored securely with structured querying capabilities for analytics and compliance requirements.'
        },
        {
          question: 'Historical pattern recognition',
          answer: 'Analyze archived data to identify recurring incident patterns, high-risk locations, and time-based trends. This information helps with preventive measures and resource planning.'
        }
      ]
    },
    {
      id: 'user-management',
      title: 'User Management & Account',
      icon: <User className="help-section-icon" />,
      content: [
        {
          question: 'Account registration and login',
          answer: 'Register with username, email, and password (minimum 6 characters). Login using email and password. Use the "Forgot?" link for password reset via time-limited email token. Admin users have additional privileges marked with an "Admin" badge.'
        },
        {
          question: 'User preferences and notifications',
          answer: 'Configure notification preferences for different alert types, severity levels, and specific locations. Set up email notifications and in-app alerts to ensure you receive critical incident information promptly.'
        },
        {
          question: 'Profile management',
          answer: 'View and update your account information including username, email, account type, and notification preferences. Access your profile through the Account section in the navigation menu.'
        },
        {
          question: 'Role-based access control',
          answer: 'Different user roles have specific permissions: Operators manage real-time incidents, Coordinators handle emergency dispatch, Supervisors access analytics and configuration, Administrators manage system settings, and Analysts focus on data and reporting.'
        }
      ]
    },
    {
      id: 'system-admin',
      title: 'System Administration',
      icon: <Settings className="help-section-icon" />,
      content: [
        {
          question: 'Camera configuration and monitoring',
          answer: 'System administrators can configure camera feeds, adjust detection parameters for different locations, and monitor camera health metrics. Set up new cameras by specifying feed URLs and location coordinates.'
        },
        {
          question: 'Alert threshold configuration',
          answer: 'Adjust detection sensitivity and alert thresholds to balance false positives with detection coverage. Configure automatic escalation for unacknowledged critical incidents to ensure no emergency response is delayed.'
        },
        {
          question: 'User account management',
          answer: 'Manage user accounts and permissions, ensuring appropriate access control and security compliance. Create new accounts, modify user roles, and maintain audit trails for compliance requirements.'
        },
        {
          question: 'System health monitoring',
          answer: 'Monitor system performance metrics including CPU utilization, response times, and service availability. Access detailed system logs for troubleshooting and maintain backup procedures for data protection.'
        },
        {
          question: 'Security and compliance',
          answer: 'The system implements HTTPS encryption, AWS IAM access control, and AES encryption for sensitive data. Regular vulnerability scans ensure POPI Act compliance and security best practices.'
        }
      ]
    },
    {
      id: 'emergency-response',
      title: 'Emergency Response Coordination',
      icon: <Users className="help-section-icon" />,
      content: [
        {
          question: 'Resource dispatch and allocation',
          answer: 'Emergency coordinators receive prioritized incident alerts with severity levels to dispatch appropriate resources (ambulance, fire, police, tow truck). Access incident snapshots and video clips to brief response teams on scene conditions.'
        },
        {
          question: 'Incident status tracking',
          answer: 'Monitor response progress and determine when additional resources are needed. Track incident status updates from initial detection through resolution, with estimated duration based on incident type and severity.'
        },
        {
          question: 'Escalation procedures',
          answer: 'Receive escalation alerts for unacknowledged critical incidents to ensure no emergency response is delayed. The system automatically escalates high-priority incidents that remain unaddressed for specified time periods.'
        }
      ]
    },
    {
      id: 'troubleshooting',
      title: 'Troubleshooting & Support',
      icon: <Shield className="help-section-icon" />,
      content: [
        {
          question: 'Common connectivity issues',
          answer: 'If you see "Failed to load incidents" errors, check your internet connection and refresh the page. The system automatically retries failed API calls up to three times before displaying error messages.'
        },
        {
          question: 'Video feed problems',
          answer: 'If video feeds are not displaying, check camera status in the system. Offline cameras are highlighted with red indicators. Contact system administrators if multiple cameras show offline status.'
        },
        {
          question: 'Performance optimization',
          answer: 'For optimal performance, use the latest versions of Chrome, Firefox, Edge, or Safari. The system is designed to work across Windows, macOS, and Linux without additional configuration.'
        },
        {
          question: 'Data export and backup',
          answer: 'Export incident data in CSV or JSON formats for external analysis. System administrators handle automated backups and data protection procedures to ensure business continuity.'
        },
        {
          question: 'Getting additional help',
          answer: 'Contact your system administrator for technical issues, user account problems, or additional training. Training coordinators can provide access to system documentation and user guides for comprehensive learning.'
        }
      ]
    }
  ];

  const filteredSections = helpSections.filter(section => 
    section.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    section.content.some(item => 
      item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <div className="help-page">
      {/* Header */}
      <div className="help-header">
        <h1 className="help-main-title">Traffic Guardian Help Center</h1>
        <p className="help-main-subtitle">
          Comprehensive guide to using the Traffic Guardian incident detection and reporting system
        </p>
      </div>

      <div className="help-container">
        {/* Search Bar */}
        <div className="help-search-container">
          <Search className="help-search-icon" />
          <input
            type="text"
            placeholder="Search help topics..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="help-search-input"
          />
        </div>

        {/* Help Sections */}
        <div className="help-sections-container">
          {filteredSections.map((section) => (
            <div 
              key={section.id} 
              className={`help-section-card ${openSections[section.id] ? 'expanded' : ''}`}
            >
              <button
                onClick={() => toggleSection(section.id)}
                className="help-section-header"
              >
                <div className="help-section-header-left">
                  {section.icon}
                  <h2 className="help-section-title">{section.title}</h2>
                </div>
                <div className="help-section-chevron">
                  {openSections[section.id] ? (
                    <ChevronDown />
                  ) : (
                    <ChevronRight />
                  )}
                </div>
              </button>
              
              {openSections[section.id] && (
                <div className="help-section-content">
                  <div className="help-section-content-inner">
                    <div className="help-qa-list">
                      {section.content.map((item, index) => (
                        <div key={index} className="help-qa-item">
                          <h3 className="help-qa-question">
                            {item.question}
                          </h3>
                          <p className="help-qa-answer">
                            {item.answer}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Quick Access Links */}
        <div className="help-quick-access">
          <h3 className="help-quick-access-title">Quick Access</h3>
          <div className="help-quick-access-grid">
            <div className="help-quick-access-item">
              <BarChart3 className="help-quick-access-icon" />
              <span className="help-quick-access-label">Dashboard</span>
            </div>
            <div className="help-quick-access-item">
              <Video className="help-quick-access-icon" />
              <span className="help-quick-access-label">Live Feed</span>
            </div>
            <div className="help-quick-access-item">
              <AlertTriangle className="help-quick-access-icon" />
              <span className="help-quick-access-label">Incidents</span>
            </div>
            <div className="help-quick-access-item">
              <Archive className="help-quick-access-icon" />
              <span className="help-quick-access-label">Archives</span>
            </div>
          </div>
        </div>

        {/* Contact Support */}
        <div className="help-contact-support">
          <div className="help-contact-card">
            <h3 className="help-contact-title">Need Additional Help?</h3>
            <p className="help-contact-description">
              Contact your system administrator for technical support or additional training resources.
            </p>
            <p className="help-contact-footer">
              Traffic Guardian v1.0 | University of Pretoria | Quantum Quenchers Team
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Help;