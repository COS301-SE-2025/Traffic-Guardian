// Traffic Density Service
// Processes object detection data and generates heatmap points for traffic visualization

import ApiService from './apiService';

export interface VehicleDetection {
  id: string;
  type: 'car' | 'truck' | 'motorcycle' | 'bus';
  confidence: number;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface DetectionData {
  cameraId: string;
  timestamp: Date;
  vehicles: VehicleDetection[];
  coordinates: {
    lat: number;
    lng: number;
  };
}

export interface HeatmapPoint {
  lat: number;
  lng: number;
  intensity: number; // 0-1, where 1 is highest traffic
  timestamp: Date;
  vehicleCount: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface TrafficDensityAnalysis {
  totalVehicles: number;
  averageIntensity: number;
  peakIntensity: number;
  riskAreas: HeatmapPoint[];
  timestamp: Date;
}

class TrafficDensityService {
  private detectionHistory: Map<string, DetectionData[]> = new Map();
  private heatmapData: HeatmapPoint[] = [];
  private updateCallbacks: ((data: HeatmapPoint[]) => void)[] = [];


  // Thresholds for traffic density classification
  private readonly THRESHOLDS = {
    LOW: 5, // 1-5 vehicles
    MEDIUM: 10, // 6-10 vehicles
    HIGH: 15, // 11-15 vehicles
    CRITICAL: 20, // 16+ vehicles (high accident risk)
  };

  // Subscribe to heatmap updates
  subscribe(callback: (data: HeatmapPoint[]) => void): () => void {
    this.updateCallbacks.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.updateCallbacks.indexOf(callback);
      if (index > -1) {
        this.updateCallbacks.splice(index, 1);
      }
    };
  }

  // Process new object detection data
  processDetectionData(detectionData: DetectionData): HeatmapPoint {
    const { cameraId, vehicles, coordinates, timestamp } = detectionData;

    // Store in history for analysis
    if (!this.detectionHistory.has(cameraId)) {
      this.detectionHistory.set(cameraId, []);
    }

    const history = this.detectionHistory.get(cameraId)!;
    history.push(detectionData);

    // Keep only last 30 minutes of data
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    this.detectionHistory.set(
      cameraId,
      history.filter(data => data.timestamp > thirtyMinutesAgo),
    );

    // Calculate traffic density
    const vehicleCount = vehicles.length;
    const intensity = this.calculateIntensity(vehicleCount);
    const riskLevel = this.calculateRiskLevel(vehicleCount);

    // Create heatmap point
    const heatmapPoint: HeatmapPoint = {
      lat: coordinates.lat,
      lng: coordinates.lng,
      intensity,
      timestamp,
      vehicleCount,
      riskLevel,
    };


    // Update heatmap data
    this.updateHeatmapData(cameraId, heatmapPoint);

    return heatmapPoint;
  }

  // Calculate intensity for better color distribution
  private calculateIntensity(vehicleCount: number): number {
    // Use a much wider range to prevent leaflet auto-normalization
    // This ensures visible color differences across the spectrum

    if (vehicleCount <= 2) { return 1.0; }   // Very light green
    if (vehicleCount <= 5) { return 3.0; }   // Light green (LOW threshold)
    if (vehicleCount <= 8) { return 5.0; }   // Yellow-green
    if (vehicleCount <= 12) { return 7.0; }  // Yellow-orange
    if (vehicleCount <= 16) { return 9.0; }  // Orange (HIGH threshold)
    if (vehicleCount <= 20) { return 12.0; } // Red-orange (CRITICAL threshold)
    return 15.0; // Deep red for 21+ vehicles
  }

  // Calculate risk level based on vehicle count
  private calculateRiskLevel(
    vehicleCount: number,
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (vehicleCount <= this.THRESHOLDS.LOW) {return 'low';}
    if (vehicleCount <= this.THRESHOLDS.MEDIUM) {return 'medium';}
    if (vehicleCount <= this.THRESHOLDS.HIGH) {return 'high';}
    return 'critical';
  }

  // Update heatmap data for a specific camera
  private updateHeatmapData(cameraId: string, newPoint: HeatmapPoint): void {
    // Remove old data for this camera
    this.heatmapData = this.heatmapData.filter(
      point => !this.isNearLocation(point, newPoint, 0.001), // ~100m tolerance
    );

    // Add new point
    this.heatmapData.push(newPoint);

    // Clean old data (older than 15 minutes)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    this.heatmapData = this.heatmapData.filter(
      point => point.timestamp > fifteenMinutesAgo,
    );

