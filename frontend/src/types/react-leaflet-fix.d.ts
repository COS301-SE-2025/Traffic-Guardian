// Temporary type fixes for react-leaflet compatibility issues
declare module 'react-leaflet' {
  import { ComponentType } from 'react';

  export interface MapContainerProps {
    center?: [number, number];
    zoom?: number;
    className?: string;
    children?: React.ReactNode;
    style?: React.CSSProperties;
    [key: string]: any;
  }

  export interface TileLayerProps {
    url?: string;
    attribution?: string;
    opacity?: number;
    zIndex?: number;
    [key: string]: any;
  }

  export interface MarkerProps {
    position?: [number, number];
    icon?: any;
    eventHandlers?: any;
    children?: React.ReactNode;
    [key: string]: any;
  }

  export interface PopupProps {
    children?: React.ReactNode;
    [key: string]: any;
  }

  export const MapContainer: ComponentType<MapContainerProps>;
  export const TileLayer: ComponentType<TileLayerProps>;
  export const Marker: ComponentType<MarkerProps>;
  export const Popup: ComponentType<PopupProps>;
  export const useMap: () => any;
}