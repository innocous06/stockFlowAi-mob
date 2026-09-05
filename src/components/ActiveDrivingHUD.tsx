import React, { useState } from 'react';
import {
  ArrowUp,
  CornerUpLeft,
  CornerUpRight,
  GitFork,
  RotateCw,
  Volume2,
  VolumeX,
  X,
  AlertTriangle,
  Flag,
  Crosshair,
  Layers,
  Check,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { TacticalMap } from './TacticalMap';
import { calculateDistanceMeters } from '../services/gps-geojson.service';
import { speakInstruction } from '../services/voice-guidance.service';

export const ActiveDrivingHUD: React.FC = () => {
  const { currentUser } = useAuth();
  const {
    activeRoute,
    currentGPS,
    currentStepIndex,
    stopDrivingJourney,
    voiceGuidanceEnabled,
    setVoiceGuidanceEnabled,
    triggerRecenterOnUser,
    createIncident,
    broadcastIncident,
    showToast,
    mapLayer,
    setMapLayer,
  } = useApp();

  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [showQuickHazardModal, setShowQuickHazardModal] = useState(false);
  const [hazardCategory, setHazardCategory] = useState<'landslide' | 'roadblock' | 'bridge_damage' | 'flood_zone'>('landslide');

  if (!activeRoute) return null;

  const steps = activeRoute.steps || [];
  const currentStep = steps[currentStepIndex] || steps[0] || {
    instruction: `Proceed along ${activeRoute.roadSegment || activeRoute.name}`,
    distanceMeters: 500,
    durationSeconds: 120,
    maneuver: 'straight',
    roadName: activeRoute.roadSegment || 'Main Highway',
    location: activeRoute.waypoints[0],
  };

  const nextStep = steps[currentStepIndex + 1] || null;

  // Remaining distance and time
  const remainingDistanceMeters = currentStep
    ? Math.round(steps.slice(currentStepIndex).reduce((acc, s) => acc + s.distanceMeters, 0))
    : Math.round(activeRoute.distanceKm * 1000);

  const remainingKm = Math.max(0.1, Number((remainingDistanceMeters / 1000).toFixed(1)));
  const remainingMinutes = Math.max(1, Math.round((remainingKm / 45) * 60));

  const arrivalDate = new Date(Date.now() + remainingMinutes * 60000);
  const arrivalTimeStr = arrivalDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Distance to next maneuver
  const distanceToManeuver = currentStep.location
    ? calculateDistanceMeters(
        currentGPS.latitude,
        currentGPS.longitude,
        currentStep.location[0],
        currentStep.location[1]
      )
    : currentStep.distanceMeters;

  const renderManeuverIcon = (maneuver: string) => {
    switch (maneuver) {
      case 'turn-left':
        return <CornerUpLeft size={28} strokeWidth={2.2} style={{ color: 'var(--copper)' }} />;
      case 'turn-right':
        return <CornerUpRight size={28} strokeWidth={2.2} style={{ color: 'var(--copper)' }} />;
      case 'fork-left':
      case 'fork-right':
        return <GitFork size={28} strokeWidth={2.2} style={{ color: 'var(--copper)' }} />;
      case 'roundabout':
        return <RotateCw size={28} strokeWidth={2.2} style={{ color: 'var(--copper)' }} />;
      case 'arrive':
        return <Flag size={28} strokeWidth={2.2} style={{ color: 'var(--success)' }} />;
      default:
        return <ArrowUp size={28} strokeWidth={2.2} style={{ color: 'var(--copper)' }} />;
    }
  };

  const formatDistance = (meters: number) => {
    if (meters < 50) return 'Turn Now';
    if (meters < 1000) return `In ${Math.round(meters / 10) * 10} m`;
    return `In ${(meters / 1000).toFixed(1)} km`;
  };

  const handleQuickReportHazard = async () => {
    try {
      const repId = `IR-HUD-${Date.now()}`;
      const title = `Road Hazard: ${hazardCategory.toUpperCase().replace('_', ' ')}`;
      const segment = activeRoute.roadSegment || 'En Route Highway';

      await createIncident({
        report_id: repId,
        idempotency_key: `idemp_${repId}`,
        tenant_id: 'TEN-ACME-PHARMA',
        revision: 1,
        title,
        category: hazardCategory,
        severity: 'critical',
        district_road_segment: segment,
        description: `Rapid hazard beacon broadcasted via Active Driving HUD during transit on ${segment}.`,
        observation_time: new Date().toISOString(),
        latitude: currentGPS.latitude,
        longitude: currentGPS.longitude,
        altitude_meters: currentGPS.altitude || 0,
        accuracy_meters: currentGPS.accuracy || 10,
        gps_status: 'high_precision',
        geo_json: {
          type: 'Point',
          coordinates: [currentGPS.longitude, currentGPS.latitude],
        },
        locationName: segment,
        reportedBy: 'Lead Operator (HUD)',
        photos: [],
        photo_attachments: [],
        sync_stage: 'LOCAL_ONLY',
        retry_count: 0,
      });

      try {
        broadcastIncident({
          messageId: repId,
          title,
          category: hazardCategory,
          severity: 'critical',
          description: `Rapid hazard reported on ${segment} at coordinates ${currentGPS.latitude.toFixed(5)}°N, ${currentGPS.longitude.toFixed(5)}°E`,
          photo: null,
          reportedBy: currentUser.name,
          role: currentUser.role,
          unitId: currentUser.unitId,
          badge: currentUser.badge,
          senderUserId: currentUser.id,
          routeId: activeRoute.id,
          affectedRouteName: activeRoute.name,
          district_road_segment: activeRoute.roadSegment || segment,
          latitude: currentGPS.latitude,
          longitude: currentGPS.longitude,
          coordinates: `${currentGPS.latitude.toFixed(5)}°N, ${currentGPS.longitude.toFixed(5)}°E`,
        });
      } catch (bcErr) {
        console.warn('Realtime broadcast failed:', bcErr);
      }

      setShowQuickHazardModal(false);
      showToast('⚠️ Rapid hazard beacon broadcasted!');
    } catch (err) {
      console.error('Failed to report hazard:', err);
      showToast('Failed to report hazard');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 500,
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
        overflow: 'hidden',
      }}
    >
      {/* Fullscreen Map Background */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <TacticalMap
          heightClass="h-full w-full"
          showControlsBar={false}
          showTileCacheIndicator={false}
          showGridOverlay={false}
        />
      </div>

      {/* Top Turn-by-Turn Maneuver Card */}
      <header style={{ position: 'relative', zIndex: 20, paddingTop: 12, paddingLeft: 12, paddingRight: 12, pointerEvents: 'none' }}>
        <div
          className="card-glass"
          style={{
            maxWidth: 480,
            margin: '0 auto',
            pointerEvents: 'auto',
            padding: '14px 16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            {/* Maneuver Graphic */}
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 'var(--radius-card)',
                background: 'var(--bg-warm)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {renderManeuverIcon(currentStep.maneuver)}
            </div>

            {/* Instruction Details */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="eyebrow" style={{ fontSize: 10 }}>
                  {formatDistance(distanceToManeuver)}
                </span>
                {activeRoute.roadSegment && (
                  <span className="pill pill-muted" style={{ fontSize: 8 }}>
                    {activeRoute.roadSegment}
                  </span>
                )}
              </div>

              <div className="font-title" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', lineHeight: 1.25, marginTop: 2, fontFamily: 'var(--font-heading)' }}>
                {currentStep.instruction}
              </div>

              {nextStep && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, fontSize: 11, color: 'var(--text-muted)' }}>
                  <span className="pill pill-copper" style={{ fontSize: 7, padding: '1px 5px' }}>
                    THEN
                  </span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {nextStep.instruction}
                  </span>
                </div>
              )}
            </div>

            {/* Exit HUD Button */}
            <button
              type="button"
              onClick={stopDrivingJourney}
              className="btn btn-ghost btn-sm"
              style={{ padding: 6, minHeight: 'auto', borderRadius: '50%' }}
              title="Exit Guidance"
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>
        </div>
      </header>

      {/* Floating Action Rail (Right side) */}
      <aside
        style={{
          position: 'absolute',
          right: 14,
          top: 130,
          zIndex: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          pointerEvents: 'auto',
        }}
      >
        {/* Recenter GPS */}
        <button
          type="button"
          onClick={triggerRecenterOnUser}
          className="btn btn-secondary"
          style={{
            width: 42,
            height: 42,
            padding: 0,
            borderRadius: '50%',
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          }}
          title="Recenter Camera"
        >
          <Crosshair size={18} strokeWidth={2} />
        </button>

        {/* Voice Toggle */}
        <button
          type="button"
          onClick={() => {
            const next = !voiceGuidanceEnabled;
            setVoiceGuidanceEnabled(next);
            if (next) speakInstruction(currentStep.instruction, true);
            showToast(next ? 'Voice Guidance Enabled' : 'Voice Guidance Muted');
          }}
          className={`btn ${voiceGuidanceEnabled ? 'btn-primary' : 'btn-secondary'}`}
          style={{
            width: 42,
            height: 42,
            padding: 0,
            borderRadius: '50%',
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          }}
          title="Voice Guidance"
        >
          {voiceGuidanceEnabled ? <Volume2 size={18} strokeWidth={2} /> : <VolumeX size={18} strokeWidth={2} />}
        </button>

        {/* Rapid Hazard Beacon */}
        <button
          type="button"
          onClick={() => setShowQuickHazardModal(true)}
          className="btn btn-danger"
          style={{
            width: 42,
            height: 42,
            padding: 0,
            borderRadius: '50%',
            boxShadow: '0 4px 16px rgba(194,59,46,0.35)',
          }}
          title="Report Hazard"
        >
          <AlertTriangle size={18} strokeWidth={2.2} />
        </button>

        {/* Map Layers */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setShowLayerMenu(!showLayerMenu)}
            className="btn btn-secondary"
            style={{
              width: 42,
              height: 42,
              padding: 0,
              borderRadius: '50%',
              boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            }}
            title="Map Layers"
          >
            <Layers size={18} strokeWidth={2} />
          </button>

          {showLayerMenu && (
            <div
              className="card-glass"
              style={{
                position: 'absolute',
                right: 50,
                top: 0,
                width: 170,
                padding: 6,
                zIndex: 30,
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
              }}
            >
              {[
                { id: 'google_hybrid', label: 'Satellite HD' },
                { id: 'google_terrain', label: 'Mountain Topo' },
                { id: 'tactical_dark', label: 'Tactical Dark' },
                { id: 'osm_standard', label: 'Street Map' },
              ].map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => {
                    setMapLayer(l.id as any);
                    setShowLayerMenu(false);
                  }}
                  className="btn btn-ghost btn-sm"
                  style={{
                    width: '100%',
                    justifyContent: 'space-between',
                    fontSize: 10,
                    fontWeight: 600,
                    color: mapLayer === l.id ? 'var(--copper)' : 'var(--text)',
                  }}
                >
                  <span>{l.label}</span>
                  {mapLayer === l.id && <Check size={12} strokeWidth={2.5} />}
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* Bottom Trip Telemetry Cockpit */}
      <footer style={{ marginTop: 'auto', position: 'relative', zIndex: 20, padding: '0 12px 14px', pointerEvents: 'none' }}>
        <div
          className="card-glass"
          style={{
            maxWidth: 480,
            margin: '0 auto',
            pointerEvents: 'auto',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          }}
        >
          {/* Trip Summary */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
            <div>
              <span style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.5px', color: 'var(--text)' }} className="mono">
                {arrivalTimeStr}
              </span>
              <span className="eyebrow" style={{ fontSize: 8, display: 'block', marginTop: 1 }}>
                Estimated Arrival
              </span>
            </div>
            <div style={{ width: 1, height: 28, background: 'var(--border)' }} />
            <div>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }} className="mono">
                {remainingMinutes} <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>min</span>
              </span>
              <span style={{ fontSize: 9, color: 'var(--text-muted)', display: 'block', marginTop: 1 }}>
                {remainingKm} km left
              </span>
            </div>
          </div>

          {/* Current Speed & Exit Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)' }} className="mono">
                {Math.round(currentGPS.speed || 0)}
              </span>
              <span style={{ fontSize: 8, color: 'var(--text-muted)', fontWeight: 700, display: 'block' }}>
                KM/H
              </span>
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={stopDrivingJourney}
              style={{ minHeight: 34, padding: '0 14px', fontSize: 10, fontWeight: 800 }}
            >
              End Trip
            </button>
          </div>
        </div>
      </footer>

      {/* Quick Hazard Modal */}
      {showQuickHazardModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'var(--blur)',
            WebkitBackdropFilter: 'var(--blur)',
          }}
        >
          <div
            className="card-glass"
            style={{
              maxWidth: 380,
              width: '100%',
              padding: 20,
              boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={18} strokeWidth={2.2} style={{ color: 'var(--danger)' }} />
                <span className="font-title" style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-heading)' }}>Rapid Hazard Beacon</span>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setShowQuickHazardModal(false)}
                style={{ padding: 4, minHeight: 'auto', borderRadius: '50%' }}
              >
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 14 }}>
              Transmits immediate downstream warning tag at current GPS position:
              <br />
              <span style={{ fontWeight: 700, color: 'var(--text)', fontFamily: 'monospace', fontSize: 10 }}>
                {currentGPS.latitude.toFixed(5)}°N, {currentGPS.longitude.toFixed(5)}°E
              </span>
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
              {[
                { id: 'landslide', label: 'Landslide' },
                { id: 'roadblock', label: 'Road Blocked' },
                { id: 'bridge_damage', label: 'Bridge Damage' },
                { id: 'flood_zone', label: 'Flash Flood' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setHazardCategory(cat.id as any)}
                  className={`btn ${hazardCategory === cat.id ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                  style={{ width: '100%', fontSize: 10 }}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowQuickHazardModal(false)}
                style={{ flex: 1, minHeight: 38 }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleQuickReportHazard}
                style={{ flex: 1, minHeight: 38 }}
              >
                Transmit Alert
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
