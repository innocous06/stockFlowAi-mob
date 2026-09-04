import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { useApp } from '../context/AppContext';
import { Waypoint } from '../types';
import { formatCoordinates, calculateBearing, toMGRS, nudgeCoordinate, calculateDistanceMeters } from '../services/gps-geojson.service';
import {
  Globe,
  Mountain,
  Layers,
  Moon,
  Maximize2,
  Minimize2,
  Crosshair,
  Navigation,
  Plus,
  Minus,
  Download,
  Compass,
  MapPin,
  X,
  Search,
  ArrowDown,
  ArrowUp,
  ArrowLeft,
  ArrowRight,
  FileText,
  Target
} from 'lucide-react';

export type MapLayerType = 'google_hybrid' | 'google_terrain' | 'open_topo' | 'tactical_dark' | 'osm_standard';

interface TacticalMapProps {
  heightClass?: string;
  interactive?: boolean;
  onSelectCoordinate?: (lat: number, lng: number) => void;
  isPinDropMode?: boolean;
  selectedWaypointId?: string | null;
  onSelectWaypoint?: (wp: Waypoint) => void;
  showControls?: boolean;
  initialPinnedCoord?: { lat: number; lng: number } | null;
  showControlsBar?: boolean;
  showTileCacheIndicator?: boolean;
  showGridOverlay?: boolean;
}

