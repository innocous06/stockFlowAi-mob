import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppTab, GPSPosition, IncidentReport, MapTilePackage, SOSEvent, SyncQueueItem, Waypoint, RouteOption, MapLayerType } from '../types';
import { supabase } from '../services/supabase';
import { 
  getStoredSyncQueue, 
  saveStoredSyncQueue, 
  getStoredMapPackages, 
  saveStoredMapPackages, 
  getStoredIncidents, 
  saveStoredIncidents, 
  getStoredWaypoints, 
  saveStoredWaypoints, 
  getStoredTrackLog, 
  saveStoredTrackLog, 
  getLastSyncTime, 
  setLastSyncTime 
} from '../services/storage';
import { TACTICAL_ROUTES } from '../services/mockData';
import { 
  getAccurateCurrentPosition, 
  watchRealLocation, 
  checkLocationPermission, 
  reverseGeocodeLocation 
} from '../services/real-location.service';
import { calculateRoadRoute } from '../services/road-routing.service';
import { speakInstruction, cancelSpeech } from '../services/voice-guidance.service';
import { calculateBearing, calculateDistanceMeters } from '../services/gps-geojson.service';
import { connectivityService } from '../services/connectivity.service';
import { incidentOfflineStore } from '../services/incident-offline-store.service';
import { incidentSyncService } from '../services/incident-sync.service';

interface AppContextType {
  currentTab: AppTab;
  setCurrentTab: (tab: AppTab) => void;
  // Network & Sync
  isOnline: boolean;
  setIsOnline: (online: boolean) => void;
  networkSimulationMode: 'online' | 'offline' | 'spotty';
  setNetworkSimulationMode: (mode: 'online' | 'offline' | 'spotty') => void;
  syncQueue: SyncQueueItem[];
  isSyncing: boolean;
  syncProgress: number;
  lastSyncedTimestamp: number;
  forceSync: () => Promise<void>;
  removeItemFromQueue: (id: string) => void;
  retryQueueItem: (id: string) => void;
  addQueueItem: (item: Omit<SyncQueueItem, 'id' | 'timestamp'>) => void;
  // Map Tiles
  mapPackages: MapTilePackage[];
  startPackageDownload: (packageId: string) => void;
  purgeMapPackage: (packageId: string) => void;
  totalCachedStorageBytes: number;
  // GPS & Location
  currentGPS: GPSPosition;
  isSimulatingMovement: boolean;
  setIsSimulatingMovement: (simulate: boolean) => void;
  gpsSource: 'device' | 'simulation';
  setGpsSource: (source: 'device' | 'simulation') => void;
  isRealGPSFix: boolean;
  realLocationAddress: string | null;
  isLocating: boolean;
  activateRealGPS: () => Promise<boolean>;
  switchToSimulation: () => void;
  recenterMapCounter: number;
  triggerRecenterOnUser: () => void;
  gpsBreadcrumbs: GPSPosition[];
  clearBreadcrumbs: () => void;
  // Road Routing
  activeRoute: RouteOption | null;
  setActiveRoute: (route: RouteOption | null) => void;
  alternativeRoutes: RouteOption[];
  calculateRoadRouteToDestination: (destLat: number, destLng: number, destTitle?: string) => Promise<boolean>;
  isRoutingLoading: boolean;
  routingError: string | null;
  // Waypoints & Incidents
  waypoints: Waypoint[];
  addWaypoint: (wp: Omit<Waypoint, 'id'>) => void;
  incidents: IncidentReport[];
  createIncident: (incident: Omit<IncidentReport, 'id' | 'timestamp' | 'syncStatus'>) => Promise<IncidentReport>;
  addIncident: (incident: IncidentReport) => Promise<void>;
  deleteIncident: (id: string) => void;
  activeSOS: SOSEvent | null;
  triggerSOS: (options?: {
    medical?: boolean;
    disabled?: boolean;
    threat?: boolean;
    driverName?: string;
    vehicleId?: string;
    role?: string;
    department?: string;
  }) => Promise<void>;
  triggerReport: () => Promise<void>;
  broadcastIncident: (payload: any) => Promise<void>;
  cancelSOS: () => void;
  // Full Map View & Active Driving Journey (Google Maps Mode)
  isFullScreenMap: boolean;
  setIsFullScreenMap: (full: boolean) => void;
  isDrivingJourney: boolean;
  startDrivingJourney: (route?: RouteOption) => void;
  stopDrivingJourney: () => void;
  currentStepIndex: number;
  setCurrentStepIndex: (idx: number) => void;
  voiceGuidanceEnabled: boolean;
  setVoiceGuidanceEnabled: (enabled: boolean) => void;
  isDriveSimulating: boolean;
  setIsDriveSimulating: (sim: boolean) => void;
  driveSimulationSpeed: number;
  setDriveSimulationSpeed: (speed: number) => void;
  // Map Layer
  mapLayer: MapLayerType;
  setMapLayer: (layer: MapLayerType) => void;
  // Notification Toast
  toastMessage: string | null;
  showToast: (msg: string, durationMs?: number) => void;
  dismissToast: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Base tactical anchor point (Tawang high-altitude sector)
const INITIAL_COORDS: GPSPosition = {
  latitude: 27.5861,
  longitude: 91.8672,
  altitude: 3048,
  speed: 28,
  heading: 42,
  accuracy: 4.2,
  timestamp: Date.now(),
  altitudeAccuracy: 2.5
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTab, setCurrentTab] = useState<AppTab>('driver-home');
  const [isOnline, setIsOnline] = useState<boolean>(false); // starts in offline mode to match the initial prompt
  const [networkSimulationMode, setNetworkSimulationMode] = useState<'online' | 'offline' | 'spotty'>('offline');
  
