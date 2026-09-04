import React, { useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { TacticalMap } from './TacticalMap';
import {
  Crosshair,
  MapPin,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Route,
  Maximize2,
  Sparkles,
} from 'lucide-react';
import { TACTICAL_ROUTES } from '../services/mockData';

// Quick-pick hub list
const HUBS = [
  { id: 'h1', name: 'Guwahati Hub', lat: 26.1445, lng: 91.7362 },
  { id: 'h2', name: 'Shillong DC', lat: 25.5788, lng: 91.8933 },
  { id: 'h3', name: 'Dibrugarh Depot', lat: 27.4728, lng: 94.9120 },
  { id: 'h4', name: 'Tezpur Logistics', lat: 26.6338, lng: 92.7926 },
  { id: 'h5', name: 'Itanagar Base', lat: 27.0844, lng: 93.6053 },
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
    setIsFullScreenMap,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHub, setSelectedHub] = useState<string | null>(null);

  const computeToHub = useCallback(
    async (hub: (typeof HUBS)[number]) => {
      setSelectedHub(hub.id);
      setSearchQuery(hub.name);
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

      {/* ── Tactical Map Card (Clean Embed without overlapping controls) ── */}
      <div
        className="card"
        style={{
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
        {/* Fullscreen Expand Overlay Button */}
        <button
          type="button"
          onClick={() => setIsFullScreenMap(true)}
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            zIndex: 400,
            padding: '5px 10px',
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
            gap: 5,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          <Maximize2 size={11} strokeWidth={2} />
          <span>Full Map</span>
        </button>
      </div>

      {/* ── Road Route Planner ── */}
      <div className="card-glass" style={{ padding: '16px 18px' }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>Transit Corridor Planner</div>

        <input
          type="text"
          placeholder="Search distribution center, depot, or road sector…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ marginBottom: 10 }}
        />

        {/* Quick Hub Chips */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 12, paddingBottom: 2 }}>
          {HUBS.map((hub) => (
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
              {hub.name}
            </button>
          ))}
        </div>

        {/* Compute CTA */}
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            const hub = HUBS.find((h) => h.id === selectedHub);
            if (hub) computeToHub(hub);
          }}
          disabled={!selectedHub || isRoutingLoading}
          style={{ width: '100%', minHeight: 42, fontSize: 11, fontWeight: 700 }}
        >
          {isRoutingLoading ? (
            <>
              <Loader2 size={14} className="spinning" />
              <span>Calculating Optimal Corridor…</span>
            </>
          ) : (
            <>
              <Route size={14} strokeWidth={2} />
              <span>Compute Road Corridor</span>
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
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{route.name}</div>
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
          <span>Engage Turn-by-Turn HUD</span>
          <ChevronRight size={14} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
};
