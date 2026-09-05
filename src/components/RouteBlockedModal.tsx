import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  Ban,
  ShieldAlert,
  MapPin,
  User,
  Clock,
  Navigation,
  Volume2,
  VolumeX,
  Compass,
} from 'lucide-react';
import { BlockedRouteAlert } from '../types';
import { stopRouteBlockedAlarm } from '../services/alert-sound.service';

interface RouteBlockedModalProps {
  alert: BlockedRouteAlert;
  onAcknowledge: () => void;
}

export const RouteBlockedModal: React.FC<RouteBlockedModalProps> = ({ alert, onAcknowledge }) => {
  // Ensure audio is stopped if modal unmounts
  useEffect(() => {
    return () => {
      stopRouteBlockedAlarm();
    };
  }, []);

  const handleAcknowledge = () => {
    stopRouteBlockedAlarm();
    onAcknowledge();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100000,
        background: 'rgba(0, 0, 0, 0.78)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 14,
      }}
      // Intentionally NOT dismissible by clicking outside - "it wont go away until clicked"
      onClick={(e) => e.stopPropagation()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 16 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        style={{
          width: '100%',
          maxWidth: 440,
          background: 'var(--card)',
          borderRadius: 'var(--radius-card)',
          border: '2px solid var(--danger)',
          boxShadow: '0 0 40px rgba(194, 59, 46, 0.45), 0 24px 60px rgba(0, 0, 0, 0.65)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg-warm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'var(--danger-10)',
                border: '1px solid var(--danger)',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <AlertTriangle size={15} strokeWidth={2.5} style={{ color: 'var(--danger)' }} />
            </div>
            <span
              className="font-title"
              style={{
                fontSize: 14,
                fontWeight: 800,
                letterSpacing: '-0.2px',
                color: 'var(--danger)',
                fontFamily: 'var(--font-heading)',
                textTransform: 'uppercase',
              }}
            >
              Hazard Warning • Route Blocked
            </span>
          </div>

          <span
            className="pill pill-danger"
            style={{
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: '0.05em',
              animation: 'pulse 1.4s ease-in-out infinite',
            }}
          >
            ● LIVE HAZARD
          </span>
        </div>

        {/* Scrollable Content Body */}
        <div
          style={{
            padding: '16px 18px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          {/* Main High-Visibility Route Blocked Banner */}
          <div
            style={{
              padding: '16px 16px',
              borderRadius: 'var(--radius-card)',
              background: 'linear-gradient(135deg, rgba(194,59,46,0.18) 0%, rgba(184,112,61,0.12) 100%)',
              border: '1.5px solid var(--danger)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'var(--danger)',
                color: '#FFFFFF',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
                boxShadow: '0 0 16px rgba(194,59,46,0.5)',
              }}
            >
              <Ban size={22} strokeWidth={2.5} />
            </div>
            <div>
              <div
                className="font-title"
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  color: 'var(--danger)',
                  letterSpacing: '-0.2px',
                  lineHeight: 1.2,
                  fontFamily: 'var(--font-heading)',
                }}
              >
                THIS ROUTE IS BLOCKED RIGHT NOW
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--text)',
                  marginTop: 4,
                  lineHeight: 1.4,
                  opacity: 0.9,
                }}
              >
                Another field operator navigating this corridor has reported an active obstacle. Transits along this road segment are compromised.
              </div>
            </div>
          </div>

          {/* Detailed Incident & Reporter Profile (Matches User Details Layout) */}
          <div
            style={{
              background: 'var(--bg-warm)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-card)',
              overflow: 'hidden',
            }}
          >
            {[
              {
                icon: ShieldAlert,
                label: 'Reported Problem / Hazard',
                value: alert.title,
                badge: alert.category.toUpperCase().replace('_', ' '),
                badgeClass: 'pill-danger',
              },
              {
                icon: User,
                label: 'Reporting Field Operator',
                value: alert.reportedBy,
                subValue: `${alert.reporterRole || 'Field Operator'} · ${alert.reporterUnitId || 'Tactical Unit'}`,
                badge: alert.reporterBadge || 'FIELD REPORT',
                badgeClass: 'pill-copper',
              },
              {
                icon: Navigation,
                label: 'Affected Route / Corridor',
                value: alert.affectedRouteName,
                subValue: alert.districtRoadSegment,
              },
              {
                icon: Compass,
                label: 'Incident Coordinates',
                value: alert.coordinates,
              },
              {
                icon: Clock,
                label: 'Time Reported',
                value: 'Just now (Live Telemetry Uplink)',
              },
            ].map(({ icon: Icon, label, value, subValue, badge, badgeClass }, idx) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: '10px 14px',
                  borderTop: idx > 0 ? '1px solid var(--border-soft)' : undefined,
                  fontSize: 11,
                }}
              >
                <Icon
                  size={15}
                  strokeWidth={2}
                  style={{ color: 'var(--danger)', marginTop: 2, flexShrink: 0 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 9,
                      color: 'var(--text-muted)',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 6,
                    }}
                  >
                    <span>{label}</span>
                    {badge && (
                      <span className={`pill ${badgeClass || 'pill-muted'}`} style={{ fontSize: 7, padding: '1px 5px' }}>
                        {badge}
                      </span>
                    )}
                  </div>
                  <div
                    className="font-title"
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: 'var(--text)',
                      marginTop: 2,
                      wordBreak: 'break-word',
                      fontFamily: 'var(--font-heading)',
                    }}
                  >
                    {value}
                  </div>
                  {subValue && (
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
                      {subValue}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Reporter Note / Description Card */}
          {alert.description && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-card)',
                background: 'var(--card)',
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>
                Operator Observations:
              </div>
              <div style={{ fontSize: 11, color: 'var(--text)', lineHeight: 1.45, fontStyle: 'italic' }}>
                "{alert.description}"
              </div>
            </div>
          )}

          {/* Photo Preview if attached */}
          {alert.photo && (
            <div style={{ borderRadius: 'var(--radius-card)', overflow: 'hidden', border: '1px solid var(--border)' }}>
              <img
                src={alert.photo}
                alt="Obstacle proof"
                style={{ width: '100%', maxHeight: 150, objectFit: 'cover', display: 'block' }}
              />
            </div>
          )}
        </div>

        {/* Modal Action Footer - MUST CLICK TO DISMISS */}
        <div
          style={{
            padding: '14px 18px',
            borderTop: '1px solid var(--border)',
            background: 'var(--bg-warm)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <button
            type="button"
            onClick={handleAcknowledge}
            className="btn btn-danger"
            style={{
              width: '100%',
              minHeight: 46,
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              boxShadow: '0 4px 20px rgba(194,59,46,0.35)',
              cursor: 'pointer',
            }}
          >
            <VolumeX size={16} strokeWidth={2.2} />
            <span>ACKNOWLEDGE HAZARD & SILENCE ALARM</span>
          </button>

          <div style={{ textAlign: 'center', fontSize: 9, color: 'var(--text-muted)' }}>
            ⚠️ Tap acknowledge to confirm situation awareness and silence emergency klaxon.
          </div>
        </div>
      </motion.div>
    </div>
  );
};
