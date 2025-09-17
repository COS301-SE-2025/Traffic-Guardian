// Traffic Density Heatmap Component
import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';
import { HeatmapPoint } from '../services/trafficDensityService';

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

  const { radius = 60, blur = 25, intensityMultiplier = 3.0 } = options;

  useEffect(() => {
    if (!visible) {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
      return;
    }

    // Prepare heatmap data: [lat, lng, intensity]
    const heatmapData: [number, number, number][] = data.map(point => [
      point.lat,
      point.lng,
      point.intensity * intensityMultiplier,
    ]);

    console.log(
      `🔥 Heatmap rendering ${heatmapData.length} points with config:`,
      {
        radius,
        blur,
        intensityMultiplier,
        opacity,
        visible,
        samplePoints: heatmapData.slice(0, 3),
      }
    );

    // Remove existing layer
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
    }

    // Create new heatmap layer with custom gradient
    const heatLayer = L.heatLayer(heatmapData, {
      radius: radius,
      blur: blur,
      maxZoom: 18,
      max: 1.0,
      minOpacity: 0.6, // Increased minimum opacity for better visibility
      gradient: {
        0.0: 'rgba(0,255,0,0.9)', // Green - low traffic (more opaque)
        0.2: 'rgba(255,255,0,0.9)', // Yellow - moderate traffic
        0.4: 'rgba(255,165,0,1.0)', // Orange - high traffic
        0.6: 'rgba(255,69,0,1.0)', // Orange-red - very high traffic
        0.8: 'rgba(255,0,0,1.0)', // Red - critical traffic
        1.0: 'rgba(139,0,0,1.0)', // Dark red - extreme risk
      },
    });

    // Set opacity and add to map
    map.addLayer(heatLayer);
    heatLayerRef.current = heatLayer;

    // Force opacity update if supported
    if (
      (heatLayer as any).setOpacity &&
      typeof (heatLayer as any).setOpacity === 'function'
    ) {
      (heatLayer as any).setOpacity(opacity);
      console.log(`🎭 Heatmap opacity set to: ${opacity}`);
    } else {
      console.log(`⚠️ Heatmap layer does not support opacity control`);
    }

    // Cleanup function
    return () => {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
    };
  }, [data, visible, opacity, radius, blur, intensityMultiplier, map]);

  // Force opacity update when opacity changes
  useEffect(() => {
    if (heatLayerRef.current && visible) {
      if (
        (heatLayerRef.current as any).setOpacity &&
        typeof (heatLayerRef.current as any).setOpacity === 'function'
      ) {
        (heatLayerRef.current as any).setOpacity(opacity);
        console.log(`🎭 Opacity updated to: ${opacity}`);
      }
    }
  }, [opacity, visible]);

  return null; // This component doesn't render anything directly
};

export default TrafficHeatmap;
