// Lane Closure Service for District 12
// Fetches and processes lane closure data from California DOT

export interface LaneClosureLocation {
  latitude: number;
  longitude: number;
  elevation: number;
  direction: string;
}

export interface LaneClosureDetails {
  closureId: string;
  logNumber: string;
  index: string;
  startDateTime: string;
  endDateTime: string;
  lanesExisting: number;
  lanesClosed: number;
  closureType: string;
  facilityType: string;
  workType: string;
  chinReportable: string;
  flowDirection: string;
}

export interface LaneClosure {
  id: string;
  recordTimestamp: string;
  beginLocation: LaneClosureLocation;
  endLocation: LaneClosureLocation;
  route: string;
  district: string;
  nearbyLandmark: string;
  details: LaneClosureDetails;
  status: 'active' | 'upcoming' | 'completed';
  severity: 'low' | 'medium' | 'high';
}

export interface LaneClosureAnalysis {
  totalClosures: number;
  activeClosure: number;
  upcomingClosures: number;
  highSeverityClosures: number;
  affectedRoutes: string[];
  timestamp: Date;
}

class LaneClosureService {
  private laneClosures: LaneClosure[] = [];
  private updateCallbacks: ((data: LaneClosure[]) => void)[] = [];
  private readonly API_URL = 'https://cwwp2.dot.ca.gov/data/d12/lcs/lcsStatusD12.json';