    // Notify subscribers
    this.updateCallbacks.forEach(callback => callback(this.heatmapData));
  }

  // Check if two points are near each other
  private isNearLocation(
    point1: HeatmapPoint,
    point2: HeatmapPoint,
    tolerance: number,
  ): boolean {
    const latDiff = Math.abs(point1.lat - point2.lat);
    const lngDiff = Math.abs(point1.lng - point2.lng);
    return latDiff < tolerance && lngDiff < tolerance;
  }

  // Get current heatmap data
  getCurrentHeatmapData(): HeatmapPoint[] {
    return [...this.heatmapData];
  }

  // Get traffic analysis for a specific area
  getTrafficAnalysis(): TrafficDensityAnalysis {
    const totalVehicles = this.heatmapData.reduce(
      (sum, point) => sum + point.vehicleCount,
      0,
    );
    const averageIntensity =
      this.heatmapData.length > 0
        ? this.heatmapData.reduce((sum, point) => sum + point.intensity, 0) /
          this.heatmapData.length
        : 0;
    const peakIntensity =
      this.heatmapData.length > 0
        ? Math.max(...this.heatmapData.map(point => point.intensity))
        : 0;

    const riskAreas = this.heatmapData.filter(
      point => point.riskLevel === 'high' || point.riskLevel === 'critical',
    );

    return {
      totalVehicles,
      averageIntensity,
      peakIntensity,
      riskAreas,
      timestamp: new Date(),
    };
  }

  // Fetch real traffic data from the database
  async fetchRealTrafficData(): Promise<void> {
    try {

      const cameras = await ApiService.fetchCamerasWithTrafficCounts();
      if (!cameras || cameras.length === 0) {
        console.log('⚠️ No cameras found in database - no heatmap data to display');
        // Clear any existing heatmap data
        this.heatmapData = [];
        this.updateCallbacks.forEach(callback => callback(this.heatmapData));
        return;
      }

      let processedCount = 0;

      cameras.forEach(camera => {
        // Convert database camera to coordinates if available
        const coordinates = this.extractCoordinatesFromCamera(camera);
        if (!coordinates) {
          return;
        }

        // Get traffic count from database (handle both camelCase and snake_case)
        const vehicleCount = camera.last_traffic_count || camera.lastTrafficCount || camera['last_traffic_count'] || 0;

        if (vehicleCount > 0) {
          // Create heatmap point directly from database traffic count
          const heatmapPoint: HeatmapPoint = {
            lat: coordinates.lat,
            lng: coordinates.lng,
            intensity: this.calculateIntensity(vehicleCount),
            timestamp: new Date(),
            vehicleCount: vehicleCount, // Use exact database count
            riskLevel: this.calculateRiskLevel(vehicleCount),
          };

          // Update heatmap data
          this.updateHeatmapData(camera.Camera_ID.toString(), heatmapPoint);
          processedCount++;

        }
      });


      // Notify subscribers of the updated heatmap data
      this.updateCallbacks.forEach(callback => callback(this.heatmapData));

      // If no cameras had traffic data, clear the heatmap
      if (processedCount === 0) {
        this.heatmapData = [];
        this.updateCallbacks.forEach(callback => callback(this.heatmapData));
      }
    } catch (error) {
      console.error('❌ Error fetching real traffic data:', error);
      // Clear heatmap on error instead of showing fallback data
      this.heatmapData = [];
      this.updateCallbacks.forEach(callback => callback(this.heatmapData));
    }
  }

  // Extract coordinates from database camera record
  private extractCoordinatesFromCamera(camera: any): { lat: number; lng: number } | null {
    // Handle both quoted and unquoted column names
    const lat = parseFloat(camera.Camera_Latitude || camera['Camera_Latitude'] || camera.latitude);
    const lng = parseFloat(camera.Camera_Longitude || camera['Camera_Longitude'] || camera.longitude);

    if (isNaN(lat) || isNaN(lng)) {
      return null;
    }

    // Validate coordinates are in reasonable range for California
    if (lat < 32 || lat > 42 || lng < -125 || lng > -114) {
      return null;
    }

    return { lat, lng };
  }

  // Generate vehicle detections based on count
  private generateVehicleDetections(count: number): VehicleDetection[] {
    return Array.from({ length: count }, (_, i) => ({
      id: `real_vehicle_${i}`,
      type: this.getRandomVehicleType(),
      confidence: 0.85 + Math.random() * 0.15,
      bbox: {
        x: Math.random() * 640,
        y: Math.random() * 480,
        width: 50 + Math.random() * 100,
        height: 30 + Math.random() * 60,
      },
    }));
  }


