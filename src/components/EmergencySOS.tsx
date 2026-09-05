import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { AlertOctagon, ShieldAlert, HeartPulse, Wrench, Shield, CheckCircle2, User } from 'lucide-react';

export const EmergencySOS: React.FC = () => {
  const { currentGPS, activeSOS, triggerSOS, cancelSOS, showToast } = useApp();
  const { currentUser } = useAuth();
  const { t } = useLanguage();

  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [medicalNeeded, setMedicalNeeded] = useState(false);
  const [vehicleDisabled, setVehicleDisabled] = useState(false);
  const [threatPresent, setThreatPresent] = useState(false);
  const [transmissionBurst, setTransmissionBurst] = useState(1);

  const holdIntervalRef = useRef<any>(null);
  const isCancelLockedRef = useRef<boolean>(false);

  // Stop holding helper
  const stopHolding = useCallback(() => {
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
    setIsHolding(false);
    setHoldProgress(0);
  }, []);

  // Hold-to-activate timer loop (2.0 seconds)
  useEffect(() => {
    if (isHolding && !activeSOS && !isCancelLockedRef.current) {
      holdIntervalRef.current = setInterval(() => {
        setHoldProgress((prev) => {
          if (prev >= 100) {
            stopHolding();
            triggerSOS({
              medical: medicalNeeded,
              disabled: vehicleDisabled,
              threat: threatPresent,
              driverName: currentUser.name,
              vehicleId: currentUser.unitId,
              role: currentUser.role,
              department: currentUser.department,
            });
            showToast(`🚨 SOS Distress Transponder Activated by ${currentUser.name}!`);
            return 0;
          }
          return prev + 5;
        });
      }, 100);
    } else {
      if (holdIntervalRef.current) {
        clearInterval(holdIntervalRef.current);
        holdIntervalRef.current = null;
      }
      setHoldProgress(0);
    }

    return () => {
      if (holdIntervalRef.current) {
        clearInterval(holdIntervalRef.current);
        holdIntervalRef.current = null;
      }
    };
  }, [isHolding, activeSOS, medicalNeeded, vehicleDisabled, threatPresent, triggerSOS, showToast, stopHolding, currentUser]);

  // Transmission burst interval when active
  useEffect(() => {
    if (!activeSOS) return;
    const interval = setInterval(() => setTransmissionBurst((p) => p + 1), 4000);
    return () => clearInterval(interval);
  }, [activeSOS]);

  // Cancel distress beacon with anti-retrigger lock
  const handleCancelSOS = () => {
    stopHolding();
    isCancelLockedRef.current = true;
    cancelSOS();
    showToast('Distress beacon deactivated');

    // 1500ms safety window prevents accidental re-trigger from lingering touch/click events
    setTimeout(() => {
      isCancelLockedRef.current = false;
    }, 1500);
  };

  // Safe pointer start
  const handleStartHold = (e: React.SyntheticEvent) => {
    if (isCancelLockedRef.current || activeSOS) {
      e.preventDefault();
      return;
    }
    setIsHolding(true);
  };

  const handleEndHold = (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault();
    stopHolding();
  };

  const conditions = [
    { id: 'medical', label: t('sos.medical'), Icon: HeartPulse, active: medicalNeeded, toggle: () => setMedicalNeeded((p) => !p) },
    { id: 'vehicle', label: t('sos.breakdown'), Icon: Wrench, active: vehicleDisabled, toggle: () => setVehicleDisabled((p) => !p) },
    { id: 'threat', label: t('sos.threat'), Icon: Shield, active: threatPresent, toggle: () => setThreatPresent((p) => !p) },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {activeSOS ? (
        /* ── ACTIVE BEACON SCREEN ── */
        <div
          className="card-glass"
          style={{
            border: '2px solid var(--danger)',
            padding: '22px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {/* Pulsing Beacon Header */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, paddingTop: 6 }}>
            <div style={{ position: 'relative', width: 68, height: 68, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  border: '2px solid var(--danger)',
                  animation: 'sos-ping 1.6s ease-out infinite',
                  opacity: 0.5,
                }}
              />
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: 'var(--danger)',
                  display: 'grid',
                  placeItems: 'center',
                  boxShadow: '0 0 24px rgba(194,59,46,0.45)',
                }}
              >
                <ShieldAlert size={24} strokeWidth={2.2} style={{ color: '#FFFFFF' }} />
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div className="eyebrow" style={{ color: 'var(--danger)', marginBottom: 3 }}>
                {t('sos.beacon_live')}
              </div>
              <h2 className="font-title" style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.3px', color: 'var(--text)', fontFamily: 'var(--font-heading)' }}>
                {t('sos.broadcasting_telemetry')}
              </h2>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                {t('sos.transmitting_desk')}
              </div>
            </div>
          </div>

          {/* Telemetry Details */}
          <div
            style={{
              background: 'var(--card)',
              borderRadius: 'var(--radius-card)',
              border: '1px solid var(--border)',
              overflow: 'hidden',
            }}
          >
            {[
              { label: t('sos.beacon_id'), value: activeSOS.id, highlight: 'var(--danger)' },
              { label: t('sos.operator'), value: activeSOS.driverName || currentUser.name, highlight: 'var(--copper)' },
              { label: t('sos.assigned_unit'), value: `${activeSOS.vehicleId || currentUser.unitId} (${currentUser.badge})` },
              { label: t('sos.sector_role'), value: `${currentUser.role}` },
              { label: t('sos.coordinates'), value: `${currentGPS.latitude.toFixed(5)}°N, ${currentGPS.longitude.toFixed(5)}°E` },
              { label: t('sos.accuracy_radius'), value: `±${Math.round(currentGPS.accuracy || 3)}m` },
              { label: t('sos.packet_tx'), value: `Burst #${transmissionBurst}`, highlight: 'var(--copper)' },
            ].map(({ label, value, highlight }, idx) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '11px 14px',
                  borderTop: idx > 0 ? '1px solid var(--border-soft)' : undefined,
                  fontSize: 11,
                }}
              >
                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{label}</span>
                <span style={{ color: highlight || 'var(--text)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {value}
                </span>
              </div>
            ))}
          </div>

          {/* Cancel SOS Button (Pill shaped with explicit event handling) */}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleCancelSOS}
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
            {t('sos.cancel_beacon')}
          </button>
        </div>
      ) : (
        /* ── STANDBY VIEW ── */
        <>
          {/* Header Card */}
          <div className="card-glass" style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 'var(--radius-pill)',
                  background: 'var(--danger-10)',
                  border: '1px solid rgba(194,59,46,0.25)',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                }}
              >
                <AlertOctagon size={18} strokeWidth={2} style={{ color: 'var(--danger)' }} />
              </div>
              <div>
                <h2 className="font-title" style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-heading)' }}>
                  {t('sos.title')}
                </h2>
                <div className="eyebrow" style={{ marginTop: 2, color: 'var(--text-muted)' }}>
                  {t('sos.safety_protocol')} · {currentUser.unitId}
                </div>
              </div>
            </div>
            <span className="pill pill-success">
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />
              {t('sos.standby')}
            </span>
          </div>

          {/* Active Operator Banner */}
          <div
            className="card"
            style={{
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              background: 'var(--bg-warm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: currentUser.avatarColor || 'var(--copper)',
                  color: '#FFFFFF',
                  fontSize: 10,
                  fontWeight: 800,
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                {currentUser.name.charAt(0)}
              </div>
              <div>
                <div className="font-title" style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-heading)' }}>
                  {currentUser.name}
                </div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>
                  {currentUser.unitId} · {currentUser.role}
                </div>
              </div>
            </div>
            <span className="pill pill-copper" style={{ fontSize: 8 }}>
              {currentUser.badge}
            </span>
          </div>

          {/* Protocol Note */}
          <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6, padding: '0 4px' }}>
            {t('sos.protocol_desc')}
          </div>

          {/* Conditions Selector */}
          <div className="card-glass" style={{ padding: '16px 18px' }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>{t('sos.conditions_title')}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {conditions.map(({ id, label, Icon, active, toggle }) => (
                <button
                  key={id}
                  type="button"
                  onClick={toggle}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '11px 14px',
                    border: '1px solid',
                    borderColor: active ? 'var(--danger)' : 'var(--border)',
                    borderRadius: 'var(--radius-pill)',
                    background: active ? 'var(--danger-10)' : 'var(--card)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Icon size={16} strokeWidth={1.8} style={{ color: active ? 'var(--danger)' : 'var(--text-muted)' }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: active ? 'var(--danger)' : 'var(--text)' }}>
                    {label}
                  </span>
                  <div
                    style={{
                      marginLeft: 'auto',
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      border: `1.5px solid ${active ? 'var(--danger)' : 'var(--border)'}`,
                      background: active ? 'var(--danger)' : 'transparent',
                      display: 'grid',
                      placeItems: 'center',
                    }}
                  >
                    {active && <CheckCircle2 size={12} strokeWidth={2.5} style={{ color: '#FFFFFF' }} />}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Hold-to-Activate Button */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onPointerDown={handleStartHold}
              onPointerUp={handleEndHold}
              onPointerLeave={handleEndHold}
              onPointerCancel={handleEndHold}
              onTouchStart={handleStartHold}
              onTouchEnd={handleEndHold}
              onTouchCancel={handleEndHold}
              onContextMenu={(e) => e.preventDefault()}
              style={{
                position: 'relative',
                width: '100%',
                minHeight: 52,
                borderRadius: 'var(--radius-pill)',
                border: '1px solid var(--danger)',
                background: isHolding ? 'var(--danger)' : 'var(--danger)',
                color: '#FFFFFF',
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                overflow: 'hidden',
                boxShadow: isHolding ? '0 0 20px rgba(194,59,46,0.4)' : 'none',
                userSelect: 'none',
                touchAction: 'none',
              }}
            >
              {/* Progress Sweep */}
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${holdProgress}%`,
                  background: 'rgba(255,255,255,0.28)',
                  transition: 'width 0.1s linear',
                }}
              />
              <ShieldAlert size={16} strokeWidth={2.2} style={{ position: 'relative', zIndex: 1 }} />
              <span style={{ position: 'relative', zIndex: 1 }}>
                {isHolding ? `HOLD TO TRANSMIT (${Math.round(holdProgress)}%)` : t('sos.hold_prompt')}
              </span>
            </button>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', textAlign: 'center', marginTop: 8 }}>
              {t('sos.hold_warning')}
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes sos-ping {
          0%   { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(2.2); opacity: 0; }
        }
      `}</style>
    </div>
  );
};
