// Traffic Density Service
// Processes object detection data and generates heatmap points for traffic visualization

export interface DetectionData {
  cameraId: string;
  timestamp: Date;
  vehicles: VehicleDetection[];
  coordinates: {
    lat: number;
    lng: number;
  };
}

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
    LOW: 5,      // 1-5 vehicles
    MEDIUM: 10,  // 6-10 vehicles
    HIGH: 15,    // 11-15 vehicles
    CRITICAL: 20 // 16+ vehicles (high accident risk)
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
      history.filter(data => data.timestamp > thirtyMinutesAgo)
    );

    // Calculate traffic density
    const vehicleCount = vehicles.length;
    const intensity = Math.min(vehicleCount / this.THRESHOLDS.CRITICAL, 1);
    const riskLevel = this.calculateRiskLevel(vehicleCount);

    // Create heatmap point
    const heatmapPoint: HeatmapPoint = {
      lat: coordinates.lat,
      lng: coordinates.lng,
      intensity,
      timestamp,
      vehicleCount,
      riskLevel
    };

    // Debug logging
    console.log(`🚗 Camera ${cameraId}: ${vehicleCount} vehicles at [${coordinates.lat.toFixed(4)}, ${coordinates.lng.toFixed(4)}], intensity: ${intensity.toFixed(2)}, risk: ${riskLevel}`);

    // Update heatmap data
    this.updateHeatmapData(cameraId, heatmapPoint);

    return heatmapPoint;
  }

  // Calculate risk level based on vehicle count
  private calculateRiskLevel(vehicleCount: number): 'low' | 'medium' | 'high' | 'critical' {
    if (vehicleCount <= this.THRESHOLDS.LOW) return 'low';
    if (vehicleCount <= this.THRESHOLDS.MEDIUM) return 'medium';
    if (vehicleCount <= this.THRESHOLDS.HIGH) return 'high';
    return 'critical';
  }

  // Update heatmap data for a specific camera
  private updateHeatmapData(cameraId: string, newPoint: HeatmapPoint): void {
    // Remove old data for this camera
    this.heatmapData = this.heatmapData.filter(
      point => !this.isNearLocation(point, newPoint, 0.001) // ~100m tolerance
    );

    // Add new point
    this.heatmapData.push(newPoint);

    // Clean old data (older than 15 minutes)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    this.heatmapData = this.heatmapData.filter(
      point => point.timestamp > fifteenMinutesAgo
    );

    // Notify subscribers
    console.log(`📡 Notifying ${this.updateCallbacks.length} subscribers with ${this.heatmapData.length} heatmap points`);
    this.updateCallbacks.forEach(callback => callback(this.heatmapData));
  }

  // Check if two points are near each other
  private isNearLocation(point1: HeatmapPoint, point2: HeatmapPoint, tolerance: number): boolean {
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
    const totalVehicles = this.heatmapData.reduce((sum, point) => sum + point.vehicleCount, 0);
    const averageIntensity = this.heatmapData.length > 0
      ? this.heatmapData.reduce((sum, point) => sum + point.intensity, 0) / this.heatmapData.length
      : 0;
    const peakIntensity = this.heatmapData.length > 0
      ? Math.max(...this.heatmapData.map(point => point.intensity))
      : 0;

    const riskAreas = this.heatmapData.filter(point =>
      point.riskLevel === 'high' || point.riskLevel === 'critical'
    );

    return {
      totalVehicles,
      averageIntensity,
      peakIntensity,
      riskAreas,
      timestamp: new Date()
    };
  }

  // Simulate object detection data for demo purposes
  // In production, this would come from your ML model
  generateSimulatedData(cameraFeeds: any[]): void {
    console.log(`🎬 Processing ${cameraFeeds.length} camera feeds for traffic simulation`);

    cameraFeeds.forEach(camera => {
      console.log(`📹 Camera ${camera.id}: status=${camera.status}, hasCoords=${!!camera.coordinates}`);

      // Generate traffic for all cameras with coordinates, regardless of status
      if (camera.coordinates) {
        // Simulate variable traffic based on time and location
        const baseVehicleCount = this.getTimeBasedTrafficCount();
        const locationMultiplier = this.getLocationTrafficMultiplier(camera.location);
        const vehicleCount = Math.max(1, Math.floor(baseVehicleCount * locationMultiplier));

        // Generate mock vehicle detections
        const vehicles: VehicleDetection[] = Array.from({ length: vehicleCount }, (_, i) => ({
          id: `vehicle_${camera.id}_${i}`,
          type: this.getRandomVehicleType(),
          confidence: 0.8 + Math.random() * 0.2,
          bbox: {
            x: Math.random() * 640,
            y: Math.random() * 480,
            width: 50 + Math.random() * 100,
            height: 30 + Math.random() * 60
          }
        }));

        const detectionData: DetectionData = {
          cameraId: camera.id,
          timestamp: new Date(),
          vehicles,
          coordinates: camera.coordinates
        };

        this.processDetectionData(detectionData);
      } else {
        console.log(`⚠️ Skipping camera ${camera.id}: no coordinates`);
      }
    });

    console.log(`📊 Total heatmap points after simulation: ${this.heatmapData.length}`);

    // If no cameras generated traffic, create some test data for demonstration
    if (this.heatmapData.length === 0 && cameraFeeds.length > 0) {
      console.log(`🏠 No traffic generated, creating test data...`);
      this.createTestHeatmapData(cameraFeeds);
    }
  }

  // Create test heatmap data for demonstration
  private createTestHeatmapData(cameraFeeds: any[]): void {
    const testPoints = [
      { lat: 33.6846, lng: -117.8265, vehicles: 15 }, // Orange County center
      { lat: 33.7175, lng: -117.8311, vehicles: 22 }, // North OC
      { lat: 33.6478, lng: -117.8426, vehicles: 8 },  // South OC
      { lat: 33.6920, lng: -117.7910, vehicles: 18 }, // East OC
      { lat: 33.6773, lng: -117.8620, vehicles: 12 }, // West OC
    ];

    testPoints.forEach((point, index) => {
      const intensity = Math.min(point.vehicles / this.THRESHOLDS.CRITICAL, 1);
      const riskLevel = this.calculateRiskLevel(point.vehicles);

      const heatmapPoint: HeatmapPoint = {
        lat: point.lat,
        lng: point.lng,
        intensity,
        timestamp: new Date(),
        vehicleCount: point.vehicles,
        riskLevel
      };

      this.heatmapData.push(heatmapPoint);
      console.log(`🟡 Test point ${index + 1}: ${point.vehicles} vehicles at [${point.lat}, ${point.lng}], intensity: ${intensity.toFixed(2)}`);
    });

    // Notify subscribers of test data
    console.log(`📡 Notifying ${this.updateCallbacks.length} subscribers with ${this.heatmapData.length} test heatmap points`);
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
    if (locationLower.includes('interchange') || locationLower.includes('junction')) {
      return 1.5 + Math.random() * 0.5; // 1.5-2x multiplier
    }

    if (locationLower.includes('freeway') || locationLower.includes('highway')) {
      return 1.2 + Math.random() * 0.3; // 1.2-1.5x multiplier
    }

    return 0.8 + Math.random() * 0.4; // 0.8-1.2x multiplier
  }

  // Get random vehicle type
  private getRandomVehicleType(): 'car' | 'truck' | 'motorcycle' | 'bus' {
    const rand = Math.random();
    if (rand < 0.7) return 'car';
    if (rand < 0.85) return 'truck';
    if (rand < 0.95) return 'motorcycle';
    return 'bus';
  }
}

export default new TrafficDensityService();