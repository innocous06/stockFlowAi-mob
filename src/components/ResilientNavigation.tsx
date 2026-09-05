import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { TacticalMap } from './TacticalMap';
import { calculateDistanceMeters } from '../services/gps-geojson.service';
import {
  Crosshair,
  MapPin,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Route,
  Maximize2,
  Minimize2,
  Sparkles,
  Search,
  X,
  Compass,
} from 'lucide-react';
import { TACTICAL_ROUTES } from '../services/mockData';

export interface SearchLocationItem {
  id: string;
  name: string;
  description: string;
  lat: number;
  lng: number;
  isLiveApi?: boolean;
}

// 18+ Comprehensive Strategic North Eastern hubs & corridors
const STRATEGIC_HUBS: SearchLocationItem[] = [
  { id: 'h-ght', name: 'Guwahati Central Depot', description: 'Assam · Primary NER Hub (Kamrup)', lat: 26.1445, lng: 91.7362 },
  { id: 'h-shl', name: 'Shillong Distribution Center', description: 'Meghalaya · High-Altitude Logistics DC', lat: 25.5788, lng: 91.8933 },
  { id: 'h-twg', name: 'Tawang Forward Supply Base', description: 'Arunachal Pradesh · High Border Sector', lat: 27.5861, lng: 91.8672 },
  { id: 'h-slc', name: 'Silchar Transit Terminal', description: 'Assam · Barak Valley Transit Link', lat: 24.8333, lng: 92.7789 },
  { id: 'h-agt', name: 'Agartala Freight Depot', description: 'Tripura · Western Logistics Point', lat: 23.8315, lng: 91.2868 },
  { id: 'h-azl', name: 'Aizawl Mountain Base', description: 'Mizoram · Hill Corridor Station', lat: 23.7271, lng: 92.7176 },
  { id: 'h-khm', name: 'Kohima Tactical Sector', description: 'Nagaland · Mountain Ridge Hub', lat: 25.6751, lng: 94.1086 },
  { id: 'h-imp', name: 'Imphal Regional Supply Hub', description: 'Manipur · Valley Distribution', lat: 24.8170, lng: 93.9368 },
  { id: 'h-itn', name: 'Itanagar Logistics Depot', description: 'Arunachal Pradesh · Capital Gateway', lat: 27.0844, lng: 93.6053 },
  { id: 'h-gtk', name: 'Gangtok Mountain Depot', description: 'Sikkim · Alpine Corridor Base', lat: 27.3389, lng: 88.6065 },
  { id: 'h-dmp', name: 'Dimapur Railhead Hub', description: 'Nagaland · Main Railhead Transit', lat: 25.9090, lng: 93.7275 },
  { id: 'h-tez', name: 'Tezpur Logistics Base', description: 'Assam · Northern River Crossing Base', lat: 26.6338, lng: 92.7926 },
  { id: 'h-jht', name: 'Jorhat Air Support Depot', description: 'Assam · Upper Brahmaputra Base', lat: 26.7509, lng: 94.2037 },
  { id: 'h-dbg', name: 'Dibrugarh Terminal Depot', description: 'Assam · Upper Assam Logistics', lat: 27.4728, lng: 94.9120 },
  { id: 'h-bmd', name: 'Bomdila Pass Station', description: 'Arunachal Pradesh · NH-13 Corridor', lat: 27.2645, lng: 92.4159 },
  { id: 'h-tra', name: 'Tura Garo Hills Supply Station', description: 'Meghalaya · Western Corridor Hub', lat: 25.5141, lng: 90.2033 },
  { id: 'h-bng', name: 'Bongaigaon Refinery Junction', description: 'Assam · Fuel Supply Transit', lat: 26.4789, lng: 90.5594 },
  { id: 'h-hfl', name: 'Haflong Hill Section Outpost', description: 'Assam · Dima Hasao Mountain Pass', lat: 25.1706, lng: 93.0180 },
];