  // Subscribe to lane closure updates
  subscribe(callback: (data: LaneClosure[]) => void): () => void {
    this.updateCallbacks.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.updateCallbacks.indexOf(callback);
      if (index > -1) {
        this.updateCallbacks.splice(index, 1);
      }
    };
  }

  // Fetch lane closure data from DOT API
  async fetchLaneClosures(): Promise<LaneClosure[]> {
    try {
      console.log('🚧 Fetching District 12 lane closures from:', this.API_URL);

      const response = await fetch(this.API_URL, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
        },
      });

      console.log('🚧 Response status:', response.status);
      console.log('🚧 Response headers:', response.headers);

      if (!response.ok) {
        throw new Error(`Failed to fetch lane closures: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      console.log('🚧 Raw API response:', data);
      console.log('🚧 Data structure:', {
        hasData: !!data.data,
        isArray: Array.isArray(data.data),
        length: data.data?.length || 0
      });

      if (!data.data || !Array.isArray(data.data)) {
        console.warn('⚠️ Unexpected lane closure data format:', data);
        return [];
      }

      console.log(`🚧 Processing ${data.data.length} raw lane closure items...`);
      console.log('🚧 Sample item structure:', data.data[0]);
      const processedClosures = data.data.map((item: any) => this.processLaneClosureItem(item));

      // Filter valid closures with coordinates
      const validClosures = processedClosures.filter((closure: LaneClosure | null) => closure !== null);

      console.log(`✅ Processed ${validClosures.length} lane closures`);

      this.laneClosures = validClosures;
      this.notifySubscribers();

      return validClosures;
    } catch (error) {
      console.error('❌ Error fetching lane closures:', error);
      console.log('🚧 Creating test data due to API error...');

      // Return test data to verify the UI works
      return this.createTestLaneClosures();
    }
  }

  // Process individual lane closure item from API
  private processLaneClosureItem(item: any): LaneClosure | null {
    try {
      console.log('🚧 Processing item:', item);
      const lcs = item.lcs;
      if (!lcs) {
        console.log('❌ No lcs data in item');
        return null;
      }

      console.log('🚧 LCS keys:', Object.keys(lcs));
      console.log('🚧 Location data:', lcs.location);
      console.log('🚧 Closure data:', lcs.closure);

      // Extract location data from the location object
      const location = lcs.location;
      if (!location) {
        console.log('❌ No location data');
        return null;
      }

      // Extract coordinates from begin and end objects
      const begin = location.begin;
      const end = location.end;

      if (!begin || !end) {
        console.log('❌ No begin/end location data');
        return null;
      }

      console.log('🚧 Begin data:', begin);
      console.log('🚧 End data:', end);

      const beginLat = parseFloat(begin.beginLatitude);
      const beginLng = parseFloat(begin.beginLongitude);
      const endLat = parseFloat(end.endLatitude);
      const endLng = parseFloat(end.endLongitude);

      console.log('🚧 Coordinates:', { beginLat, beginLng, endLat, endLng });

      if (isNaN(beginLat) || isNaN(beginLng)) {
        console.log('❌ Invalid coordinates');
        return null;
      }

      // Get closure details
      const closure = lcs.closure;
      if (!closure) {
        console.log('❌ No closure data');
        return null;
      }

      // Calculate closure status and severity
      const startDateTime = closure.closureTimestamp?.closureStartDate + ' ' + closure.closureTimestamp?.closureStartTime;
      const endDateTime = closure.closureTimestamp?.closureEndDate + ' ' + closure.closureTimestamp?.closureEndTime;
      const status = this.calculateClosureStatus(startDateTime, endDateTime);
      const severity = this.calculateClosureSeverity(closure.totalExistingLanes, closure.lanesClosed, closure.facility);

      const laneClosureObject: LaneClosure = {
        id: `${closure.closureID || 'unknown'}-${lcs.index}-${closure.logNumber}-${Math.random().toString(36).substr(2, 9)}`,
        recordTimestamp: lcs.recordTimestamp,
        beginLocation: {
          latitude: beginLat,
          longitude: beginLng,
          elevation: parseFloat(begin.beginElevation) || 0,
          direction: location.travelFlowDirection || 'Unknown',
        },
        endLocation: {
          latitude: endLat,
          longitude: endLng,
          elevation: parseFloat(end.endElevation) || 0,
          direction: location.travelFlowDirection || 'Unknown',
        },
        route: begin.beginRouteNumber || end.endRouteNumber || 'Unknown Route',
        district: '12',
        nearbyLandmark: begin.beginNearbyPlace || end.endNearbyPlace || 'No landmark provided',
        details: {
          closureId: closure.closureID || '',
          logNumber: closure.logNumber || '',
          index: lcs.index || '',
          startDateTime: closure.closureTimestamp?.closureStartDate + ' ' + closure.closureTimestamp?.closureStartTime || '',
          endDateTime: closure.closureTimestamp?.closureEndDate + ' ' + closure.closureTimestamp?.closureEndTime || '',
          lanesExisting: parseInt(closure.totalExistingLanes) || 0,
          lanesClosed: parseInt(closure.lanesClosed) || 0,
          closureType: closure.typeOfClosure || 'Unknown',
          facilityType: closure.facility || 'Unknown',
          workType: closure.typeOfWork || 'Unknown',
          chinReportable: closure.isCHINReportable || 'No',
          flowDirection: location.travelFlowDirection || 'Unknown',
        },
        status,
        severity,
      };

      return laneClosureObject;
    } catch (error) {
      console.error('❌ Error processing lane closure item:', error);
      return null;
    }
  }

  // Calculate closure status based on timing
  private calculateClosureStatus(startDateTime: string, endDateTime: string): 'active' | 'upcoming' | 'completed' {
    try {
      const now = new Date();
      const start = new Date(startDateTime);
      const end = new Date(endDateTime);

      if (now < start) {
        return 'upcoming';
      }
      if (now > end) {
        return 'completed';
      }
      return 'active';
    } catch (error) {
      return 'active'; // Default to active if parsing fails
    }
  }

  // Calculate closure severity based on impact
  private calculateClosureSeverity(lanesExisting: number, lanesClosed: number, facilityType: string): 'low' | 'medium' | 'high' {
    const impactPercentage = (lanesClosed / Math.max(lanesExisting, 1)) * 100;

    // High severity for major facility types or high impact
    if (facilityType?.toLowerCase().includes('freeway') || facilityType?.toLowerCase().includes('highway')) {
      if (impactPercentage >= 50) {
        return 'high';
      }
      if (impactPercentage >= 25) {
        return 'medium';
      }
      return 'low';
    }

    // Regular roads
    if (impactPercentage >= 75) {
      return 'high';
    }
    if (impactPercentage >= 50) {
      return 'medium';
    }
    return 'low';
  }

  // Get current lane closures
  getCurrentLaneClosures(): LaneClosure[] {
    return [...this.laneClosures];
  }

  // Get lane closure analysis
  getLaneClosureAnalysis(): LaneClosureAnalysis {
    const activeClosure = this.laneClosures.filter(c => c.status === 'active').length;
    const upcomingClosures = this.laneClosures.filter(c => c.status === 'upcoming').length;
    const highSeverityClosures = this.laneClosures.filter(c => c.severity === 'high').length;
    const routeSet = new Set(this.laneClosures.map(c => c.route));
    const affectedRoutes = Array.from(routeSet);

    return {
      totalClosures: this.laneClosures.length,
      activeClosure,
      upcomingClosures,
      highSeverityClosures,
      affectedRoutes,
      timestamp: new Date(),
    };
  }

  // Filter closures by status
  getClosuresByStatus(status: 'active' | 'upcoming' | 'completed'): LaneClosure[] {
    return this.laneClosures.filter(closure => closure.status === status);
  }

  // Filter closures by severity
  getClosuresBySeverity(severity: 'low' | 'medium' | 'high'): LaneClosure[] {
    return this.laneClosures.filter(closure => closure.severity === severity);
  }

  // Get closures within a bounding box (for map viewport)
  getClosuresInBounds(bounds: { north: number; south: number; east: number; west: number }): LaneClosure[] {
    return this.laneClosures.filter(closure => {
      const lat = closure.beginLocation.latitude;
      const lng = closure.beginLocation.longitude;

      return (
        lat >= bounds.south &&
        lat <= bounds.north &&
        lng >= bounds.west &&
        lng <= bounds.east
      );
    });
  }

  // Notify all subscribers of updates
  private notifySubscribers(): void {
    this.updateCallbacks.forEach(callback => callback(this.laneClosures));
  }

  // Create test lane closures for development/fallback
  private createTestLaneClosures(): LaneClosure[] {
    const testClosures: LaneClosure[] = [
      {
        id: 'test-closure-1',
        recordTimestamp: new Date().toISOString(),
        beginLocation: {
          latitude: 33.616352,
          longitude: -117.900887,
          elevation: 0,
          direction: 'North',
        },
        endLocation: {
          latitude: 33.616243,
          longitude: -117.907273,
          elevation: 0,
          direction: 'North',
        },
        route: 'SR-1',
        district: '12',
        nearbyLandmark: 'Bayside Dr to Dover Dr (TEST DATA)',
        details: {
          closureId: 'TEST-001',
          logNumber: 'C1KA-0001',
          index: '1',
          startDateTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
          endDateTime: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), // 6 hours from now
          lanesExisting: 4,
          lanesClosed: 2,
          closureType: 'Lane',
          facilityType: 'Freeway',
          workType: 'Construction Work',
          chinReportable: 'Yes',
          flowDirection: 'North',
        },
        status: 'active',
        severity: 'medium',
      },
      {
        id: 'test-closure-2',
        recordTimestamp: new Date().toISOString(),
        beginLocation: {
          latitude: 33.7175,
          longitude: -117.8311,
          elevation: 0,
          direction: 'South',
        },
        endLocation: {
          latitude: 33.7165,
          longitude: -117.8321,
          elevation: 0,
          direction: 'South',
        },
        route: 'I-405',
        district: '12',
        nearbyLandmark: 'Newport Beach Area (TEST DATA)',
        details: {
          closureId: 'TEST-002',
          logNumber: 'C1KA-0002',
          index: '2',
          startDateTime: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(), // 1 hour from now
          endDateTime: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(), // 8 hours from now
          lanesExisting: 5,
          lanesClosed: 1,
          closureType: 'Lane',
          facilityType: 'Highway',
          workType: 'Maintenance',
          chinReportable: 'No',
          flowDirection: 'South',
        },
        status: 'upcoming',
        severity: 'low',
      },
      {
        id: 'test-closure-3',
        recordTimestamp: new Date().toISOString(),
        beginLocation: {
          latitude: 33.6478,
          longitude: -117.8426,
          elevation: 0,
          direction: 'East',
        },
        endLocation: {
          latitude: 33.6468,
          longitude: -117.8416,
          elevation: 0,
          direction: 'East',
        },
        route: 'SR-73',
        district: '12',
        nearbyLandmark: 'Corona del Mar (TEST DATA)',
        details: {
          closureId: 'TEST-003',
          logNumber: 'C1KA-0003',
          index: '3',
          startDateTime: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
          endDateTime: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(), // 3 hours from now
          lanesExisting: 3,
          lanesClosed: 3,
          closureType: 'Full Closure',
          facilityType: 'Highway',
          workType: 'Emergency Repair',
          chinReportable: 'Yes',
          flowDirection: 'East',
        },
        status: 'active',
        severity: 'high',
      },
    ];

    console.log(`🚧 Created ${testClosures.length} test lane closures`);
    this.laneClosures = testClosures;
    this.notifySubscribers();
    return testClosures;
  }

  // Start periodic updates
  startPeriodicUpdates(intervalMinutes = 5): void {
    console.log('🚧 Starting lane closure periodic updates...');
    // Initial fetch
    this.fetchLaneClosures();

    // Set up periodic updates (DOT updates every 5 minutes)
    setInterval(() => {
      console.log('🔄 Updating lane closure data...');
      this.fetchLaneClosures();
    }, intervalMinutes * 60 * 1000);
  }
}

const laneClosureService = new LaneClosureService();
export default laneClosureService;