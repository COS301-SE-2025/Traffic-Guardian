// Type definitions for leaflet.heat
declare module 'leaflet.heat' {
  export {};
}

declare module 'leaflet' {
  interface HeatLayerOptions {
    radius?: number;
    blur?: number;
    maxZoom?: number;
    max?: number;
    minOpacity?: number;
    gradient?: { [key: number]: string };
  }

  function heatLayer(
    latlngs: [number, number, number][],
    options?: HeatLayerOptions
  ): Layer;
}