export const ResilientNavigation: React.FC = () => {
  const {
    currentGPS,
    isRealGPSFix,
    realLocationAddress,
    isLocating,
    activateRealGPS,
    switchToSimulation,
    triggerRecenterOnUser,
    activeRoute,
    setActiveRoute,
    calculateRoadRouteToDestination,
    isRoutingLoading,
    routingError,
    startDrivingJourney,
    mapLayer,
    setMapLayer,
    incidents,
    isFullScreenMap,
    setIsFullScreenMap,
  } = useApp();
  const { t } = useLanguage();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHub, setSelectedHub] = useState<string | null>(null);
  const [isSearchingLive, setIsSearchingLive] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchLocationItem[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchTimerRef = useRef<any>(null);

  // Live Geocoding Search: Preloaded Gazetteer + Real-time OpenStreetMap Nominatim
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q || q.length < 2) {
      setSearchResults([]);
      setIsSearchingLive(false);
      return;
    }

    // 1. Instant local fuzzy match
    const localMatches = STRATEGIC_HUBS.filter(
      (h) =>
        h.name.toLowerCase().includes(q.toLowerCase()) ||
        h.description.toLowerCase().includes(q.toLowerCase())
    );
    setSearchResults(localMatches);

    // 2. Debounced live OpenStreetMap Nominatim geocoding
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      setIsSearchingLive(true);
      try {
        let apiMatches: SearchLocationItem[] = [];

        // 1. Query OpenStreetMap Nominatim (Worldwide, no country restrictions)
        try {
          const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            q
          )}&limit=10&addressdetails=1`;
          const res = await fetch(url, {
            headers: { Accept: 'application/json' },
          });
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
              apiMatches = data.map((item: any) => {
                const shortName = item.display_name.split(',')[0] || item.name || 'Location';
                return {
                  id: `osm-${item.place_id || Math.random()}`,
                  name: shortName,
                  description: item.display_name,
                  lat: parseFloat(item.lat),
                  lng: parseFloat(item.lon),
                  isLiveApi: true,
                };
              });
            }
          }
        } catch (e) {
          console.warn('Nominatim geocode fetch note:', e);
        }

        // 2. High-speed Photon Komoot fallback if Nominatim gave few or no results
        if (apiMatches.length < 3) {
          try {
            const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=10`;
            const pRes = await fetch(photonUrl);
            if (pRes.ok) {
              const pData = await pRes.json();
              if (pData.features && Array.isArray(pData.features)) {
                const photonMatches: SearchLocationItem[] = pData.features.map((feat: any, idx: number) => {
                  const props = feat.properties || {};
                  const coords = feat.geometry?.coordinates || [0, 0];
                  const name = props.name || props.city || props.street || 'Location';
                  const parts = [props.name, props.city, props.state, props.country].filter(Boolean);
                  const desc = parts.join(', ') || name;
                  return {
                    id: `photon-${props.osm_id || idx}-${Math.random().toString(36).substr(2, 4)}`,
                    name: name,
                    description: desc,
                    lat: coords[1],
                    lng: coords[0],
                    isLiveApi: true,
                  };
                });
                apiMatches = [...apiMatches, ...photonMatches];
              }
            }
          } catch (pe) {
            console.warn('Photon fallback note:', pe);
          }
        }

        if (apiMatches.length > 0) {
          setSearchResults((prev) => {
            const existingNames = new Set(prev.map((p) => p.name.toLowerCase()));
            const uniqueApi = apiMatches.filter((a) => !existingNames.has(a.name.toLowerCase()));
            return [...prev, ...uniqueApi];
          });
        }
      } catch (err) {
        console.warn('Geocoding fetch error:', err);
      } finally {
        setIsSearchingLive(false);
      }
    }, 300);

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchQuery]);

  const handleSelectLocation = async (item: SearchLocationItem) => {
    setSearchQuery(item.name);
    setShowSearchResults(false);
    setSelectedHub(item.id);
    await calculateRoadRouteToDestination(item.lat, item.lng, item.name);
  };

  const computeToHub = useCallback(
    async (hub: SearchLocationItem) => {
      setSelectedHub(hub.id);
      setSearchQuery(hub.name);
      setShowSearchResults(false);
      await calculateRoadRouteToDestination(hub.lat, hub.lng, hub.name);
    },
    [calculateRoadRouteToDestination]
  );

  const nearbyHazards = incidents.filter((i) => {
    if (!activeRoute) return false;
    const dLat = i.latitude - currentGPS.latitude;
    const dLng = i.longitude - currentGPS.longitude;
    return Math.sqrt(dLat * dLat + dLng * dLng) < 0.05;
  });

  const MAP_LAYERS = [
    { id: 'google_terrain', label: 'Terrain' },
    { id: 'google_hybrid', label: 'Hybrid' },
    { id: 'tactical_dark', label: 'Dark' },
    { id: 'osm_standard', label: 'OSM' },
  ] as const;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* ── GPS Status Bar ── */}
      <div className="card-glass" style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 'var(--radius-pill)',
                background: isRealGPSFix ? 'var(--success-10)' : 'var(--copper-10)',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}
            >
              <Crosshair
                size={15}
                strokeWidth={2}
                style={{ color: isRealGPSFix ? 'var(--success)' : 'var(--copper)' }}
              />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>
                {isRealGPSFix ? 'Device GPS Lock · RTK Sub-meter' : 'Simulated Convoy GPS'}
              </div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 1 }} className="mono">
                {realLocationAddress ?? `${currentGPS.latitude.toFixed(5)}°N, ${currentGPS.longitude.toFixed(5)}°E`}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={triggerRecenterOnUser}
              title="Center on user position"
            >
              <MapPin size={12} strokeWidth={2} />
              <span>Center</span>
            </button>
            {isRealGPSFix ? (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={switchToSimulation}
              >
                Simulate
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={activateRealGPS}
                disabled={isLocating}
              >
                {isLocating ? <Loader2 size={12} className="spinning" /> : <Crosshair size={12} />}
                <span>Real GPS</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Layer Selector Pills ── */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
        {MAP_LAYERS.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => setMapLayer(l.id)}
            style={{
              flexShrink: 0,
              padding: '5px 14px',
              borderRadius: 'var(--radius-pill)',
              border: '1px solid',
              borderColor: mapLayer === l.id ? 'var(--copper)' : 'var(--border)',
              background: mapLayer === l.id ? 'var(--copper-10)' : 'var(--card)',
              color: mapLayer === l.id ? 'var(--copper)' : 'var(--text-muted)',
              fontSize: 10,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {l.label}
          </button>
        ))}
      </div>

      {/* ── Tactical Map Card ── */}
      <div
        className={isFullScreenMap ? "fixed inset-0 z-[99999] w-screen h-screen bg-[var(--bg)] m-0 p-0 overflow-hidden" : "card"}
        style={isFullScreenMap ? { position: 'fixed', inset: 0, zIndex: 99999, width: '100vw', height: '100vh', background: 'var(--bg)' } : {
          height: 250,
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid var(--border)',
        }}
      >
        <TacticalMap
          heightClass="h-full w-full"
          showControlsBar={false}
          showTileCacheIndicator={false}
          showGridOverlay={false}
        />

        {/* Fullscreen Mode Clean Header Bar */}
        {isFullScreenMap ? (
          <div
            style={{
              position: 'absolute',
              top: 14,
              left: 14,
              right: 14,
              zIndex: 999999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              pointerEvents: 'none',
            }}
          >
            {/* Exit Full Map Button */}
            <button
              type="button"
              onClick={() => setIsFullScreenMap(false)}
              style={{
                pointerEvents: 'auto',
                padding: '8px 14px',
                borderRadius: 'var(--radius-pill)',
                background: 'var(--card-glass)',
                backdropFilter: 'var(--blur)',
                WebkitBackdropFilter: 'var(--blur)',
                border: '1px solid var(--border)',
                fontSize: 11,
                fontWeight: 800,
                color: 'var(--text)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
              }}
            >
              <Minimize2 size={13} strokeWidth={2.5} className="text-[var(--copper)]" />
              <span>{t('route.exit_full')}</span>
            </button>

            {/* Right: Fit Route (if active) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, pointerEvents: 'auto' }}>
              {activeRoute && (
                <button
                  type="button"
                  onClick={() => triggerRecenterOnUser()}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-pill)',
                    background: 'var(--card-glass)',
                    backdropFilter: 'var(--blur)',
                    WebkitBackdropFilter: 'var(--blur)',
                    border: '1px solid var(--border)',
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'var(--copper)',
                    cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  <Route size={12} strokeWidth={2} />
                  <span>{t('route.fit_route')}</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Normal Embed: Fullscreen Expand Overlay Button */
          <button
            type="button"
            onClick={() => setIsFullScreenMap(true)}
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              zIndex: 400,
              padding: '6px 12px',
              borderRadius: 'var(--radius-pill)',
              background: 'var(--card-glass)',
              backdropFilter: 'var(--blur)',
              WebkitBackdropFilter: 'var(--blur)',
              border: '1px solid var(--border)',
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--text)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            }}
          >
            <Maximize2 size={12} strokeWidth={2} className="text-[var(--copper)]" />
            <span>{t('route.full_map')}</span>
          </button>
        )}
      </div>

      {/* ── Road Route Planner ── */}
      <div className="card-glass" style={{ padding: '16px 18px', position: 'relative' }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>{t('route.planner_title')}</div>

        {/* Live Search Input with Nominatim Geocoder */}
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <input
            type="text"
            placeholder={t('route.search_placeholder')}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchResults(true);
            }}
            onFocus={() => {
              if (searchQuery.length >= 2 || searchResults.length > 0) setShowSearchResults(true);
            }}
            style={{
              width: '100%',
              paddingLeft: 34,
              paddingRight: searchQuery ? 32 : 12,
            }}
          />
          <Search
            size={14}
            strokeWidth={2}
            style={{
              position: 'absolute',
              left: 11,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              pointerEvents: 'none',
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setShowSearchResults(false);
              }}
              style={{
                position: 'absolute',
                right: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 0,
                cursor: 'pointer',
                color: 'var(--text-muted)',
                padding: 2,
              }}
            >
              <X size={14} />
            </button>
          )}

          {/* Autocomplete Dropdown List */}
          {showSearchResults && searchResults.length > 0 && (
            <div
              className="card-glass"
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                zIndex: 600,
                marginTop: 4,
                maxHeight: 250,
                overflowY: 'auto',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-card)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {searchResults.map((item) => {
                const distM = calculateDistanceMeters(
                  currentGPS.latitude,
                  currentGPS.longitude,
                  item.lat,
                  item.lng
                );
                const distKm = Math.round(distM / 1000);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectLocation(item)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '9px 12px',
                      background: 'transparent',
                      border: 0,
                      borderBottom: '1px solid var(--border-soft)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-warm)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <MapPin size={13} strokeWidth={2} style={{ color: 'var(--copper)', flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.name}
                        </div>
                        <div style={{ fontSize: 9, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.description}
                        </div>
                      </div>
                    </div>
                    <span style={{ fontSize: 9, fontFamily: 'monospace', color: 'var(--copper)', flexShrink: 0, marginLeft: 8, fontWeight: 700 }}>
                      {distKm} km
                    </span>
                  </button>
                );
              })}
              {isSearchingLive && (
                <div style={{ padding: '8px 12px', fontSize: 9, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Loader2 size={11} className="spinning" />
                  <span>Searching real locations on OpenStreetMap…</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick Hub Chips */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 12, paddingBottom: 2 }}>
          {STRATEGIC_HUBS.slice(0, 6).map((hub) => (
            <button
              key={hub.id}
              type="button"
              onClick={() => computeToHub(hub)}
              style={{
                flexShrink: 0,
                padding: '5px 12px',
                borderRadius: 'var(--radius-pill)',
                border: '1px solid',
                borderColor: selectedHub === hub.id ? 'var(--copper)' : 'var(--border)',
                background: selectedHub === hub.id ? 'var(--copper-10)' : 'var(--card)',
                color: selectedHub === hub.id ? 'var(--copper)' : 'var(--text-muted)',
                fontSize: 10,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {hub.name.split(' ')[0]} Hub
            </button>
          ))}
        </div>

        {/* Compute CTA */}
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            const hub = STRATEGIC_HUBS.find((h) => h.id === selectedHub);
            if (hub) computeToHub(hub);
          }}
          disabled={!selectedHub || isRoutingLoading}
          style={{ width: '100%', minHeight: 42, fontSize: 11, fontWeight: 700 }}
        >
          {isRoutingLoading ? (
            <>
              <Loader2 size={14} className="spinning" />
              <span>{t('route.calculating')}</span>
            </>
          ) : (
            <>
              <Route size={14} strokeWidth={2} />
              <span>{t('route.engage_nav')}</span>
            </>
          )}
        </button>

        {routingError && (
          <div
            style={{
              marginTop: 10,
              padding: '10px 12px',
              background: 'var(--danger-10)',
              borderRadius: 'var(--radius-card)',
              fontSize: 10,
              color: 'var(--danger)',
            }}
          >
            {routingError}
          </div>
        )}
      </div>

      {/* ── Pre-configured Tactical Routes ── */}
      <section>
        <div className="eyebrow" style={{ marginBottom: 8, padding: '0 2px' }}>Verified Sector Routes</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {TACTICAL_ROUTES.map((route) => {
            const isActive = activeRoute?.id === route.id;
            return (
              <div
                key={route.id}
                className="card card-hover"
                onClick={() => setActiveRoute(route)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '6px 1fr auto',
                  alignItems: 'center',
                  gap: 12,
                  padding: '13px 15px',
                  background: isActive ? 'var(--copper-10)' : 'var(--card)',
                  borderColor: isActive ? 'var(--copper)' : 'var(--border)',
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: route.hazardCount > 0 ? 'var(--warning)' : 'var(--success)',
                  }}
                />
                <div>
                  <div className="font-title" style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-heading)' }}>{route.name}</div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>
                    {route.distanceKm} km · ~{route.estMinutes} min
                    {route.hazardCount > 0 ? ` · ${route.hazardCount} hazard noted` : ' · Clear'}
                    {route.isOfflineCached && <span style={{ marginLeft: 6, color: 'var(--success)' }}>· Cached</span>}
                  </div>
                </div>
                <CheckCircle2
                  size={16}
                  strokeWidth={2}
                  style={{ color: isActive ? 'var(--copper)' : 'var(--border)' }}
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Hazards Along Route ── */}
      {nearbyHazards.length > 0 && (
        <div
          style={{
            padding: '12px 14px',
            background: 'var(--danger-10)',
            border: '1px solid rgba(194,59,46,0.25)',
            borderRadius: 'var(--radius-card)',
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
          }}
        >
          <AlertTriangle size={16} strokeWidth={2} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--danger)' }}>
              {nearbyHazards.length} advisory hazard{nearbyHazards.length > 1 ? 's' : ''} on corridor
            </div>
            {nearbyHazards.slice(0, 2).map((h) => (
              <div key={h.id} style={{ fontSize: 9, color: 'var(--danger)', opacity: 0.85, marginTop: 2 }}>
                {h.title}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Start HUD Navigation Button ── */}
      {activeRoute && (
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => startDrivingJourney(activeRoute)}
          style={{ width: '100%', minHeight: 44, fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase' }}
        >
          <span>{t('route.engage_nav')}</span>
          <ChevronRight size={14} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
};