  // Simulate object detection data for demo purposes
  // In production, this would come from your ML model
  generateSimulatedData(cameraFeeds: any[]): void {
    cameraFeeds.forEach(camera => {

      // Generate traffic for all cameras with coordinates, regardless of status
      if (camera.coordinates) {
        // Simulate variable traffic based on time and location
        const baseVehicleCount = this.getTimeBasedTrafficCount();
        const locationMultiplier = this.getLocationTrafficMultiplier(
          camera.location,
        );
        const vehicleCount = Math.max(
          1,
          Math.floor(baseVehicleCount * locationMultiplier),
        );

        // Generate mock vehicle detections
        const vehicles: VehicleDetection[] = Array.from(
          { length: vehicleCount },
          (_, i) => ({
            id: `vehicle_${camera.id}_${i}`,
            type: this.getRandomVehicleType(),
            confidence: 0.8 + Math.random() * 0.2,
            bbox: {
              x: Math.random() * 640,
              y: Math.random() * 480,
              width: 50 + Math.random() * 100,
              height: 30 + Math.random() * 60,
            },
          }),
        );

        const detectionData: DetectionData = {
          cameraId: camera.id,
          timestamp: new Date(),
          vehicles,
          coordinates: camera.coordinates,
        };

        this.processDetectionData(detectionData);
      }
    });

    // If no cameras generated traffic, create some test data for demonstration
    if (this.heatmapData.length === 0 && cameraFeeds.length > 0) {
      this.createTestHeatmapData(cameraFeeds);
    }
  }

  // Create test heatmap data for demonstration
  private createTestHeatmapData(_cameraFeeds: any[]): void {
    const testPoints = [
      { lat: 33.6846, lng: -117.8265, vehicles: 15 }, // Orange County center
      { lat: 33.7175, lng: -117.8311, vehicles: 22 }, // North OC
      { lat: 33.6478, lng: -117.8426, vehicles: 8 }, // South OC
      { lat: 33.692, lng: -117.791, vehicles: 18 }, // East OC
      { lat: 33.6773, lng: -117.862, vehicles: 12 }, // West OC
    ];

    testPoints.forEach((point, _index) => {
      const intensity = Math.min(point.vehicles / this.THRESHOLDS.CRITICAL, 1);
      const riskLevel = this.calculateRiskLevel(point.vehicles);

      const heatmapPoint: HeatmapPoint = {
        lat: point.lat,
        lng: point.lng,
        intensity,
        timestamp: new Date(),
        vehicleCount: point.vehicles,
        riskLevel,
      };

      this.heatmapData.push(heatmapPoint);
    });

    // Notify subscribers of test data
    this.updateCallbacks.forEach(callback => callback(this.heatmapData));
  }

  // Get time-based traffic count (rush hour simulation)
  private getTimeBasedTrafficCount(): number {
    const hour = new Date().getHours();

    // Force higher traffic for testing - always generate significant traffic
    const baseTraffic = Math.random() * 20 + 10; // Always 10-30 vehicles for visibility

    // Rush hours: 7-9 AM and 5-7 PM
    if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
      return Math.max(baseTraffic, 20); // Ensure high traffic during rush hour
    }

    return baseTraffic;
  }

  // Get location-based traffic multiplier
  private getLocationTrafficMultiplier(location: string): number {
    const locationLower = location.toLowerCase();

    // Highway interchanges and major routes have more traffic
    if (
      locationLower.includes('interchange') ||
      locationLower.includes('junction')
    ) {
      return 1.5 + Math.random() * 0.5; // 1.5-2x multiplier
    }

    if (
      locationLower.includes('freeway') ||
      locationLower.includes('highway')
    ) {
      return 1.2 + Math.random() * 0.3; // 1.2-1.5x multiplier
    }

    return 0.8 + Math.random() * 0.4; // 0.8-1.2x multiplier
  }

  // Get random vehicle type
  private getRandomVehicleType(): 'car' | 'truck' | 'motorcycle' | 'bus' {
    const rand = Math.random();
    if (rand < 0.7) {return 'car';}
    if (rand < 0.85) {return 'truck';}
    if (rand < 0.95) {return 'motorcycle';}
    return 'bus';
  }
}

const trafficDensityService = new TrafficDensityService();
export default trafficDensityService;
