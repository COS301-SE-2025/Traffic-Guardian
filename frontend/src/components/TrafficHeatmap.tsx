// Traffic Density Visualization Component
import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';
import { HeatmapPoint } from '../services/trafficDensityService';

declare global {
  namespace L {
    function heatLayer(
      latlngs: [number, number, number][],
      options?: any,
    ): any;
  }
}

interface TrafficHeatmapProps {
  data: HeatmapPoint[];
  visible: boolean;
  opacity: number;
  options?: {
    radius?: number;
    blur?: number;
    intensityMultiplier?: number;
  };
}

const TrafficHeatmap: React.FC<TrafficHeatmapProps> = ({
  data,
  visible,
  opacity,
  options = {},
}) => {
  const map = useMap();
  const heatLayerRef = useRef<any>(null);

  useEffect(() => {
    // Remove existing heat layer
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }

    if (!visible || data.length === 0) {
      return;
    }

    // Convert data to leaflet.heat format: [lat, lng, intensity]
    const heatData: [number, number, number][] = data.map(point => {
      return [point.lat, point.lng, point.intensity];
    });

    // Create heat layer with updated options
    const heatLayer = L.heatLayer(heatData, {
      radius: options.radius || 100,
      blur: options.blur || 20,
      maxZoom: 18,
    });

    // Add to map and set opacity
    (heatLayer as any).addTo(map);
    if ((heatLayer as any).setOpacity) {
      (heatLayer as any).setOpacity(opacity);
    }
    heatLayerRef.current = heatLayer;

    // Cleanup function
    return () => {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
    };
  }, [data, visible, options.radius, options.blur, map]);

  // Update opacity when it changes
  useEffect(() => {
    if (heatLayerRef.current && (heatLayerRef.current as any).setOpacity) {
      (heatLayerRef.current as any).setOpacity(opacity);
    }
  }, [opacity]);

  return null; // This component doesn't render anything directly
};

export default TrafficHeatmap;