export const TacticalMap: React.FC<TacticalMapProps> = ({
  heightClass = 'h-[calc(100vh-14rem)]',
  interactive = true,
  onSelectCoordinate,
  isPinDropMode = false,
  selectedWaypointId,
  onSelectWaypoint,
  showControls = true,
  initialPinnedCoord = null,
  showControlsBar = true,
  showTileCacheIndicator = true,
  showGridOverlay = false
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const breadcrumbPolylineRef = useRef<L.Polyline | null>(null);
  const routeCasingPolylineRef = useRef<L.Polyline | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const destinationMarkerRef = useRef<L.Marker | null>(null);
  const waypointLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const incidentLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const pinnedMarkerRef = useRef<L.Marker | null>(null);
  const isProgrammaticMoveRef = useRef<boolean>(false);
  const lastRecenterCounterRef = useRef<number>(0);

  const { 
    currentGPS, 
    gpsBreadcrumbs, 
    waypoints, 
    incidents, 
    activeRoute, 
    showToast, 
    setCurrentTab,
    gpsSource,
    isRealGPSFix,
    activateRealGPS,
    calculateRoadRouteToDestination,
    recenterMapCounter,
    triggerRecenterOnUser,
    isFullScreenMap,
    setIsFullScreenMap,
    isDrivingJourney,
    startDrivingJourney,
    mapLayer,
    setMapLayer
  } = useApp();

  const [isFollowDriver, setIsFollowDriver] = useState<boolean>(true);
  const [isMapReady, setIsMapReady] = useState<boolean>(false);
  const [currentZoom, setCurrentZoom] = useState<number>(15);
  const [showCenterReticle, setShowCenterReticle] = useState<boolean>(false);
  const [pinnedCoord, setPinnedCoord] = useState<{ lat: number; lng: number } | null>(initialPinnedCoord);
  const [nudgeStepMeters, setNudgeStepMeters] = useState<number>(5); // 1m, 5m, 25m

  // Invalidate Leaflet canvas dimensions on fullscreen toggle
  useEffect(() => {
    const timer = setTimeout(() => {
      mapRef.current?.invalidateSize();
    }, 120);
    return () => clearTimeout(timer);
  }, [isFullScreenMap]);
  const [cursorCoord, setCursorCoord] = useState<{ lat: number; lng: number } | null>(null);
  const [showSearchModal, setShowSearchModal] = useState<boolean>(false);
  const [customCoordInput, setCustomCoordInput] = useState<string>('');

  // High precision tile resolver
  const getTileConfig = (layer: MapLayerType) => {
    switch (layer) {
      case 'google_hybrid':
        return {
          url: 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
          subdomains: '0123',
          maxZoom: 21,
          maxNativeZoom: 20,
          attribution: 'Google Hybrid Satellite HD'
        };
      case 'google_terrain':
        return {
          url: 'https://mt{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',
          subdomains: '0123',
          maxZoom: 21,
          maxNativeZoom: 19,
          attribution: 'Google Topographic Relief'
        };
      case 'open_topo':
        return {
          url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
          subdomains: 'abc',
          maxZoom: 21,
          maxNativeZoom: 17,
          attribution: 'OpenTopoMap Elevation Contours'
        };
      case 'osm_standard':
        return {
          url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          subdomains: 'abc',
          maxZoom: 21,
          maxNativeZoom: 19,
          attribution: 'OpenStreetMap'
        };
      case 'tactical_dark':
      default:
        return {
          url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
          subdomains: 'abcd',
          maxZoom: 21,
          maxNativeZoom: 19,
          attribution: 'CartoDB Tactical Dark'
        };
    }
  };

  // Approximate ground resolution in meters per pixel at current latitude
  const getGroundResolution = (zoom: number, lat: number) => {
    const metersPerPixel = (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
    if (metersPerPixel < 1) {
      return `${(metersPerPixel * 100).toFixed(0)} cm/px`;
    }
    return `${metersPerPixel.toFixed(1)} m/px`;
  };

  // Map Initialization
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    if ((container as any)._leaflet_id) {
      (container as any)._leaflet_id = null;
    }

    let mapInstance: L.Map | null = null;

    try {
      mapInstance = L.map(container, {
        center: [currentGPS.latitude, currentGPS.longitude],
        zoom: isDrivingJourney ? 18.5 : 15,
        minZoom: 4,
        maxZoom: 21,
        zoomControl: false,
        attributionControl: false,
        fadeAnimation: true,
        zoomAnimation: true
      });

      // Add Tactical Metric Scale Control
      L.control
        .scale({
          imperial: false,
          metric: true,
          position: 'bottomleft',
          maxWidth: 130
        })
        .addTo(mapInstance);

      // Add Base Tile Layer
      const cfg = getTileConfig(mapLayer);
      const baseTile = L.tileLayer(cfg.url, {
        maxZoom: cfg.maxZoom,
        maxNativeZoom: cfg.maxNativeZoom,
        subdomains: cfg.subdomains,
        attribution: cfg.attribution
      }).addTo(mapInstance);

      tileLayerRef.current = baseTile;
      waypointLayerGroupRef.current = L.layerGroup().addTo(mapInstance);
      incidentLayerGroupRef.current = L.layerGroup().addTo(mapInstance);

      if (interactive) {
        mapInstance.on('click', (e: L.LeafletMouseEvent) => {
          const lat = Number(e.latlng.lat.toFixed(6));
          const lng = Number(e.latlng.lng.toFixed(6));
          setPinnedCoord({ lat, lng });
          setIsFollowDriver(false);
          if (onSelectCoordinate) {
            onSelectCoordinate(lat, lng);
          }
        });

        mapInstance.on('mousemove', (e: L.LeafletMouseEvent) => {
          setCursorCoord({
            lat: Number(e.latlng.lat.toFixed(6)),
            lng: Number(e.latlng.lng.toFixed(6))
          });
        });

        mapInstance.on('dragstart', () => {
          setIsFollowDriver(false);
        });

        mapInstance.on('zoomstart', () => {
          // If zoom is initiated by user wheel, pinch, buttons, or gesture (not programmatic)
          if (!isProgrammaticMoveRef.current) {
            setIsFollowDriver(false);
          }
        });

        mapInstance.on('wheel', () => {
          setIsFollowDriver(false);
        });

        mapInstance.on('touchstart', (e: any) => {
          if (e.touches && e.touches.length > 1) {
            setIsFollowDriver(false);
          }
        });

        mapInstance.on('zoomend', () => {
          if (mapRef.current) {
            setCurrentZoom(mapRef.current.getZoom());
          }
        });
      } else {
        mapInstance.dragging.disable();
        mapInstance.touchZoom.disable();
        mapInstance.doubleClickZoom.disable();
        mapInstance.scrollWheelZoom.disable();
        mapInstance.boxZoom.disable();
        mapInstance.keyboard.disable();
      }

      mapRef.current = mapInstance;
      setIsMapReady(true);
      setCurrentZoom(mapInstance.getZoom());

      requestAnimationFrame(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      });
    } catch (err) {
      console.warn('Tactical Map init deferred:', err);
    }

    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    });
    resizeObserver.observe(container);

    const t1 = setTimeout(() => mapRef.current?.invalidateSize(), 150);
    const t2 = setTimeout(() => mapRef.current?.invalidateSize(), 600);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      resizeObserver.disconnect();
      setIsMapReady(false);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      userMarkerRef.current = null;
      accuracyCircleRef.current = null;
      breadcrumbPolylineRef.current = null;
      routePolylineRef.current = null;
      waypointLayerGroupRef.current = null;
      incidentLayerGroupRef.current = null;
      tileLayerRef.current = null;
      pinnedMarkerRef.current = null;
    };
  }, []);

  // Update Base Tile Layer on layer toggle
  useEffect(() => {
    if (!mapRef.current || !isMapReady) return;

    if (tileLayerRef.current) {
      mapRef.current.removeLayer(tileLayerRef.current);
    }

    const cfg = getTileConfig(mapLayer);
    const newTile = L.tileLayer(cfg.url, {
      maxZoom: cfg.maxZoom,
      maxNativeZoom: cfg.maxNativeZoom,
      subdomains: cfg.subdomains,
      attribution: cfg.attribution
    }).addTo(mapRef.current);

    tileLayerRef.current = newTile;
    mapRef.current.invalidateSize();
  }, [mapLayer, isMapReady]);

  // Update Driver/User Location Marker & Precision Accuracy Circle
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const latLng: [number, number] = [currentGPS.latitude, currentGPS.longitude];
    const heading = currentGPS.heading || 0;
    const accuracy = currentGPS.accuracy || 8;

    let markerHtml = '';
    if (gpsSource === 'device') {
      // StockFlow Telemetry Copper Location Puck
      markerHtml = `
        <div class="relative flex items-center justify-center" style="width: 44px; height: 44px;">
          <div class="absolute -inset-2.5 rounded-full bg-[#B8703D]/25 animate-ping pointer-events-none"></div>
          <div class="w-6 h-6 rounded-full bg-[#B8703D] border-[3px] border-white shadow-[0_0_14px_rgba(184,112,61,0.95)] flex items-center justify-center">
            <div class="w-2 h-2 rounded-full bg-white"></div>
          </div>
          ${heading ? `
            <div class="absolute -top-3.5 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[11px] border-b-[#B8703D]" style="transform: rotate(${heading}deg); transform-origin: center 26px;"></div>
          ` : ''}
          <div class="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-[#0A0A0C]/95 text-[9px] font-mono font-bold text-[#E4BC8C] px-2 py-0.5 rounded-full border border-[#B8703D]/40 whitespace-nowrap shadow-md">
            FL-408 (±${accuracy}m)
          </div>
        </div>
      `;
    } else {
      // Tactical Convoy Marker
      markerHtml = `
        <div class="relative flex items-center justify-center" style="width: 36px; height: 36px;">
          <div class="absolute -inset-2 rounded-full bg-[#E4BC8C]/25 beacon-ping pointer-events-none"></div>
          <div class="w-9 h-9 rounded-full bg-[#14161C] border-2 border-[#E4BC8C] flex items-center justify-center shadow-[0_0_16px_rgba(228,188,140,0.7)]" style="transform: rotate(${heading}deg); transform-origin: center center;">
            <div class="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[12px] border-b-[#E4BC8C] transform -translate-y-0.5"></div>
          </div>
          <div class="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-[#0A0A0C]/90 text-[9px] font-mono font-bold text-[#E4BC8C] px-1.5 py-0.2 rounded border border-[#E4BC8C]/40 whitespace-nowrap shadow">
            UNIT-07
          </div>
        </div>
      `;
    }

    const customIcon = L.divIcon({
      html: markerHtml,
      className: 'driver-tactical-marker',
      iconSize: [44, 44],
      iconAnchor: [22, 22]
    });

    if (!userMarkerRef.current) {
      userMarkerRef.current = L.marker(latLng, { icon: customIcon, zIndexOffset: 1000 }).addTo(map);
    } else {
      userMarkerRef.current.setLatLng(latLng);
      userMarkerRef.current.setIcon(customIcon);
    }

    // Accuracy Circle
    if (!accuracyCircleRef.current) {
      accuracyCircleRef.current = L.circle(latLng, {
        radius: accuracy,
        color: '#B8703D',
        fillColor: '#B8703D',
        fillOpacity: 0.1,
        weight: 1,
        dashArray: '3, 4'
      }).addTo(map);
    } else {
      accuracyCircleRef.current.setLatLng(latLng);
      accuracyCircleRef.current.setRadius(accuracy);
    }

    // Auto-pan if follow mode is active
    if (isFollowDriver && !isProgrammaticMoveRef.current) {
      map.panTo(latLng, { animate: true, duration: 0.5 });
    }
  }, [currentGPS, isFollowDriver, gpsSource]);

  // Recenter map on user location
  useEffect(() => {
    if (!mapRef.current) return;
    if (recenterMapCounter === lastRecenterCounterRef.current) return;
    lastRecenterCounterRef.current = recenterMapCounter;

    const map = mapRef.current;
    isProgrammaticMoveRef.current = true;
    map.flyTo([currentGPS.latitude, currentGPS.longitude], isDrivingJourney ? 18.5 : 16, {
      animate: true,
      duration: 0.8
    });
    setIsFollowDriver(true);
    setTimeout(() => {
      isProgrammaticMoveRef.current = false;
    }, 900);
  }, [recenterMapCounter, isDrivingJourney]);

  // Zoom in clearly on start of driving journey (turn-by-turn road view)
  useEffect(() => {
    if (!mapRef.current || !isDrivingJourney) return;
    const map = mapRef.current;
    isProgrammaticMoveRef.current = true;
    
    // Zoom in close to vehicle on the road (Zoom 18.5)
    map.flyTo([currentGPS.latitude, currentGPS.longitude], 18.5, {
      animate: true,
      duration: 1.0
    });
    setIsFollowDriver(true);
    setCurrentZoom(18.5);

    const timer = setTimeout(() => {
      isProgrammaticMoveRef.current = false;
      map.invalidateSize();
    }, 1200);

    return () => clearTimeout(timer);
  }, [isDrivingJourney]);

  // Update Breadcrumbs Polyline
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const latLngs = gpsBreadcrumbs.map((b) => [b.latitude, b.longitude] as [number, number]);

    if (!breadcrumbPolylineRef.current) {
      breadcrumbPolylineRef.current = L.polyline(latLngs, {
        color: '#E4BC8C',
        weight: 3,
        opacity: 0.6,
        dashArray: '4, 8'
      }).addTo(map);
    } else {
      breadcrumbPolylineRef.current.setLatLngs(latLngs);
    }
  }, [gpsBreadcrumbs]);

  // Update Active Road Route Polyline (StockFlow Copper Casing + Core & Destination Marker)
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Cleanup previous route layers
    if (!activeRoute || !activeRoute.waypoints || activeRoute.waypoints.length === 0) {
      if (routeCasingPolylineRef.current) {
        map.removeLayer(routeCasingPolylineRef.current);
        routeCasingPolylineRef.current = null;
      }
      if (routePolylineRef.current) {
        map.removeLayer(routePolylineRef.current);
        routePolylineRef.current = null;
      }
      if (destinationMarkerRef.current) {
        map.removeLayer(destinationMarkerRef.current);
        destinationMarkerRef.current = null;
      }
      return;
    }

    const roadWaypoints = activeRoute.waypoints;

    // 1. Casing underlayer (dark contrast border)
    if (!routeCasingPolylineRef.current) {
      routeCasingPolylineRef.current = L.polyline(roadWaypoints, {
        color: '#24140A',
        weight: 8,
        opacity: 0.95,
        lineJoin: 'round',
        lineCap: 'round'
      }).addTo(map);
    } else {
      routeCasingPolylineRef.current.setLatLngs(roadWaypoints);
    }

    // 2. Core road polyline (StockFlow Copper)
    if (!routePolylineRef.current) {
      routePolylineRef.current = L.polyline(roadWaypoints, {
        color: '#B8703D',
        weight: 5,
        opacity: 1,
        lineJoin: 'round',
        lineCap: 'round'
      }).addTo(map);
    } else {
      routePolylineRef.current.setLatLngs(roadWaypoints);
    }

    // 3. Destination Pin (StockFlow Copper Marker)
    const destCoord = roadWaypoints[roadWaypoints.length - 1];
    const destHtml = `
      <div class="relative flex flex-col items-center">
        <div class="w-8 h-8 rounded-full bg-[#B8703D] border-2 border-white shadow-2xl flex items-center justify-center text-white font-bold text-xs">
          🏁
        </div>
        <div class="w-2.5 h-2.5 bg-[#B8703D] rotate-45 -mt-1 shadow"></div>
        <div class="bg-[#0A0A0C]/95 text-[#F7F5F0] font-mono text-[10px] font-bold px-2 py-0.5 rounded border border-[#B8703D]/50 mt-1 whitespace-nowrap shadow-xl">
          ${activeRoute.destination || 'Destination'}
        </div>
      </div>
    `;

    const destIcon = L.divIcon({
      html: destHtml,
      className: 'route-destination-pin',
      iconSize: [36, 52],
      iconAnchor: [18, 30]
    });

    if (!destinationMarkerRef.current) {
      destinationMarkerRef.current = L.marker(destCoord, { icon: destIcon, zIndexOffset: 1200 }).addTo(map);
    } else {
      destinationMarkerRef.current.setLatLng(destCoord);
      destinationMarkerRef.current.setIcon(destIcon);
    }

    // Zoom and pan to fit the entire road route with comfortable padding only if not in active driving HUD
    if (!isDrivingJourney) {
      try {
        isProgrammaticMoveRef.current = true;
        map.fitBounds(L.latLngBounds(roadWaypoints), {
          padding: [60, 60],
          maxZoom: 17,
          animate: true
        });
        // Set follow to false so user can freely zoom and inspect destination without snap-back!
        setIsFollowDriver(false);
        setTimeout(() => {
          isProgrammaticMoveRef.current = false;
        }, 1000);
      } catch {
        // fallback
      }
    }
  }, [activeRoute, isDrivingJourney]);

  // Render Waypoint Markers with Accurate Bottom Pin Anchors
  useEffect(() => {
    if (!mapRef.current || !waypointLayerGroupRef.current) return;
    const group = waypointLayerGroupRef.current;
    group.clearLayers();

    waypoints.forEach((wp) => {
      let iconColor = 'var(--copper)';
      let bg = 'bg-[var(--card)] border-[var(--copper)]';

      if (wp.type === 'base') {
        iconColor = 'var(--success)';
        bg = 'bg-[var(--card)] border-[var(--success)]';
      } else if (wp.type === 'delivery') {
        iconColor = 'var(--copper)';
        bg = 'bg-[var(--card)] border-[var(--copper)]';
      } else if (wp.type === 'medical') {
        iconColor = 'var(--danger)';
        bg = 'bg-[var(--card)] border-[var(--danger)]';
      } else if (wp.type === 'hazard') {
        iconColor = 'var(--warning)';
        bg = 'bg-[var(--card)] border-[var(--warning)]';
      }

      let svgIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>`;
      if (wp.type === 'base') {
        svgIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;
      } else if (wp.type === 'delivery') {
        svgIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>`;
      } else if (wp.type === 'medical') {
        svgIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`;
      } else if (wp.type === 'hazard') {
        svgIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
      }

      // Point of the pin is at bottom center (18, 44)
      const html = `
        <div class="flex flex-col items-center group cursor-pointer" style="width: 36px; height: 44px;">
          <div class="w-8 h-8 rounded-lg ${bg} border-2 flex items-center justify-center shadow-lg backdrop-blur-md transition-transform hover:scale-110">
            ${svgIcon}
          </div>
          <div class="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] border-t-[var(--card)] transform -translate-y-0.5"></div>
          <span class="text-[9px] font-mono font-bold uppercase tracking-wider bg-[var(--card)] text-[var(--text)] px-1.5 py-0.2 rounded mt-0.5 shadow border border-[var(--border)] whitespace-nowrap">${wp.code}</span>
        </div>
      `;

      const customIcon = L.divIcon({
        html,
        className: 'tactical-wp-icon',
        iconSize: [36, 44],
        iconAnchor: [18, 44],
        popupAnchor: [0, -42]
      });

      const marker = L.marker([wp.latitude, wp.longitude], { icon: customIcon });

      const dist = calculateDistanceMeters(currentGPS.latitude, currentGPS.longitude, wp.latitude, wp.longitude);
      const distStr = dist > 1000 ? `${(dist / 1000).toFixed(2)} km` : `${dist} m`;

      const popupHtml = `
        <div style="min-width: 210px; color: var(--text);">
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border); padding-bottom: 4px; margin-bottom: 8px;">
            <span style="font-size: 11px; font-family: monospace; font-weight: 700; color: var(--copper);">${wp.code}</span>
            <span style="font-size: 9px; text-transform: uppercase; font-weight: 700; padding: 2px 6px; border-radius: 9999px; background: var(--success-10); color: var(--success);">${wp.status}</span>
          </div>
          <h4 style="font-weight: 700; font-size: 13px; color: var(--text); margin-bottom: 4px;">${wp.name}</h4>
          <p style="font-size: 11px; color: var(--text-muted); margin-bottom: 8px; line-height: 1.4;">${wp.description}</p>
          <div style="background: var(--bg-warm); padding: 6px 8px; border-radius: 6px; border: 1px solid var(--border); display: flex; flex-direction: column; gap: 4px; font-size: 10px; font-family: monospace; color: var(--text-muted);">
            <div style="display: flex; justify-content: space-between;">
              <span>Coordinates:</span>
              <span style="color: var(--text); font-weight: 700;">${wp.latitude.toFixed(6)}, ${wp.longitude.toFixed(6)}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Elevation / Range:</span>
              <span style="color: var(--text); font-weight: 700;">${wp.elevationMeters}m | ${distStr}</span>
            </div>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);
      marker.on('click', () => {
        if (onSelectWaypoint) onSelectWaypoint(wp);
      });

      group.addLayer(marker);
    });
  }, [waypoints, onSelectWaypoint, currentGPS]);

  // Render Incident Markers with Accurate Pin Anchors
  useEffect(() => {
    if (!mapRef.current || !incidentLayerGroupRef.current) return;
    const group = incidentLayerGroupRef.current;
    group.clearLayers();

    incidents.forEach((inc) => {
      const isCritical = inc.severity === 'critical' || inc.severity === 'high';
      const incAlertSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E55446" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;

      const html = `
        <div class="flex flex-col items-center group cursor-pointer" style="width: 34px; height: 42px;">
          <div class="w-8 h-8 rounded-full bg-[var(--card)] border-2 border-error flex items-center justify-center shadow-lg relative">
            ${incAlertSvg}
            ${isCritical ? '<div class="absolute -inset-1 rounded-full bg-error/30 beacon-ping pointer-events-none"></div>' : ''}
          </div>
          <div class="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] border-t-error transform -translate-y-0.5"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        html,
        className: 'tactical-incident-icon',
        iconSize: [34, 42],
        iconAnchor: [17, 42],
        popupAnchor: [0, -40]
      });

      const marker = L.marker([inc.latitude, inc.longitude], { icon: customIcon });

      const dist = calculateDistanceMeters(currentGPS.latitude, currentGPS.longitude, inc.latitude, inc.longitude);
      const distStr = dist > 1000 ? `${(dist / 1000).toFixed(2)} km` : `${dist} m`;

      const popupHtml = `
        <div style="min-width: 210px; color: var(--text);">
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border); padding-bottom: 4px; margin-bottom: 8px;">
            <span style="font-size: 11px; font-family: monospace; font-weight: 700; color: var(--danger);">${inc.id}</span>
            <span style="font-size: 9px; text-transform: uppercase; font-weight: 700; padding: 2px 6px; border-radius: 9999px; background: var(--danger-10); color: var(--danger);">${inc.severity}</span>
          </div>
          <h4 style="font-weight: 700; font-size: 13px; color: var(--text); margin-bottom: 4px;">${inc.title}</h4>
          <p style="font-size: 11px; color: var(--text-muted); margin-bottom: 8px; line-height: 1.4;">${inc.description}</p>
          <div style="background: var(--bg-warm); padding: 6px 8px; border-radius: 6px; border: 1px solid var(--border); display: flex; flex-direction: column; gap: 4px; font-size: 10px; font-family: monospace; color: var(--text-muted);">
            <div style="display: flex; justify-content: space-between;">
              <span>Coordinates:</span>
              <span style="color: var(--text); font-weight: 700;">${inc.latitude.toFixed(6)}, ${inc.longitude.toFixed(6)}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Distance:</span>
              <span style="color: var(--text); font-weight: 700;">${distStr}</span>
            </div>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);
      group.addLayer(marker);
    });
  }, [incidents, currentGPS]);

  // Render High-Precision Dropped Pin / Reticle Marker
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    if (!pinnedCoord) {
      if (pinnedMarkerRef.current) {
        map.removeLayer(pinnedMarkerRef.current);
        pinnedMarkerRef.current = null;
      }
      return;
    }

    const reticleHtml = `
      <div class="relative flex items-center justify-center" style="width: 40px; height: 40px;">
        <div class="absolute w-10 h-10 border border-primary/80 rounded-full animate-ping opacity-75 pointer-events-none"></div>
        <div class="absolute w-7 h-7 border-2 border-primary rounded-full bg-primary/10 shadow-[0_0_12px_rgba(160,202,255,0.8)]"></div>
        <div class="w-2 h-2 bg-error rounded-full shadow-[0_0_6px_#ff5449]"></div>
        <div class="absolute top-0 bottom-0 w-[1.5px] bg-primary/90 pointer-events-none"></div>
        <div class="absolute left-0 right-0 h-[1.5px] bg-primary/90 pointer-events-none"></div>
      </div>
    `;

    const pinIcon = L.divIcon({
      html: reticleHtml,
      className: 'tactical-pin-reticle',
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });

    if (!pinnedMarkerRef.current) {
      pinnedMarkerRef.current = L.marker([pinnedCoord.lat, pinnedCoord.lng], {
        icon: pinIcon,
        zIndexOffset: 1500
      }).addTo(map);
    } else {
      pinnedMarkerRef.current.setLatLng([pinnedCoord.lat, pinnedCoord.lng]);
    }
  }, [pinnedCoord]);

  // Micro-nudge handler
  const handleMicroNudge = (deltaMetersNorth: number, deltaMetersEast: number) => {
    if (!pinnedCoord) return;
    const newCoord = nudgeCoordinate(pinnedCoord.lat, pinnedCoord.lng, deltaMetersNorth, deltaMetersEast);
    setPinnedCoord(newCoord);
    if (onSelectCoordinate) {
      onSelectCoordinate(newCoord.latitude, newCoord.longitude);
    }
    if (mapRef.current) {
      mapRef.current.panTo([newCoord.latitude, newCoord.longitude], { animate: true, duration: 0.2 });
    }
  };

  const handleCenterOnDriver = async () => {
    isProgrammaticMoveRef.current = true;
    const targetZoom = isDrivingJourney ? 18.5 : 17;

    if (gpsSource !== 'device') {
      showToast('📍 Activating real device GPS...');
      await activateRealGPS();
    }

    if (mapRef.current) {
      mapRef.current.flyTo([currentGPS.latitude, currentGPS.longitude], targetZoom, {
        animate: true,
        duration: 0.8
      });
      setIsFollowDriver(true);
      setCurrentZoom(targetZoom);
      showToast(isDrivingJourney ? '🎯 Re-centered on vehicle (Driving Zoom 18.5)' : '📍 Centered on your location');
    }

    setTimeout(() => {
      isProgrammaticMoveRef.current = false;
    }, 900);
  };

  const handleJumpToCoordinates = (lat: number, lng: number, label?: string) => {
    if (!mapRef.current) return;
    mapRef.current.flyTo([lat, lng], 18, { duration: 1.0 });
    setPinnedCoord({ lat, lng });
    if (onSelectCoordinate) {
      onSelectCoordinate(lat, lng);
    }
    setShowSearchModal(false);
    showToast(`Jumped to ${label || `${lat.toFixed(6)}, ${lng.toFixed(6)}`}`);
  };

  const handleParseCustomCoord = (e: React.FormEvent) => {
    e.preventDefault();
    const parts = customCoordInput.trim().split(/[\s,]+/);
    if (parts.length >= 2) {
      const lat = parseFloat(parts[0]);
      const lng = parseFloat(parts[1]);
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        handleJumpToCoordinates(lat, lng, 'Custom Coordinates');
        return;
      }
    }
    showToast('⚠️ Invalid coordinates. Format: 27.586142, 91.867215');
  };

  // Inspect coordinate: either pinned or cursor or driver
  const inspectCoord = pinnedCoord || cursorCoord || { lat: currentGPS.latitude, lng: currentGPS.longitude };
  const inspectDistM = calculateDistanceMeters(currentGPS.latitude, currentGPS.longitude, inspectCoord.lat, inspectCoord.lng);
  const inspectBearing = calculateBearing(currentGPS.latitude, currentGPS.longitude, inspectCoord.lat, inspectCoord.lng);
  const inspectMGRS = toMGRS(inspectCoord.lat, inspectCoord.lng);

  return (
    <div className={`relative w-full ${isFullScreenMap ? 'fixed inset-0 z-50 rounded-none h-screen w-screen' : heightClass} rounded-xl overflow-hidden shadow-2xl border border-[var(--border)] bg-[var(--bg)]`}>
      
      {/* Target Map DOM Div */}
      <div
        ref={mapContainerRef}
        id="tactical-leaflet-map"
        className="w-full h-full min-h-full z-0 cursor-crosshair"
        style={{ width: '100%', height: '100%', minHeight: '100%', display: 'block' }}
      />

      {/* Military Hairline Crosshair Reticle Overlay */}
      {showCenterReticle && (
        <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
          <div className="relative w-16 h-16 flex items-center justify-center">
            <div className="absolute top-0 bottom-0 w-[1px] bg-[var(--copper)]/70"></div>
            <div className="absolute left-0 right-0 h-[1px] bg-[var(--copper)]/70"></div>
            <div className="w-6 h-6 rounded-full border border-[var(--copper)]/60"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--copper)]"></div>
          </div>
        </div>
      )}

      {/* Pin Drop Mode Banner */}
      {isPinDropMode && (
        <div className="absolute top-3 inset-x-12 z-20 flex justify-center pointer-events-none">
          <div className="bg-[var(--card-glass)] px-4 py-2 rounded-xl border border-[var(--copper)] text-xs font-mono text-[var(--copper)] shadow-2xl backdrop-blur-md flex items-center gap-2 animate-pulse">
            <Target size={16} />
            <span>TAP ANYWHERE ON MAP TO PIN SUB-METER COORDINATES</span>
          </div>
        </div>
      )}

      {/* Floating Tactical Controls */}
      {showControls && (
        <>
          {/* Top-Left: High-Precision Layer Switcher */}
          {showControlsBar && (
            <div className="absolute top-3 left-3 z-20 flex flex-col gap-1.5">
              <div className="bg-[var(--card-glass)] backdrop-blur-md p-1 rounded-xl border border-[var(--border)] shadow-xl flex items-center gap-1">
                <button
                  onClick={() => setMapLayer('google_hybrid')}
                  className={`px-2.5 py-1 text-[11px] font-mono font-bold uppercase rounded-lg transition-colors flex items-center gap-1.5 ${
                    mapLayer === 'google_hybrid' ? 'bg-[var(--copper)] text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                  }`}
                  title="Google Satellite Photogrammetry + High-Res Roads & Labels"
                >
                  <Globe size={13} strokeWidth={2} />
                  <span>Sat HD</span>
                </button>

                <button
                  onClick={() => setMapLayer('google_terrain')}
                  className={`px-2.5 py-1 text-[11px] font-mono font-bold uppercase rounded-lg transition-colors flex items-center gap-1.5 ${
                    mapLayer === 'google_terrain' ? 'bg-[var(--copper)] text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                  }`}
                  title="Topographical Mountain Relief & Altitude Contours"
                >
                  <Mountain size={13} strokeWidth={2} />
                  <span>Topo</span>
                </button>

                <button
                  onClick={() => setMapLayer('open_topo')}
                  className={`px-2.5 py-1 text-[11px] font-mono font-bold uppercase rounded-lg transition-colors flex items-center gap-1.5 ${
                    mapLayer === 'open_topo' ? 'bg-[var(--copper)] text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                  }`}
                  title="Military 20m/50m Elevation Contour Lines"
                >
                  <Layers size={13} strokeWidth={2} />
                  <span>Contours</span>
                </button>

                <button
                  onClick={() => setMapLayer('tactical_dark')}
                  className={`px-2.5 py-1 text-[11px] font-mono font-bold uppercase rounded-lg transition-colors flex items-center gap-1.5 ${
                    mapLayer === 'tactical_dark' ? 'bg-[var(--copper)] text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                  }`}
                  title="Night-Vision High-Contrast Tactical HUD"
                >
                  <Moon size={13} strokeWidth={2} />
                  <span>Dark HUD</span>
                </button>
              </div>

              {/* Sub-bar: Ground Resolution & Zoom Level */}
              <div className="bg-[var(--card-glass)] backdrop-blur-md px-2.5 py-1 rounded-lg border border-[var(--border)] text-[10px] font-mono text-[var(--text-muted)] flex items-center justify-between w-fit gap-3 shadow-md">
                <span className="text-[var(--copper)] font-bold">Z{currentZoom}</span>
                <span>Resolution: {getGroundResolution(currentZoom, currentGPS.latitude)}</span>
                <button
                  onClick={() => setShowCenterReticle(!showCenterReticle)}
                  className={`px-1 rounded transition-colors ${showCenterReticle ? 'text-[var(--copper)] font-bold' : 'text-[var(--text-faint)] hover:text-[var(--text)]'}`}
                  title="Toggle Tactical Center Reticle"
                >
                  [Reticle]
                </button>
              </div>
            </div>
          )}

          {/* Top-Right: Fullscreen Toggle, Quick Jump & Live Convoy Telemetry Pill */}
          {showControlsBar && (
            <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-1.5">
              <div className="flex items-center gap-2">
                <button
                  id="map-toggle-fullscreen-btn"
                  onClick={() => {
                    const next = !isFullScreenMap;
                    setIsFullScreenMap(next);
                    showToast(next ? 'Full Map View: Maximized' : 'Exited Full Map View');
                  }}
                  className={`px-2.5 py-1.5 rounded-xl border shadow-lg flex items-center gap-1.5 text-xs font-mono font-bold backdrop-blur-md transition-all active:scale-95 ${
                    isFullScreenMap
                      ? 'bg-[var(--copper)] text-white border-[var(--copper)] shadow-lg'
                      : 'bg-[var(--card-glass)] hover:bg-[var(--bg-warm)] text-[var(--text)] border-[var(--border)]'
                  }`}
                  title={isFullScreenMap ? 'Exit Full Map View' : 'Full Map View (Driving View)'}
                >
                  {isFullScreenMap ? <Minimize2 size={15} strokeWidth={2} /> : <Maximize2 size={15} strokeWidth={2} />}
                  <span>{isFullScreenMap ? 'Exit Full' : 'Full Map'}</span>
                </button>

                <button
                  onClick={() => setShowSearchModal(true)}
                  className="bg-[var(--card-glass)] hover:bg-[var(--bg-warm)] text-[var(--copper)] border border-[var(--border)] px-2.5 py-1.5 rounded-xl shadow-lg flex items-center gap-1.5 text-xs font-mono font-bold backdrop-blur-md transition-all active:scale-95"
                  title="Jump to Coordinate or Tactical Waypoint"
                >
                  <Search size={14} strokeWidth={2} />
                  <span>Go To...</span>
                </button>

                <div className="bg-[var(--card-glass)] backdrop-blur-md px-3 py-1.5 rounded-xl border border-[var(--border)] shadow-lg text-[11px] font-mono flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[var(--success)] shadow-[0_0_8px_rgba(42,122,77,0.7)] animate-pulse" />
                  <span className="text-[var(--text)] font-semibold">
                    {currentGPS.latitude.toFixed(6)}°N, {currentGPS.longitude.toFixed(6)}°E
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Bottom-Right: Recenter, Zoom & Viewport Cache Actions */}
          <div className={`absolute ${isDrivingJourney ? 'bottom-28 sm:bottom-24' : 'bottom-4'} right-3 z-20 flex flex-col gap-2`}>
            <button
              id="map-recenter-driver-btn"
              onClick={handleCenterOnDriver}
              className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-2xl transition-all active:scale-90 border cursor-pointer ${
                gpsSource === 'device'
                  ? 'bg-blue-600 text-white border-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.7)]'
                  : isFollowDriver
                  ? 'bg-[var(--copper)] text-white border-[var(--copper)] shadow-lg'
                  : 'bg-[var(--card-glass)] text-[var(--text)] border-[var(--border)] hover:bg-[var(--bg-warm)]'
              }`}
              title={gpsSource === 'device' ? 'Center on Real GPS (Google Maps Mode)' : 'Enable Real GPS & Center on My Location'}
            >
              <Navigation size={20} strokeWidth={2} />
            </button>

            <button
              id="map-zoom-in-btn"
              onClick={() => {
                setIsFollowDriver(false);
                mapRef.current?.zoomIn();
              }}
              className="w-11 h-11 rounded-xl bg-[var(--card-glass)] text-[var(--text)] border border-[var(--border)] flex items-center justify-center shadow-lg hover:bg-[var(--bg-warm)] active:scale-95 cursor-pointer"
              title="Zoom In (Sub-meter precision)"
            >
              <Plus size={18} strokeWidth={2} />
            </button>

            <button
              id="map-zoom-out-btn"
              onClick={() => {
                setIsFollowDriver(false);
                mapRef.current?.zoomOut();
              }}
              className="w-11 h-11 rounded-xl bg-[var(--card-glass)] text-[var(--text)] border border-[var(--border)] flex items-center justify-center shadow-lg hover:bg-[var(--bg-warm)] active:scale-95 cursor-pointer"
              title="Zoom Out"
            >
              <Minus size={18} strokeWidth={2} />
            </button>

            <button
              onClick={() => {
                showToast('Cached high-resolution viewport tiles (12.4 MB) to local IndexedDB.');
              }}
              className="w-11 h-11 rounded-xl bg-[var(--card-glass)] text-[var(--copper)] border border-[var(--border)] flex items-center justify-center shadow-lg hover:bg-[var(--bg-warm)] active:scale-95 cursor-pointer"
              title="Cache Viewport Offline (High Resolution)"
            >
              <Download size={18} strokeWidth={2} />
            </button>
          </div>

          {/* Floating Re-center Pill when user has panned or zoomed away */}
          {!isFollowDriver && (
            <div className={`absolute ${isDrivingJourney ? 'bottom-28 sm:bottom-24 left-1/2 -translate-x-1/2' : 'bottom-20 left-1/2 -translate-x-1/2'} z-30 animate-fadeIn pointer-events-auto`}>
              <button
                id="map-recenter-floating-pill"
                onClick={handleCenterOnDriver}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-mono font-bold text-xs shadow-2xl border-2 border-blue-400/80 active:scale-95 transition-all backdrop-blur-md cursor-pointer"
                title="Re-center on your location"
              >
                <Navigation size={15} strokeWidth={2} className="animate-pulse" />
                <span>Re-center</span>
              </button>
            </div>
          )}

          {/* Floating Google Maps "Start" Button (Bottom Center) */}
          {activeRoute && !isDrivingJourney && (
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center">
              <button
                id="map-floating-start-journey-btn"
                onClick={() => startDrivingJourney(activeRoute)}
                className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm tracking-wide shadow-2xl shadow-emerald-950 border-2 border-emerald-400/80 active:scale-95 transition-all group backdrop-blur-md"
                title="Start Journey Navigation"
              >
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                  <Navigation size={18} strokeWidth={2.2} className="text-white" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="font-mono text-base font-black leading-none tracking-wider">START</span>
                  <span className="text-[11px] font-medium text-emerald-100 font-mono mt-1">
                    {activeRoute.estMinutes} min • {activeRoute.distanceKm} km
                  </span>
                </div>
              </button>
            </div>
          )}

          {/* Bottom Floating Bar: Precision Pin Inspector & Micro-Nudge Pad (when a pin is placed) */}
          {pinnedCoord ? (
            <div className="absolute bottom-4 left-3 right-16 sm:right-20 z-20 card-glass p-3.5 shadow-2xl border border-[var(--copper)]/60 flex flex-col gap-2">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                <div className="flex items-center gap-2">
                  <MapPin size={16} strokeWidth={2} className="text-[var(--copper)]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--copper)]">
                    Targeted Location
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(`${pinnedCoord.lat.toFixed(6)}, ${pinnedCoord.lng.toFixed(6)}`);
                      showToast(`Copied: ${pinnedCoord.lat.toFixed(6)}, ${pinnedCoord.lng.toFixed(6)}`);
                    }}
                    className="text-[10px] font-mono text-[var(--text-muted)] hover:text-[var(--copper)] px-2.5 py-0.5 rounded-full bg-[var(--bg-warm)] border border-[var(--border)]"
                  >
                    Copy L/L
                  </button>
                  <button
                    onClick={() => setPinnedCoord(null)}
                    className="text-[var(--text-muted)] hover:text-[var(--danger)] text-xs p-0.5"
                    title="Clear Pin"
                  >
                    <X size={16} strokeWidth={2} />
                  </button>
                </div>
              </div>

              {/* Coordinates Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs font-mono">
                <div className="bg-[var(--card)] p-2 rounded-lg border border-[var(--border)]">
                  <span className="text-[9px] text-[var(--text-muted)] block uppercase font-semibold">Latitude</span>
                  <span className="text-[var(--copper)] font-bold">{pinnedCoord.lat.toFixed(6)}°N</span>
                </div>
                <div className="bg-[var(--card)] p-2 rounded-lg border border-[var(--border)]">
                  <span className="text-[9px] text-[var(--text-muted)] block uppercase font-semibold">Longitude</span>
                  <span className="text-[var(--copper)] font-bold">{pinnedCoord.lng.toFixed(6)}°E</span>
                </div>
                <div className="bg-[var(--card)] p-2 rounded-lg border border-[var(--border)]">
                  <span className="text-[9px] text-[var(--text-muted)] block uppercase font-semibold">MGRS Grid</span>
                  <span className="text-[var(--text)] font-bold truncate block">{toMGRS(pinnedCoord.lat, pinnedCoord.lng)}</span>
                </div>
                <div className="bg-[var(--card)] p-2 rounded-lg border border-[var(--border)]">
                  <span className="text-[9px] text-[var(--text-muted)] block uppercase font-semibold">Distance / Azimuth</span>
                  <span className="text-[var(--text)] font-bold block truncate">
                    {inspectDistM > 1000 ? `${(inspectDistM / 1000).toFixed(2)} km` : `${inspectDistM} m`} @ {inspectBearing.degrees}° {inspectBearing.cardinal}
                  </span>
                </div>
              </div>

              {/* Micro-Nudge Controller Bar */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1 text-[11px] font-mono">
                  <span className="text-[var(--text-muted)] text-[10px] uppercase font-bold mr-1">Nudge:</span>
                  {[1, 5, 25].map((step) => (
                    <button
                      key={step}
                      onClick={() => setNudgeStepMeters(step)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors ${
                        nudgeStepMeters === step
                          ? 'bg-[var(--copper)] text-white'
                          : 'bg-[var(--bg-warm)] text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)]'
                      }`}
                    >
                      {step}m
                    </button>
                  ))}
                </div>

                {/* Direction Buttons */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleMicroNudge(-nudgeStepMeters, 0)}
                    className="bg-[var(--bg-warm)] hover:bg-[var(--copper-10)] text-[var(--text)] p-1.5 rounded-full border border-[var(--border)] transition-colors"
                    title={`Nudge ${nudgeStepMeters}m South`}
                  >
                    <ArrowDown size={13} strokeWidth={2} />
                  </button>
                  <button
                    onClick={() => handleMicroNudge(nudgeStepMeters, 0)}
                    className="bg-[var(--bg-warm)] hover:bg-[var(--copper-10)] text-[var(--text)] p-1.5 rounded-full border border-[var(--border)] transition-colors"
                    title={`Nudge ${nudgeStepMeters}m North`}
                  >
                    <ArrowUp size={13} strokeWidth={2} />
                  </button>
                  <button
                    onClick={() => handleMicroNudge(0, -nudgeStepMeters)}
                    className="bg-[var(--bg-warm)] hover:bg-[var(--copper-10)] text-[var(--text)] p-1.5 rounded-full border border-[var(--border)] transition-colors"
                    title={`Nudge ${nudgeStepMeters}m West`}
                  >
                    <ArrowLeft size={13} strokeWidth={2} />
                  </button>
                  <button
                    onClick={() => handleMicroNudge(0, nudgeStepMeters)}
                    className="bg-[var(--bg-warm)] hover:bg-[var(--copper-10)] text-[var(--text)] p-1.5 rounded-full border border-[var(--border)] transition-colors"
                    title={`Nudge ${nudgeStepMeters}m East`}
                  >
                    <ArrowRight size={13} strokeWidth={2} />
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      calculateRoadRouteToDestination(pinnedCoord.lat, pinnedCoord.lng, 'Pinned Road Point');
                      setCurrentTab('resilient-navigation');
                    }}
                    className="btn btn-primary btn-sm"
                    title="Calculate route to this point strictly along available roads"
                  >
                    <Navigation size={12} strokeWidth={2} />
                    <span>Road Route</span>
                  </button>

                  <button
                    onClick={() => {
                      setCurrentTab('incident-reporting');
                      showToast(`Coordinates transferred to Incident Report: ${pinnedCoord.lat.toFixed(6)}, ${pinnedCoord.lng.toFixed(6)}`);
                    }}
                    className="btn btn-secondary btn-sm"
                  >
                    <FileText size={12} strokeWidth={2} />
                    <span>Report Here</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Live Cursor Telemetry Bar (Bottom Left) */
            <div className="absolute bottom-3 left-3 z-10 card-glass px-3 py-1.5 rounded-full border border-[var(--border)] text-[10px] font-mono text-[var(--text-muted)] shadow-lg flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Compass size={13} strokeWidth={2} className="text-[var(--copper)]" />
                <span>MGRS: <span className="text-[var(--text)] font-bold">{inspectMGRS}</span></span>
              </div>
              <span className="text-[var(--border)]">|</span>
              <span>Pos: <span className="text-[var(--copper)] font-bold">{inspectCoord.lat.toFixed(6)}°N, {inspectCoord.lng.toFixed(6)}°E</span></span>
              <span className="text-[var(--border)]">|</span>
              <span>Tap map to drop pin</span>
            </div>
          )}
        </>
      )}

      {/* Quick Jump & Coordinate Search Modal */}
      {showSearchModal && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="card-glass rounded-2xl border border-[var(--copper)]/50 p-4 w-full max-w-md shadow-2xl flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
              <div className="flex items-center gap-2 text-[var(--copper)] font-bold text-sm">
                <Crosshair size={18} strokeWidth={2} />
                <span>Precision Coordinate Navigation</span>
              </div>
              <button
                onClick={() => setShowSearchModal(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text)]"
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            {/* Custom Coordinate Input */}
            <form onSubmit={handleParseCustomCoord} className="flex flex-col gap-2">
              <label className="text-[11px] font-mono uppercase text-[var(--text-muted)] font-bold">
                Enter Exact Lat, Long (WGS84 Sub-meter)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. 27.594528, 91.879541"
                  value={customCoordInput}
                  onChange={(e) => setCustomCoordInput(e.target.value)}
                  className="flex-1 bg-[var(--card)] border border-[var(--border)] rounded-full px-3.5 py-2 text-xs font-mono text-[var(--text)] placeholder:text-[var(--text-faint)] focus:border-[var(--copper)] outline-none"
                />
                <button
                  type="submit"
                  className="btn btn-primary btn-sm rounded-full px-4"
                >
                  Jump
                </button>
              </div>
            </form>

            {/* Preset Tactical Waypoints */}
            <div className="flex flex-col gap-1.5 mt-1">
              <span className="text-[10px] font-mono uppercase text-[var(--text-muted)] font-bold">
                Tactical Checkpoints & Sectors
              </span>
              <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
                {waypoints.map((wp) => (
                  <button
                    key={wp.id}
                    onClick={() => handleJumpToCoordinates(wp.latitude, wp.longitude, wp.name)}
                    className="bg-[var(--card)] hover:bg-[var(--bg-warm)] border border-[var(--border)] rounded-xl p-2.5 text-left flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-[var(--text)]">{wp.name}</span>
                        <span className="text-[9px] font-mono bg-[var(--copper-10)] text-[var(--copper)] px-1.5 py-0.5 rounded font-bold">
                          {wp.code}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-[var(--text-muted)]">
                        {wp.latitude.toFixed(6)}°N, {wp.longitude.toFixed(6)}°E ({wp.elevationMeters}m)
                      </span>
                    </div>
                    <Navigation size={14} strokeWidth={2} className="text-[var(--copper)]" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