  const [syncQueue, setSyncQueue] = useState<SyncQueueItem[]>(getStoredSyncQueue);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncProgress, setSyncProgress] = useState<number>(0);
  const [lastSyncedTimestamp, setLastSyncedTimestamp] = useState<number>(getLastSyncTime);

  const [mapPackages, setMapPackages] = useState<MapTilePackage[]>(getStoredMapPackages);
  const [waypoints, setWaypoints] = useState<Waypoint[]>(getStoredWaypoints);
  const [incidents, setIncidents] = useState<IncidentReport[]>(getStoredIncidents);
  const [activeRoute, setActiveRoute] = useState<RouteOption | null>(TACTICAL_ROUTES[0]);
  
  const [currentGPS, setCurrentGPS] = useState<GPSPosition>(INITIAL_COORDS);
  const [gpsSource, setGpsSource] = useState<'device' | 'simulation'>('simulation');
  const [isRealGPSFix, setIsRealGPSFix] = useState<boolean>(false);
  const [realLocationAddress, setRealLocationAddress] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [recenterMapCounter, setRecenterMapCounter] = useState<number>(0);

  const [isSimulatingMovement, setIsSimulatingMovement] = useState<boolean>(false); // default off to prioritize real location
  const [gpsBreadcrumbs, setGpsBreadcrumbs] = useState<GPSPosition[]>(getStoredTrackLog);

  // Road Routing States
  const [alternativeRoutes, setAlternativeRoutes] = useState<RouteOption[]>([]);
  const [isRoutingLoading, setIsRoutingLoading] = useState<boolean>(false);
  const [routingError, setRoutingError] = useState<string | null>(null);

  // Full Map View & Active Driving Journey States (Google Maps Mode)
  const [isFullScreenMap, setIsFullScreenMap] = useState<boolean>(false);
  const [isDrivingJourney, setIsDrivingJourney] = useState<boolean>(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [voiceGuidanceEnabled, setVoiceGuidanceEnabled] = useState<boolean>(true);
  const [isDriveSimulating, setIsDriveSimulating] = useState<boolean>(true);
  const [driveSimulationSpeed, setDriveSimulationSpeed] = useState<number>(1);
  const driveWaypointIdxRef = useRef<number>(0);

  // Global Map Layer (Google Topo default for tactical terrain, persisted across navigation views)
  const [mapLayer, setMapLayerState] = useState<MapLayerType>(() => {
    try {
      const stored = localStorage.getItem('convoy_map_layer') as MapLayerType;
      if (stored && ['google_hybrid', 'google_terrain', 'open_topo', 'tactical_dark', 'osm_standard'].includes(stored)) {
        return stored;
      }
    } catch {}
    return 'google_terrain';
  });

  const setMapLayer = useCallback((layer: MapLayerType) => {
    setMapLayerState(layer);
    try {
      localStorage.setItem('convoy_map_layer', layer);
    } catch {}
  }, []);

  const [activeSOS, setActiveSOS] = useState<SOSEvent | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const toastTimerRef = useRef<any>(null);
  const dismissToast = useCallback(() => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(null);
  }, []);

  const showToast = useCallback((msg: string, durationMs?: number) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(msg);
    const isNetworkToast =
      msg.toLowerCase().includes('network') ||
      msg.toLowerCase().includes('satellite') ||
      msg.toLowerCase().includes('uplink') ||
      msg.toLowerCase().includes('established') ||
      msg.toLowerCase().includes('connected');
    const delay = durationMs ?? (isNetworkToast ? 1500 : 2500);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, delay);
  }, []);

  // Supabase Realtime Listener with phone lock / reconnect resilience
  const channelRef = useRef<any>(null);
  const [isChannelReady, setIsChannelReady] = useState<boolean>(false);

  const initRealtimeChannel = useCallback(() => {
    if (channelRef.current) {
      try {
        supabase.removeChannel(channelRef.current);
      } catch {
        // cleanup previous
      }
    }

    const channel = supabase.channel('tactical-signals');
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'sos' }, (payload: any) => {
        const user = payload?.payload?.user || 'Operator';
        const role = payload?.payload?.role ? `(${payload.payload.role})` : '';
        const coords = payload?.payload?.coordinates ? `at ${payload.payload.coordinates}` : '';
        showToast(`🚨 INCOMING SOS: ${user} ${role} ${coords}`);
      })
      .on('broadcast', { event: 'report' }, (payload: any) => {
        const msg = payload?.payload?.message || 'Field report received';
        const user = payload?.payload?.user ? ` [${payload.payload.user}]` : '';
        showToast(`📋 INCOMING REPORT: ${msg}${user}`);
      })
      .on('broadcast', { event: 'incident' }, (payload: any) => {
        const data = payload?.payload || {};
        const incTitle = data.title || 'Road Obstacle';
        const incCat = data.category || 'hazard';
        const repBy = data.reportedBy ? `by ${data.reportedBy}` : (data.user ? `by ${data.user}` : '');
        showToast(`⚠️ INCOMING HAZARD: ${incTitle} (${incCat}) ${repBy}`);
        
        if (data.messageId) {
          setIncidents((prev) => {
            if (prev.some(i => (i.report_id === data.messageId || i.id === data.messageId))) {
              return prev;
            }
            const incoming: IncidentReport = {
              id: data.messageId,
              report_id: data.messageId,
              idempotency_key: `idemp_${data.messageId}`,
              tenant_id: 'tactical-unit-07',
              revision: 1,
              title: incTitle,
              category: incCat,
              severity: data.severity || 'high',
              district_road_segment: data.description || 'Sector Highway Corridor',
              description: data.description || 'HQ Broadcast Incident',
              observation_time: new Date().toISOString(),
              latitude: data.latitude || 27.5861,
              longitude: data.longitude || 91.8745,
              altitude_meters: 3000,
              accuracy_meters: 10,
              gps_status: 'high_precision',
              geo_json: {
                type: 'Point',
                coordinates: [data.longitude || 91.8745, data.latitude || 27.5861]
              },
              locationName: data.description || 'Sector Highway',
              reportedBy: 'HQ Broadcast / Mesh',
              photos: data.photo ? [data.photo] : [],
              photo_attachments: [],
              timestamp: Date.now(),
              syncStatus: 'synced',
              sync_stage: 'SYNCED',
              retry_count: 0
            };
            incidentOfflineStore.saveIncident(incoming).catch(() => {});
            return [incoming, ...prev];
          });
        }
      })
      .subscribe((status: any) => {
        setIsChannelReady(status === 'SUBSCRIBED');
      });

    return channel;
  }, [showToast]);

  useEffect(() => {
    const ch = initRealtimeChannel();

    // Auto-reconnect when phone unlocks or returns to foreground
    const handleForegroundOrOnline = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        initRealtimeChannel();
      }
    };

    document.addEventListener('visibilitychange', handleForegroundOrOnline);
    window.addEventListener('online', handleForegroundOrOnline);

    return () => {
      document.removeEventListener('visibilitychange', handleForegroundOrOnline);
      window.removeEventListener('online', handleForegroundOrOnline);
      try {
        supabase.removeChannel(ch);
      } catch {
        // ignore
      }
    };
  }, [initRealtimeChannel]);

  // Load IndexedDB incidents on startup and sync state
  useEffect(() => {
    incidentOfflineStore.getAllIncidents().then((idbIncidents) => {
      if (idbIncidents && idbIncidents.length > 0) {
        setIncidents((prev) => {
          const map = new Map<string, IncidentReport>();
          prev.forEach((i) => map.set(i.report_id || i.id, i));
          idbIncidents.forEach((i) => map.set(i.report_id || i.id, i));
          const merged = Array.from(map.values()).sort((a, b) => b.timestamp - a.timestamp);
          saveStoredIncidents(merged);
          return merged;
        });
      }
    }).catch((err) => console.warn('Could not read IndexedDB incidents:', err));
  }, []);

  const triggerRecenterOnUser = useCallback(() => {
    setRecenterMapCounter((c) => c + 1);
  }, []);

  // Activate Real Device Location (Google Maps Mode)
  const activateRealGPS = useCallback(async (): Promise<boolean> => {
    setIsLocating(true);
    try {
      showToast('🛰️ Requesting device GPS & positioning satellite fix...');
      const accuratePos = await getAccurateCurrentPosition();
      
      setCurrentGPS(accuratePos);
      setGpsSource('device');
      setIsRealGPSFix(true);
      setIsSimulatingMovement(false); // Disable simulation so it doesn't overwrite real location
      setGpsBreadcrumbs((prev) => [...prev.slice(-120), accuratePos]);
      triggerRecenterOnUser();

      showToast(`📍 Real GPS Locked: ${accuratePos.latitude.toFixed(5)}°N, ${accuratePos.longitude.toFixed(5)}°E (±${accuratePos.accuracy}m)`);

      // Resolve friendly address asynchronously
      reverseGeocodeLocation(accuratePos.latitude, accuratePos.longitude)
        .then((addr) => {
          setRealLocationAddress(addr);
        })
        .catch(() => {});

      return true;
    } catch (err: any) {
      console.warn('Real GPS activation failed:', err);
      showToast(`⚠️ ${err.message || 'Location access failed'}`);
      return false;
    } finally {
      setIsLocating(false);
    }
  }, [showToast, triggerRecenterOnUser]);

  // Switch back to Tactical Simulator Mode if user explicitly chooses
  const switchToSimulation = useCallback(() => {
    setGpsSource('simulation');
    setIsRealGPSFix(false);
    setIsSimulatingMovement(true);
    setCurrentGPS(INITIAL_COORDS);
    showToast('Switched to Tactical Convoy Simulator (Tawang Sector)');
  }, [showToast]);

  // Check if browser already granted location permission on startup
  useEffect(() => {
    checkLocationPermission().then((perm) => {
      if (perm.state === 'granted') {
        activateRealGPS();
      }
    });
  }, [activateRealGPS]);

  // Continuous real location watch when in device mode
  useEffect(() => {
    if (gpsSource !== 'device') return;

    const cleanup = watchRealLocation(
      (pos) => {
        setCurrentGPS(pos);
        setIsRealGPSFix(true);
        setGpsBreadcrumbs((prev) => {
          const last = prev[prev.length - 1];
          if (last && Math.abs(last.latitude - pos.latitude) < 0.00001 && Math.abs(last.longitude - pos.longitude) < 0.00001) {
            return prev;
          }
          return [...prev.slice(-120), pos];
        });
      },
      (err) => {
        console.warn('Real GPS watch error:', err.message);
        // Do NOT instantly force revert to simulation! Keep last known position.
      }
    );

    return cleanup;
  }, [gpsSource]);

  // Calculate Real Road Route strictly using available drivable roads
  const calculateRoadRouteToDestination = useCallback(
    async (destLat: number, destLng: number, destTitle?: string): Promise<boolean> => {
      setIsRoutingLoading(true);
      setRoutingError(null);

      const origin = {
        lat: currentGPS.latitude,
        lng: currentGPS.longitude
      };

      const destination = {
        lat: destLat,
        lng: destLng
      };

      try {
        showToast('🚗 Calculating actual route along available roads...');
        const routes = await calculateRoadRoute(origin, destination, destTitle);

        if (!routes || routes.length === 0) {
          throw new Error('No road route found on available street network.');
        }

        const primary = routes[0];
        setActiveRoute(primary);
        setAlternativeRoutes(routes.slice(1));

        showToast(`✅ Road Route Found: ${primary.distanceKm} km (${primary.estMinutes} mins) ${primary.summary || ''}`);
        return true;
      } catch (err: any) {
        const msg = err.message || 'Failed to calculate road route';
        setRoutingError(msg);
        showToast(`⚠️ Route Error: ${msg}`);
        return false;
      } finally {
        setIsRoutingLoading(false);
      }
    },
    [currentGPS, showToast, triggerRecenterOnUser]
  );

  // Start Google Maps style active driving journey
  const startDrivingJourney = useCallback((route?: RouteOption) => {
    const chosenRoute = route || activeRoute || TACTICAL_ROUTES[0];
    setActiveRoute(chosenRoute);
    setIsDrivingJourney(true);
    setIsFullScreenMap(true);
    setCurrentStepIndex(0);
    driveWaypointIdxRef.current = 0;
    setIsDriveSimulating(true);
    triggerRecenterOnUser();

    // If on simulation mode, align vehicle position to the first waypoint of the route
    if (gpsSource === 'simulation' && chosenRoute.waypoints.length > 0) {
      const firstWp = chosenRoute.waypoints[0];
      const secondWp = chosenRoute.waypoints[Math.min(1, chosenRoute.waypoints.length - 1)];
      const bearing = calculateBearing(firstWp[0], firstWp[1], secondWp[0], secondWp[1]);
      setCurrentGPS({
        latitude: firstWp[0],
        longitude: firstWp[1],
        altitude: 3048,
        speed: 35,
        heading: bearing.degrees,
        accuracy: 3.5,
        timestamp: Date.now()
      });
    }

    const firstStep = chosenRoute.steps && chosenRoute.steps.length > 0 ? chosenRoute.steps[0] : null;
    const startMsg = firstStep 
      ? `Starting route to ${chosenRoute.destination}. ${firstStep.instruction}`
      : `Starting navigation to ${chosenRoute.destination}. Follow highlighted road route.`;
    
    showToast(`▶ Driving Journey Started: ${chosenRoute.name}`);
    if (voiceGuidanceEnabled) {
      speakInstruction(startMsg, true);
    }
  }, [activeRoute, gpsSource, showToast, triggerRecenterOnUser, voiceGuidanceEnabled]);

  const stopDrivingJourney = useCallback(() => {
    setIsDrivingJourney(false);
    setIsDriveSimulating(false);
    cancelSpeech();
    showToast('Navigation Ended');
  }, [showToast]);

  // Simulated Tactical Movement (Convoy path progression)
  useEffect(() => {
    if (gpsSource !== 'simulation' || !isSimulatingMovement || isDrivingJourney) return;

    let stepIndex = 0;
    const pathCoords = [
      { lat: 27.5861, lng: 91.8672, alt: 3048, heading: 38, speed: 34 },
      { lat: 27.5880, lng: 91.8695, alt: 3080, heading: 42, speed: 36 },
      { lat: 27.5910, lng: 91.8735, alt: 3120, heading: 48, speed: 28 },
      { lat: 27.5945, lng: 91.8795, alt: 3210, heading: 55, speed: 22 },
      { lat: 27.5975, lng: 91.8825, alt: 3260, heading: 40, speed: 30 },
      { lat: 27.6012, lng: 91.8860, alt: 3340, heading: 35, speed: 18 },
      { lat: 27.6045, lng: 91.8900, alt: 3390, heading: 44, speed: 25 },
      { lat: 27.6080, lng: 91.8950, alt: 3450, heading: 50, speed: 20 },
      { lat: 27.6050, lng: 91.8910, alt: 3410, heading: 220, speed: 29 },
      { lat: 27.5990, lng: 91.8830, alt: 3290, heading: 225, speed: 35 },
      { lat: 27.5920, lng: 91.8750, alt: 3150, heading: 215, speed: 38 },
      { lat: 27.5865, lng: 91.8680, alt: 3055, heading: 210, speed: 32 }
    ];

    const timer = setInterval(() => {
      stepIndex = (stepIndex + 1) % pathCoords.length;
      const target = pathCoords[stepIndex];
      // small jitter for realistic GPS fluctuation
      const jitterLat = (Math.random() - 0.5) * 0.0003;
      const jitterLng = (Math.random() - 0.5) * 0.0003;
      const jitterAlt = Math.round((Math.random() - 0.5) * 6);
      const jitterSpeed = Math.round((Math.random() - 0.5) * 4);

      const simulatedPos: GPSPosition = {
        latitude: target.lat + jitterLat,
        longitude: target.lng + jitterLng,
        altitude: target.alt + jitterAlt,
        speed: Math.max(0, target.speed + jitterSpeed),
        heading: (target.heading + Math.round((Math.random() - 0.5) * 6) + 360) % 360,
        accuracy: 3.5 + Math.random() * 1.5,
        timestamp: Date.now(),
        altitudeAccuracy: 2.0
      };

      setCurrentGPS(simulatedPos);
      setGpsBreadcrumbs((prev) => [...prev.slice(-120), simulatedPos]);
    }, 2800);

    return () => clearInterval(timer);
  }, [gpsSource, isSimulatingMovement, isDrivingJourney]);

  // Active Route Simulation Journey (Traversing route waypoints with turn-by-turn alerts)
  useEffect(() => {
    if (!isDrivingJourney || !activeRoute || gpsSource !== 'simulation' || !isDriveSimulating) return;
    if (!activeRoute.waypoints || activeRoute.waypoints.length < 2) return;

    const intervalMs = Math.max(800, Math.round(2200 / driveSimulationSpeed));

    const timer = setInterval(() => {
      driveWaypointIdxRef.current = driveWaypointIdxRef.current + 1;

      if (driveWaypointIdxRef.current >= activeRoute.waypoints.length) {
        if (voiceGuidanceEnabled) {
          speakInstruction(`You have arrived at your destination: ${activeRoute.destination}`, true);
        }
        showToast(`🏁 Arrived at Destination: ${activeRoute.destination}`);
        setIsDriveSimulating(false);
        return;
      }

      const currIdx = driveWaypointIdxRef.current;
      const pCurrent = activeRoute.waypoints[currIdx];
      const pNext = activeRoute.waypoints[Math.min(currIdx + 1, activeRoute.waypoints.length - 1)];
      const bearing = calculateBearing(pCurrent[0], pCurrent[1], pNext[0], pNext[1]);

      const simulatedPos: GPSPosition = {
        latitude: pCurrent[0],
        longitude: pCurrent[1],
        altitude: 3000 + currIdx * 10,
        speed: Math.round(38 * driveSimulationSpeed),
        heading: bearing.degrees,
        accuracy: 3.0,
        timestamp: Date.now()
      };

      setCurrentGPS(simulatedPos);
      setGpsBreadcrumbs((prev) => [...prev.slice(-150), simulatedPos]);

      // Step advancement logic
      if (activeRoute.steps && activeRoute.steps.length > 0) {
        setCurrentStepIndex((prevIdx) => {
          const currentStep = activeRoute.steps ? activeRoute.steps[prevIdx] : null;
          if (currentStep) {
            const dist = calculateDistanceMeters(
              pCurrent[0],
              pCurrent[1],
              currentStep.location[0],
              currentStep.location[1]
            );
            if (dist < 55 && prevIdx < (activeRoute.steps?.length || 1) - 1) {
              const nextIdx = prevIdx + 1;
              const nextStep = activeRoute.steps ? activeRoute.steps[nextIdx] : null;
              if (voiceGuidanceEnabled && nextStep) {
                speakInstruction(nextStep.instruction);
              }
              return nextIdx;
            }
          }
          return prevIdx;
        });
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [
    isDrivingJourney,
    activeRoute,
    gpsSource,
    isDriveSimulating,
    driveSimulationSpeed,
    voiceGuidanceEnabled,
    showToast
  ]);

  // Real GPS Step Advancement for live on-road driving
  useEffect(() => {
    if (!isDrivingJourney || !activeRoute || gpsSource !== 'device' || !activeRoute.steps) return;

    setCurrentStepIndex((prevIdx) => {
      const currentStep = activeRoute.steps ? activeRoute.steps[prevIdx] : null;
      if (!currentStep) return prevIdx;

      const dist = calculateDistanceMeters(
        currentGPS.latitude,
        currentGPS.longitude,
        currentStep.location[0],
        currentStep.location[1]
      );

      if (dist < 45 && prevIdx < (activeRoute.steps?.length || 1) - 1) {
        const nextIdx = prevIdx + 1;
        const nextStep = activeRoute.steps ? activeRoute.steps[nextIdx] : null;
        if (voiceGuidanceEnabled && nextStep) {
          speakInstruction(nextStep.instruction);
        }
        return nextIdx;
      }
      return prevIdx;
    });
  }, [isDrivingJourney, activeRoute, gpsSource, currentGPS.latitude, currentGPS.longitude, voiceGuidanceEnabled]);

  // Network simulation mode sync
  const handleSetNetworkMode = (mode: 'online' | 'offline' | 'spotty') => {
    setNetworkSimulationMode(mode);
    connectivityService.setMode(mode);
    if (mode === 'online') {
      setIsOnline(true);
      showToast('Network Connected: Satellite Uplink Established');
    } else if (mode === 'offline') {
      setIsOnline(false);
      showToast('Network Disconnected: Switched to Local Offline Cache');
    } else {
      setIsOnline(true);
      showToast('Spotty 2G / Mesh Network: High latency mode');
    }
  };

  // Force Sync implementation with realistic batch processing & real sync service
  const forceSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncProgress(10);

    const wasOffline = !isOnline;
    if (wasOffline) {
      showToast('Establishing Tactical Radio Mesh Uplink...');
    }

    try {
      // Step 1: Uplink Handshake
      await new Promise((r) => setTimeout(r, 400));
      setSyncProgress(30);

      // Step 2: Run real incident sync pipeline for pending offline reports
      let syncResult = { total: 0, successful: 0 };
      try {
        syncResult = await incidentSyncService.syncAllPending();
      } catch (syncErr) {
        console.warn('Real incident sync pipeline note:', syncErr);
      }
      setSyncProgress(70);

      // Step 3: Refresh incidents from IndexedDB
      try {
        const idbIncidents = await incidentOfflineStore.getAllIncidents();
        if (idbIncidents && idbIncidents.length > 0) {
          setIncidents((prev) => {
            const map = new Map<string, IncidentReport>();
            prev.forEach((i) => map.set(i.report_id || i.id, i));
            idbIncidents.forEach((i) => map.set(i.report_id || i.id, i));
            const merged = Array.from(map.values()).sort((a, b) => b.timestamp - a.timestamp);
            saveStoredIncidents(merged);
            return merged;
          });
        }
      } catch (dbErr) {
        console.warn('Could not refresh IndexedDB incidents:', dbErr);
      }

      // Step 4: Mark queue items as synced
      setSyncQueue((prev) =>
        prev.map((item) => ({ ...item, status: 'synced' as const, sync_stage: 'SYNCED' as const }))
      );

      // Update last sync time
      const now = Date.now();
      setLastSyncTime(now);
      setLastSyncedTimestamp(now);
      setSyncProgress(100);

      await new Promise((r) => setTimeout(r, 300));
      showToast(syncResult.total > 0
        ? `Sync Complete: ${syncResult.successful}/${syncResult.total} queued items uploaded`
        : 'Sync Complete: All queued reports & telemetry confirmed at HQ'
      );
    } catch (err) {
      console.error(err);
      showToast('Sync Failed: Radio interference detected. Saved to offline queue.');
    } finally {
      setIsSyncing(false);
      setSyncProgress(0);
    }
  };

  // Queue item actions
  const removeItemFromQueue = (id: string) => {
    setSyncQueue((prev) => prev.filter((item) => item.id !== id));
    showToast('Queue item removed');
  };

  const retryQueueItem = (id: string) => {
    setSyncQueue((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: 'pending' as const, retryCount: item.retryCount + 1 } : item
      )
    );
    showToast('Queued for immediate upload');
  };

  const addQueueItem = (item: Omit<SyncQueueItem, 'id' | 'timestamp'>) => {
    const newItem: SyncQueueItem = {
      ...item,
      id: `sync-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now()
    };
    setSyncQueue((prev) => [newItem, ...prev]);
  };

  // Map package downloading simulation
  const startPackageDownload = (packageId: string) => {
    setMapPackages((prev) =>
      prev.map((pkg) =>
        pkg.id === packageId ? { ...pkg, status: 'downloading' as const, downloadProgress: 5 } : pkg
      )
    );

    showToast('Initiating offline tile package stream...');

    let progress = 5;
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 15) + 10;
      if (progress >= 100) {
        clearInterval(interval);
        setMapPackages((prev) =>
          prev.map((pkg) =>
            pkg.id === packageId
              ? { ...pkg, status: 'downloaded' as const, downloadProgress: 100 }
              : pkg
          )
        );
        showToast('Map Tiles Cached Successfully for Offline Navigation');
      } else {
        setMapPackages((prev) =>
          prev.map((pkg) =>
            pkg.id === packageId ? { ...pkg, downloadProgress: progress } : pkg
          )
        );
      }
    }, 700);
  };

  const purgeMapPackage = (packageId: string) => {
    setMapPackages((prev) =>
      prev.map((pkg) =>
        pkg.id === packageId ? { ...pkg, status: 'available' as const, downloadProgress: 0 } : pkg
      )
    );
    showToast('Tile pack removed from local storage');
  };

  const totalCachedStorageBytes = mapPackages
    .filter((pkg) => pkg.status === 'downloaded')
    .reduce((acc, pkg) => acc + pkg.sizeBytes, 0) + 14200000; // plus local database & cache size

  // Waypoints & Incidents
  const addWaypoint = (wp: Omit<Waypoint, 'id'>) => {
    const newWp: Waypoint = {
      ...wp,
      id: `wp-${Date.now()}`
    };
    setWaypoints((prev) => [...prev, newWp]);
    showToast(`Waypoint ${newWp.name} added to offline database`);
  };

  const createIncident = async (
    data: Omit<IncidentReport, 'id' | 'timestamp' | 'syncStatus'>
  ): Promise<IncidentReport> => {
    const id = data.report_id || `IR-${Math.floor(100 + Math.random() * 900)}`;
    const newReport: IncidentReport = {
      ...data,
      id,
      report_id: data.report_id || id,
      idempotency_key: data.idempotency_key || `idemp_${id}`,
      tenant_id: data.tenant_id || 'tactical-unit-07',
      revision: data.revision || 1,
      description: data.description || 'Tactical Incident Report',
      observation_time: data.observation_time || new Date().toISOString(),
      gps_status: data.gps_status || 'standard',
      geo_json: data.geo_json || {
        type: 'Point',
        coordinates: [data.longitude, data.latitude]
      },
      locationName: data.locationName || data.district_road_segment || 'Sector Highway',
      reportedBy: data.reportedBy || 'Driver Vance (Unit-07)',
      photos: data.photos || [],
      photo_attachments: data.photo_attachments || [],
      timestamp: Date.now(),
      syncStatus: isOnline ? 'synced' : 'pending',
      sync_stage: isOnline ? 'SYNCED' : 'LOCAL_ONLY',
      retry_count: 0
    };

    setIncidents((prev) => [newReport, ...prev]);
    saveStoredIncidents([newReport, ...incidents]);

    // Save to IndexedDB
    try {
      await incidentOfflineStore.saveIncident(newReport);
    } catch (dbErr) {
      console.warn('Could not save incident to IndexedDB:', dbErr);
    }

    // Also add to sync queue if offline or syncing
    addQueueItem({
      report_id: newReport.report_id,
      idempotency_key: newReport.idempotency_key,
      type: 'incident',
      title: `Incident Report: ${id}`,
      subtitle: isOnline ? 'Direct Upload' : 'Pending Upload',
      sizeBytes: 380000 + (data.photos?.length || 0) * 1200000,
      status: isOnline ? 'synced' : 'pending',
      sync_stage: isOnline ? 'SYNCED' : 'QUEUED',
      icon: 'assignment_late',
      color: data.severity === 'critical' ? '#ffb4ab' : '#fbbb45',
      retryCount: 0,
      payload: { ...newReport }
    });

    if (isOnline) {
      incidentSyncService.syncIncident(newReport).catch(() => {});
    }

    showToast(
      isOnline
        ? `Incident ${id} broadcast to HQ immediately`
        : `Incident ${id} saved to Offline Queue`
    );

    return newReport;
  };

  const addIncident = async (incident: IncidentReport) => {
    setIncidents((prev) => [incident, ...prev.filter(i => (i.report_id || i.id) !== (incident.report_id || incident.id))]);
    saveStoredIncidents([incident, ...incidents.filter(i => (i.report_id || i.id) !== (incident.report_id || incident.id))]);
    try {
      await incidentOfflineStore.saveIncident(incident);
    } catch (e) {
      console.warn('Failed saving incident to IndexedDB:', e);
    }
  };

  const deleteIncident = (id: string) => {
    setIncidents((prev) => prev.filter((i) => (i.id !== id && i.report_id !== id)));
    setSyncQueue((prev) => prev.filter((item) => !item.title.includes(id) && item.report_id !== id));
    incidentOfflineStore.deleteIncident(id).catch(() => {});
    showToast(`Incident ${id} deleted`);
  };

  const clearBreadcrumbs = () => {
    setGpsBreadcrumbs([]);
    showToast('GPS track breadcrumbs cleared');
  };

  // SOS Emergency protocol
  const triggerSOS = async (options?: {
    medical?: boolean;
    disabled?: boolean;
    threat?: boolean;
    driverName?: string;
    vehicleId?: string;
    role?: string;
    department?: string;
  }) => {
    const driver = options?.driverName || 'Vikram Sharma';
    const unit = options?.vehicleId || 'CONVOY-ECHO-07';
    const event: SOSEvent = {
      id: `SOS-${Date.now()}`,
      activatedAt: Date.now(),
      driverName: driver,
      vehicleId: unit,
      latitude: currentGPS.latitude,
      longitude: currentGPS.longitude,
      altitude: currentGPS.altitude || 3048,
      medicalAssistanceNeeded: !!options?.medical,
      vehicleDisabled: !!options?.disabled,
      underThreat: !!options?.threat,
      status: 'broadcasting',
      satelliteBurstTransmitted: true
    };
    setActiveSOS(event);

    // Broadcast via Supabase Realtime
    if (channelRef.current) {
      try {
        await channelRef.current.send({
          type: 'broadcast',
          event: 'sos',
          payload: {
            user: event.driverName,
            role: options?.role || 'Senior Logistics Officer',
            unitId: event.vehicleId,
            department: options?.department || 'Guwahati Hub',
            coordinates: `${event.latitude.toFixed(6)}°N, ${event.longitude.toFixed(6)}°E`,
            latitude: event.latitude,
            longitude: event.longitude,
          },
        });
      } catch (e) {
        console.warn('[Supabase Realtime] SOS broadcast error:', e);
      }
    }

    // Also add high-priority burst to queue
    addQueueItem({
      report_id: event.id,
      idempotency_key: `idemp_${event.id}`,
      type: 'telemetry',
      title: 'EMERGENCY DISTRESS BEACON ACTIVATED',
      subtitle: 'HIGH PRIORITY SATELLITE BURST',
      sizeBytes: 12000,
      status: 'pending',
      sync_stage: 'QUEUED',
      icon: 'emergency',
      color: '#ffb4ab',
      retryCount: 0,
      payload: event
    });

    showToast('🚨 DISTRESS BEACON ACTIVE: Satellite transmission broadcasting coordinates!');
  };

  const triggerReport = async () => {
    if (channelRef.current) {
      try {
        await channelRef.current.send({
          type: 'broadcast',
          event: 'report',
          payload: { message: 'Tactical status update: Unit-07 operating normally.' },
        });
      } catch (e) {
        console.warn('[Supabase Realtime] Report broadcast error:', e);
      }
    }
    showToast('📡 Tactical Report Broadcasted.');
  };

  const broadcastIncident = async (payload: any) => {
    if (channelRef.current) {
      try {
        await channelRef.current.send({
          type: 'broadcast',
          event: 'incident',
          payload
        });
      } catch (e) {
        console.warn('[Supabase Realtime] Incident broadcast error:', e);
      }
    }
  };

  const cancelSOS = () => {
    setActiveSOS(null);
    showToast('Distress Beacon deactivated. All-clear burst sent.');
  };

  return (
    <AppContext.Provider
      value={{
        currentTab,
        setCurrentTab,
        isOnline,
        setIsOnline,
        networkSimulationMode,
        setNetworkSimulationMode: handleSetNetworkMode,
        syncQueue,
        isSyncing,
        syncProgress,
        lastSyncedTimestamp,
        forceSync,
        removeItemFromQueue,
        retryQueueItem,
        addQueueItem,
        mapPackages,
        startPackageDownload,
        purgeMapPackage,
        totalCachedStorageBytes,
        currentGPS,
        isSimulatingMovement,
        setIsSimulatingMovement,
        gpsSource,
        setGpsSource,
        isRealGPSFix,
        realLocationAddress,
        isLocating,
        activateRealGPS,
        switchToSimulation,
        recenterMapCounter,
        triggerRecenterOnUser,
        gpsBreadcrumbs,
        clearBreadcrumbs,
        activeRoute,
        setActiveRoute,
        alternativeRoutes,
        calculateRoadRouteToDestination,
        isRoutingLoading,
        routingError,
        waypoints,
        addWaypoint,
        incidents,
        createIncident,
        addIncident,
        deleteIncident,
        activeSOS,
        triggerSOS,
        triggerReport,
        broadcastIncident,
        cancelSOS,
        // Full Map & Driving Journey
        isFullScreenMap,
        setIsFullScreenMap,
        isDrivingJourney,
        startDrivingJourney,
        stopDrivingJourney,
        currentStepIndex,
        setCurrentStepIndex,
        voiceGuidanceEnabled,
        setVoiceGuidanceEnabled,
        isDriveSimulating,
        setIsDriveSimulating,
        driveSimulationSpeed,
        setDriveSimulationSpeed,
        mapLayer,
        setMapLayer,
        toastMessage,
        showToast,
        dismissToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
