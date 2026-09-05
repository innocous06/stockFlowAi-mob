import React from 'react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import {
  MapPin,
  Clock,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  Navigation,
  Package,
  CheckCircle2,
  Gauge,
} from 'lucide-react';

const CLEARANCE_PCT = 94.6;
const DIST_KM = 8.4;

export const DriverHome: React.FC = () => {
  const {
    activeRoute,
    incidents,
    syncQueue,
    currentGPS,
    setCurrentTab,
    startDrivingJourney,
    isOnline,
    networkSimulationMode,
  } = useApp();
  const { t } = useLanguage();

  const pendingCount = syncQueue.filter((i) => i.status === 'pending' || i.status === 'failed').length;
  const activeIncidents = incidents.filter((i) => i.syncStatus !== 'failed');
  const recentIncidents = activeIncidents.slice(0, 3);

  const speedKph = currentGPS.speed ?? 0;
  const altM = currentGPS.altitude ?? 0;

  const CATEGORY_LABEL: Record<string, string> = {
    landslide: 'Landslide',
    roadblock: 'Roadblock',
    vehicle_breakdown: 'Breakdown',
    weather_hazard: 'Weather',
    medical_emergency: 'Medical',
    bridge_damage: 'Bridge Damage',
    hostile_contact: 'Hostile',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* ── Active Corridor Assignment Card ── */}
      <div className="card-glass" style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 4 }}>{t('home.designated_corridor')}</div>
            <h2 className="font-title" style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.3px', lineHeight: 1.25, color: 'var(--text)', fontFamily: 'var(--font-heading)' }}>
              {activeRoute?.name ?? t('home.no_route')}
            </h2>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
              <MapPin size={12} strokeWidth={2} style={{ color: 'var(--copper)' }} />
              {activeRoute?.destination ?? '—'}
            </div>
          </div>
          <span className={`pill ${isOnline ? 'pill-success' : 'pill-warning'}`}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />
            {isOnline ? 'Online RTK' : networkSimulationMode === 'spotty' ? 'Spotty' : 'Airgap'}
          </span>
        </div>

        {/* Route Metrics (Neutral, crisp numbers — no gaudy green text) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 1,
            background: 'var(--border)',
            borderRadius: 'var(--radius-card)',
            overflow: 'hidden',
            marginBottom: 16,
          }}
        >
          {[
            { label: t('home.clearance'), value: `${CLEARANCE_PCT}%`, sub: t('home.sector_pass_rate') },
            { label: t('home.distance'), value: `${DIST_KM} km`, sub: t('home.direct_route') },
            { label: t('home.outbox'), value: pendingCount > 0 ? `${pendingCount} ${t('home.queued')}` : t('home.synchronized'), sub: t('home.buffered_updates') },
          ].map(({ label, value, sub }) => (
            <div
              key={label}
              style={{
                background: 'var(--card)',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {label}
              </span>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }} className="mono">
                {value}
              </span>
              <span style={{ fontSize: 8, color: 'var(--text-faint)' }}>{sub}</span>
            </div>
          ))}
        </div>

        {/* Primary CTA Button (Fully rounded pill with subtle tactile feel) */}
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setCurrentTab('resilient-navigation');
            startDrivingJourney(activeRoute ?? undefined);
          }}
          style={{
            width: '100%',
            minHeight: 44,
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            borderRadius: 'var(--radius-pill)',
          }}
        >
          <span>{t('home.engage_navigation')}</span>
          <ChevronRight size={14} strokeWidth={2.5} />
        </button>
      </div>

      {/* ── Telemetry Grid (Neutral high-contrast numbers) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {[
          {
            eyebrow: t('home.live_speed'),
            value: `${Math.round(speedKph)}`,
            unit: 'km/h',
            icon: <Gauge size={15} strokeWidth={2} style={{ color: 'var(--copper)' }} />,
            sub: t('home.gnss_stream'),
          },
          {
            eyebrow: t('home.altitude'),
            value: `${Math.round(altM)}`,
            unit: 'm',
            icon: <TrendingUp size={15} strokeWidth={2} style={{ color: 'var(--copper)' }} />,
            sub: `±${currentGPS.accuracy.toFixed(1)}m precision`,
          },
        ].map(({ eyebrow, value, unit, icon, sub }) => (
          <div key={eyebrow} className="card-glass" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span className="eyebrow">{eyebrow}</span>
              {icon}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.8px', color: 'var(--text)' }} className="mono">
                {value}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{unit}</span>
            </div>
            <div style={{ fontSize: 9, color: 'var(--text-faint)', marginTop: 4 }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* ── Transit Schedule Summary ── */}
      {activeRoute && (
        <div className="card-glass" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 'var(--radius-pill)',
              background: 'var(--copper-10)',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
            }}
          >
            <Clock size={15} strokeWidth={2} style={{ color: 'var(--copper)' }} />
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {t('home.transit_estimate')}
            </div>
            <div className="font-title" style={{ fontSize: 14, fontWeight: 700, marginTop: 1, color: 'var(--text)', fontFamily: 'var(--font-heading)' }}>
              ~{activeRoute.estMinutes} min transit &nbsp;·&nbsp; {activeRoute.distanceKm} km
            </div>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{t('home.hazards')}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginTop: 1 }}>
              {activeRoute.hazardCount} {t('home.noted')}
            </div>
          </div>
        </div>
      )}

      {/* ── Recent Reports ── */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, padding: '0 2px' }}>
          <div className="eyebrow">{t('home.field_feed')}</div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setCurrentTab('incident-reporting')}
            style={{ fontSize: 10 }}
          >
            {t('home.view_all')} ({incidents.length}) <ChevronRight size={11} />
          </button>
        </div>

        {recentIncidents.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {recentIncidents.map((inc) => (
              <div
                key={inc.id}
                className="card card-hover"
                onClick={() => setCurrentTab('incident-reporting')}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '6px 1fr auto',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: inc.severity === 'critical' ? 'var(--danger)' : inc.severity === 'high' ? 'var(--danger)' : 'var(--warning)',
                  }}
                />
                <div>
                  <div className="font-title" style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-heading)' }}>{inc.title}</div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 1 }}>
                    {CATEGORY_LABEL[inc.category] ?? inc.category} · {inc.locationName}
                  </div>
                </div>
                <span className={`pill ${inc.syncStatus === 'synced' ? 'pill-success' : 'pill-muted'}`}>
                  {inc.syncStatus === 'synced' ? t('home.synced') : t('home.queued')}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div
            className="card-glass"
            style={{ padding: '24px 16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
          >
            <AlertTriangle size={22} strokeWidth={1.8} style={{ color: 'var(--text-faint)', marginBottom: 6 }} />
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>{t('home.no_hazards')}</div>
          </div>
        )}
      </section>
    </div>
  );
};
