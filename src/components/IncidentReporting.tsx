import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { IncidentCategory, IncidentSeverity, IncidentReport, PhotoAttachment, SyncStatusStage } from '../types';
import { toGeoJSONPoint, evaluateGPSQuality } from '../services/gps-geojson.service';
import { validatePhotoFile, validatePhotoCount, createPhotoAttachment } from '../services/photo-compression.service';
import { incidentOfflineStore } from '../services/incident-offline-store.service';
import { incidentSyncService, SyncProgressEvent } from '../services/incident-sync.service';
import { ConflictDialog } from './ConflictDialog';
import {
  FileEdit,
  History,
  Mountain,
  Ban,
  ShieldAlert,
  Truck,
  CloudRain,
  HeartPulse,
  Camera,
  X,
  CheckCircle2,
  UploadCloud,
  AlertTriangle,
  Crosshair,
  Loader2,
  Compass,
  User,
  ZoomIn,
} from 'lucide-react';
import { ImageViewerModal } from './ImageViewerModal';

const DISTRICT_ROAD_PRESETS = [
  'NH-40 Guwahati-Shillong Expressway (Mile 14)',
  'NH-27 Khanapara Bypass Corridor',
  'Shillong Ring Road Pass Mile 8',
  'Jorhat-Tezpur Brahmaputra Crossing',
  'Silchar-Imphal National Corridor (NH-37)',
];

const CATEGORIES: { id: IncidentCategory; label: string; Icon: React.ElementType }[] = [
  { id: 'landslide', label: 'Landslide', Icon: Mountain },
  { id: 'roadblock', label: 'Roadblock', Icon: Ban },
  { id: 'bridge_damage', label: 'Bridge Damage', Icon: ShieldAlert },
  { id: 'vehicle_breakdown', label: 'Breakdown', Icon: Truck },
  { id: 'weather_hazard', label: 'Weather', Icon: CloudRain },
  { id: 'medical_emergency', label: 'Medical', Icon: HeartPulse },
];

const SEVERITIES: { id: IncidentSeverity; label: string }[] = [
  { id: 'low', label: 'Advisory' },
  { id: 'medium', label: 'Moderate' },
  { id: 'high', label: 'Severe' },
  { id: 'critical', label: 'Critical' },
];

const SEV_COLOR = (id: IncidentSeverity, active: boolean) => {
  if (!active) return { bg: 'var(--card)', border: 'var(--border)', color: 'var(--text-muted)' };
  if (id === 'low') return { bg: 'var(--success-10)', border: 'rgba(42,122,77,0.4)', color: 'var(--success)' };
  if (id === 'medium') return { bg: 'var(--warning-10)', border: 'rgba(184,125,40,0.4)', color: 'var(--warning)' };
  if (id === 'high') return { bg: 'var(--danger-10)', border: 'rgba(194,59,46,0.4)', color: 'var(--danger)' };
  return { bg: 'rgba(194,59,46,0.22)', border: 'var(--danger)', color: 'var(--danger)' };
};

function getSyncBadge(stage: SyncStatusStage) {
  switch (stage) {
    case 'SYNCED':
      return { label: 'Synced', bg: 'var(--success-10)', color: 'var(--success)' };
    case 'UPLOADING_PHOTOS':
    case 'SUBMITTING':
      return { label: 'Syncing', bg: 'var(--warning-10)', color: 'var(--warning)' };
    case 'QUEUED':
      return { label: 'Queued', bg: 'var(--bg-warm)', color: 'var(--text-muted)' };
    case 'CONFLICT':
      return { label: 'Conflict', bg: 'var(--danger-10)', color: 'var(--danger)' };
    default:
      return { label: 'Local Only', bg: 'var(--bg-warm)', color: 'var(--text-muted)' };
  }
}

export const IncidentReporting: React.FC = () => {
  const {
    currentGPS,
    isOnline,
    incidents,
    addIncident,
    addQueueItem,
    deleteIncident,
    showToast,
    broadcastIncident,
    activateRealGPS,
    isRealGPSFix,
    isLocating,
    realLocationAddress,
    activeRoute,
  } = useApp();
  const { currentUser } = useAuth();
  const { t } = useLanguage();

  const [category, setCategory] = useState<IncidentCategory>('landslide');
  const [severity, setSeverity] = useState<IncidentSeverity>('high');
  const [districtRoadSegment, setDistrictRoadSegment] = useState(DISTRICT_ROAD_PRESETS[0]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [observationTime, setObservationTime] = useState<string>(() => new Date().toISOString().slice(0, 16));

  const [isManualPinMode, setIsManualPinMode] = useState(false);
  const [manualLat, setManualLat] = useState(currentGPS.latitude);
  const [manualLng, setManualLng] = useState(currentGPS.longitude);
  const [manualAlt, setManualAlt] = useState(currentGPS.altitude || 1420);
  const [manualAccuracy, setManualAccuracy] = useState(10.0);

  const activeLat = isManualPinMode ? manualLat : currentGPS.latitude;
  const activeLng = isManualPinMode ? manualLng : currentGPS.longitude;
  const activeAlt = isManualPinMode ? manualAlt : currentGPS.altitude || 1420;
  const activeAccuracy = isManualPinMode ? manualAccuracy : currentGPS.accuracy;
  const gpsQuality = evaluateGPSQuality(activeAccuracy, isManualPinMode);

  const [photoAttachments, setPhotoAttachments] = useState<PhotoAttachment[]>([]);
  const [isCompressingPhotos, setIsCompressingPhotos] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<'form' | 'history'>('form');
  const [conflictIncident, setConflictIncident] = useState<IncidentReport | null>(null);
  const [selectedViewerPhoto, setSelectedViewerPhoto] = useState<{
    url: string;
    title: string;
    subtitle?: string;
    reporter?: string;
    coordinates?: string;
    timestamp?: string;
  } | null>(null);

  useEffect(() => {
    const unsub = incidentSyncService.subscribe((event: SyncProgressEvent) => {
      if (event.stage === 'CONFLICT' && event.serverRevision) {
        incidentOfflineStore.getIncident(event.report_id).then((inc) => {
          if (inc) setConflictIncident(inc);
        });
      }
    });
    return () => unsub();
  }, []);

  const handleToggleManualGPS = () => {
    if (!isManualPinMode) {
      setIsManualPinMode(true);
      setManualLat(currentGPS.latitude);
      setManualLng(currentGPS.longitude);
      setManualAlt(currentGPS.altitude || 1420);
      showToast('Manual Pin entry mode activated');
    } else {
      setIsManualPinMode(false);
      showToast(`Live GPS lock active (±${Math.round(currentGPS.accuracy)}m)`);
    }
  };

  const handleFetchLiveGPS = async () => {
    try {
      showToast('🛰️ Fetching live GNSS coordinates from device GPS…');
      await activateRealGPS();
      setManualLat(currentGPS.latitude);
      setManualLng(currentGPS.longitude);
      setManualAlt(currentGPS.altitude || 1420);
      setManualAccuracy(currentGPS.accuracy || 5);
      showToast(`🎯 Live GPS Acquired: ${currentGPS.latitude.toFixed(6)}°N, ${currentGPS.longitude.toFixed(6)}°E`);
    } catch {
      showToast('⚠️ Could not acquire device GPS fix. Using network coordinates.');
    }
  };

  const handlePhotoFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files: File[] = Array.from(e.target.files || []) as File[];
    if (!files.length) return;
    const countValidation = validatePhotoCount(photoAttachments.length, files.length);
    if (!countValidation.isValid) {
      showToast(`⚠️ ${countValidation.error}`);
      return;
    }

    setIsCompressingPhotos(true);
    const tempId = `draft_${Date.now()}`;
    try {
      const newAttachments: PhotoAttachment[] = [];
      for (const file of files) {
        const v = validatePhotoFile(file);
        if (!v.isValid) {
          showToast(`⚠️ ${file.name}: ${v.error}`);
          continue;
        }
        newAttachments.push(await createPhotoAttachment(file, tempId));
      }
      setPhotoAttachments((prev) => [...prev, ...newAttachments]);
      showToast(`${newAttachments.length} field image(s) compressed`);
    } catch (err: any) {
      showToast(`Image processing error: ${err.message}`);
    } finally {
      setIsCompressingPhotos(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('Please provide a specific hazard title');
      return;
    }
    setIsSubmitting(true);

    const report_id = `IR-${Math.floor(100 + Math.random() * 900)}`;
    const idempotency_key = `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    try {
      const geo_json = toGeoJSONPoint(activeLat, activeLng, activeAlt);
      const newIncident: IncidentReport = {
        id: report_id,
        report_id,
        idempotency_key,
        tenant_id: 'TEN-ACME-PHARMA',
        revision: 1,
        title: title.trim(),
        category,
        severity,
        district_road_segment: districtRoadSegment.trim(),
        description: description.trim() || 'Obstruction observed during transit.',
        observation_time: new Date(observationTime).toISOString(),
        latitude: activeLat,
        longitude: activeLng,
        accuracy_meters: activeAccuracy,
        altitude_meters: activeAlt,
        gps_status: gpsQuality,
        geo_json,
        locationName: districtRoadSegment,
        reportedBy: `${currentUser.name} (${currentUser.unitId})`,
        photos: photoAttachments.map((p) => p.dataUrl || ''),
        photo_attachments: photoAttachments.map((p) => ({ ...p, report_id })),
        timestamp: Date.now(),
        syncStatus: 'pending',
        sync_stage: 'LOCAL_ONLY',
        retry_count: 0,
      };

      for (const photo of photoAttachments) await incidentOfflineStore.savePhoto({ ...photo, report_id });
      await incidentOfflineStore.saveIncident(newIncident);
      await addIncident(newIncident);

      const queueItem = {
        report_id,
        idempotency_key,
        type: 'incident' as const,
        title: `${category.toUpperCase()}: ${newIncident.title}`,
        subtitle: isOnline ? 'Direct Broadcast' : 'Offline Outbox Buffer',
        sizeBytes: 24000 + photoAttachments.reduce((s, p) => s + p.sizeBytes, 0),
        status: (isOnline ? 'synced' : 'pending') as 'synced' | 'pending',
        sync_stage: (isOnline ? 'SYNCED' : 'LOCAL_ONLY') as SyncStatusStage,
        icon: 'assignment_late',
        color: severity === 'critical' ? 'var(--danger)' : 'var(--warning)',
        retryCount: 0,
        payload: newIncident,
      };
      await incidentOfflineStore.saveQueueItem({ id: `queue_${Date.now()}`, timestamp: Date.now(), ...queueItem });
      addQueueItem(queueItem);
      showToast(`Field report ${report_id} recorded by ${currentUser.name}`);

      if (isOnline) {
        showToast('Transmitting telemetry to Operations...');
        await incidentSyncService.syncIncident(newIncident);
      }

      // Best-effort micro-thumbnail broadcast
      try {
        let broadcastThumb: string | null = null;
        if (photoAttachments.length > 0 && photoAttachments[0].dataUrl) {
          const rawUrl = photoAttachments[0].dataUrl;
          broadcastThumb =
            rawUrl.length < 45000
              ? rawUrl
              : await new Promise<string | null>((res) => {
                  const img = new Image();
                  img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    const max = 120,
                      w = img.width,
                      h = img.height;
                    const [rw, rh] = w > h ? [max, (h / w) * max] : [(w / h) * max, max];
                    canvas.width = rw;
                    canvas.height = rh;
                    if (ctx) {
                      ctx.drawImage(img, 0, 0, rw, rh);
                      res(canvas.toDataURL('image/jpeg', 0.5));
                    } else res(null);
                  };
                  img.onerror = () => res(null);
                  img.src = rawUrl;
                });
        }
        await broadcastIncident({
          messageId: report_id,
          title: newIncident.title,
          category,
          severity,
          description: `${districtRoadSegment}: ${newIncident.description}`,
          photo: broadcastThumb,
          reportedBy: currentUser.name,
          role: currentUser.role,
          department: currentUser.department,
          unitId: currentUser.unitId,
          badge: currentUser.badge,
          coordinates: `${activeLat.toFixed(6)}°N, ${activeLng.toFixed(6)}°E`,
          latitude: activeLat,
          longitude: activeLng,
          altitude: activeAlt,
          accuracy: activeAccuracy,
          user: currentUser.name,
          senderUserId: currentUser.id,
          routeId: activeRoute?.id,
          affectedRouteName: activeRoute?.name,
          district_road_segment: districtRoadSegment,
        });
      } catch {
        /* ignore */
      }

      setTitle('');
      setDescription('');
      setPhotoAttachments([]);
      setViewMode('history');
    } catch (err: any) {
      showToast(`Failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* ── View Switcher Pill ── */}
      <div
        style={{
          display: 'flex',
          background: 'var(--bg-warm)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-pill)',
          padding: 3,
          gap: 3,
        }}
      >
        {[
          { id: 'form', label: t('report.form_tab'), Icon: FileEdit },
          { id: 'history', label: `${t('report.history_tab')} (${incidents.length})`, Icon: History },
        ].map(({ id, label, Icon }) => {
          const active = viewMode === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setViewMode(id as 'form' | 'history')}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                minHeight: 34,
                borderRadius: 'var(--radius-pill)',
                border: 0,
                cursor: 'pointer',
                background: active ? 'var(--card)' : 'transparent',
                color: active ? 'var(--text)' : 'var(--text-muted)',
                fontSize: 11,
                fontWeight: 700,
                boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={13} strokeWidth={2} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {viewMode === 'form' ? (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Active Reporter Identification */}
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
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  background: currentUser.avatarColor || 'var(--copper)',
                  color: '#FFFFFF',
                  fontSize: 11,
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

          {/* ── Category Selector ── */}
          <div className="card-glass" style={{ padding: '16px 18px' }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>{t('report.category')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {CATEGORIES.map(({ id, label, Icon }) => {
                const active = category === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setCategory(id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-card)',
                      border: '1px solid',
                      borderColor: active ? 'var(--copper)' : 'var(--border)',
                      background: active ? 'var(--copper-10)' : 'var(--card)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 'var(--radius-pill)',
                        background: active ? 'var(--copper)' : 'var(--bg-warm)',
                        color: active ? '#FFFFFF' : 'var(--text-muted)',
                        display: 'grid',
                        placeItems: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={14} strokeWidth={2} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Severity Level ── */}
          <div className="card-glass" style={{ padding: '16px 18px' }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>{t('report.severity')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6 }}>
              {SEVERITIES.map(({ id, label }) => {
                const active = severity === id;
                const sc = SEV_COLOR(id, active);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSeverity(id)}
                    style={{
                      padding: '8px 4px',
                      border: `1px solid ${sc.border}`,
                      borderRadius: 'var(--radius-pill)',
                      background: sc.bg,
                      color: sc.color,
                      fontSize: 10,
                      fontWeight: 700,
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Report Details ── */}
          <div className="card-glass" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="eyebrow">Hazard Parameters</div>

            <div>
              <label style={{ display: 'block', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 5 }}>
                Title *
              </label>
              <input
                type="text"
                placeholder="e.g. Mudslide blocking single lane near mile 14"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 5 }}>
                Corridor Road Segment
              </label>
              <select
                value={districtRoadSegment}
                onChange={(e) => setDistrictRoadSegment(e.target.value)}
              >
                {DISTRICT_ROAD_PRESETS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 5 }}>
                Detailed Observation
              </label>
              <textarea
                placeholder="Describe road condition, bypass viability, and equipment needed…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 5 }}>
                Timestamp
              </label>
              <input type="datetime-local" value={observationTime} onChange={(e) => setObservationTime(e.target.value)} />
            </div>
          </div>

          {/* ── GPS Geotag ── */}
          <div className="card-glass" style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div className="eyebrow">Geographic Coordinates</div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={handleToggleManualGPS}
                style={{ fontSize: 10 }}
              >
                <Crosshair size={12} />
                <span>{isManualPinMode ? 'Use Live GNSS' : 'Manual Coordinates'}</span>
              </button>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                borderRadius: 'var(--radius-card)',
                background: isManualPinMode ? 'var(--warning-10)' : 'var(--success-10)',
                border: `1px solid ${isManualPinMode ? 'rgba(184,125,40,0.3)' : 'rgba(42,122,77,0.3)'}`,
              }}
            >
              <Crosshair size={14} strokeWidth={2} style={{ color: isManualPinMode ? 'var(--warning)' : 'var(--success)' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: isManualPinMode ? 'var(--warning)' : 'var(--success)' }}>
                  {isManualPinMode ? 'Manual Pin Mode' : (isRealGPSFix ? 'Live RTK Device GPS Locked' : `Live Convoy GPS · ±${activeAccuracy.toFixed(0)}m`)}
                </div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 1 }} className="mono">
                  {activeLat.toFixed(6)}°N, {activeLng.toFixed(6)}°E · {activeAlt.toFixed(0)}m altitude
                </div>
                {realLocationAddress && !isManualPinMode && (
                  <div style={{ fontSize: 9, color: 'var(--copper)', marginTop: 2, fontStyle: 'italic' }}>
                    {realLocationAddress}
                  </div>
                )}
              </div>
            </div>

            {/* Live GPS Fetch CTA Button */}
            <button
              type="button"
              onClick={handleFetchLiveGPS}
              disabled={isLocating}
              className="btn btn-secondary btn-sm"
              style={{
                width: '100%',
                marginTop: 8,
                fontSize: 10,
                fontWeight: 700,
                gap: 6,
                borderColor: isRealGPSFix ? 'rgba(42,122,77,0.4)' : 'var(--border)',
                background: isRealGPSFix ? 'var(--success-10)' : 'var(--card)',
                color: isRealGPSFix ? 'var(--success)' : 'var(--text)',
              }}
            >
              {isLocating ? (
                <>
                  <Loader2 size={13} className="spinning" />
                  <span>{t('report.locating_gps')}</span>
                </>
              ) : (
                <>
                  <Crosshair size={13} strokeWidth={2} />
                  <span>{isRealGPSFix ? t('report.gps_locked') : t('report.fetch_gps')}</span>
                </>
              )}
            </button>

            {isManualPinMode && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
                {[
                  { label: 'Latitude', value: manualLat, setter: setManualLat },
                  { label: 'Longitude', value: manualLng, setter: setManualLng },
                ].map(({ label, value, setter }) => (
                  <div key={label}>
                    <label style={{ display: 'block', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>
                      {label}
                    </label>
                    <input type="number" step="0.000001" value={value} onChange={(e) => setter(parseFloat(e.target.value))} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Photographic Evidence ── */}
          <div className="card-glass" style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div className="eyebrow">Field Evidence Photos</div>
              <label
                className="btn btn-secondary btn-sm"
                style={{ cursor: 'pointer' }}
              >
                {isCompressingPhotos ? <Loader2 size={12} className="spinning" /> : <Camera size={12} />}
                <span>{isCompressingPhotos ? 'Compressing…' : 'Attach Photo'}</span>
                <input type="file" accept="image/*" multiple onChange={handlePhotoFilesSelected} style={{ display: 'none' }} />
              </label>
            </div>

            {photoAttachments.length > 0 ? (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {photoAttachments.map((p, i) => (
                  <div key={p.id} style={{ position: 'relative' }}>
                    {p.dataUrl && (
                      <div
                        onClick={() =>
                          setSelectedViewerPhoto({
                            url: p.dataUrl!,
                            title: title || 'Hazard Photo Evidence',
                            subtitle: districtRoadSegment,
                            reporter: user?.fullName || 'Field Operator',
                            coordinates: `${activeLat.toFixed(5)}°N, ${activeLng.toFixed(5)}°E`,
                            timestamp: 'Draft Attachment',
                          })
                        }
                        style={{
                          cursor: 'pointer',
                          position: 'relative',
                          borderRadius: 'var(--radius-card)',
                          overflow: 'hidden',
                          border: '1px solid var(--border)',
                          width: 72,
                          height: 72,
                        }}
                        title="Click to view full photo"
                      >
                        <img
                          src={p.dataUrl}
                          alt="Photo thumbnail"
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'rgba(0,0,0,0.35)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: 0,
                            transition: 'opacity 0.15s ease',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                          onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
                        >
                          <ZoomIn size={18} style={{ color: '#FFFFFF' }} />
                        </div>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPhotoAttachments((prev) => prev.filter((_, j) => j !== i));
                      }}
                      style={{
                        position: 'absolute',
                        top: -5,
                        right: -5,
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        background: 'var(--danger)',
                        border: '1.5px solid #FFFFFF',
                        cursor: 'pointer',
                        display: 'grid',
                        placeItems: 'center',
                        zIndex: 2,
                      }}
                      title="Remove photo"
                    >
                      <X size={10} strokeWidth={3} style={{ color: '#FFFFFF' }} />
                    </button>
                    <div style={{ fontSize: 8, color: 'var(--text-muted)', marginTop: 2, textAlign: 'center' }}>
                      {(p.sizeBytes / 1024).toFixed(0)} KB
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  padding: '18px 12px',
                  textAlign: 'center',
                  background: 'var(--card)',
                  borderRadius: 'var(--radius-card)',
                  border: '1px dashed var(--border)',
                }}
              >
                <Camera size={20} strokeWidth={1.5} style={{ color: 'var(--text-faint)', margin: '0 auto 6px' }} />
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                  Photos automatically compressed &lt;25KB for offline buffer
                </div>
              </div>
            )}
          </div>

          {/* ── Submit Button ── */}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
            style={{ width: '100%', minHeight: 46, fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase' }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={15} className="spinning" />
                <span>{t('report.broadcast')}…</span>
              </>
            ) : (
              <>
                <UploadCloud size={15} strokeWidth={2} />
                <span>{t('report.broadcast')}</span>
              </>
            )}
          </button>
        </form>
      ) : (
        /* ── Logged Incidents Feed ── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {incidents.length === 0 ? (
            <div className="card-glass" style={{ padding: '32px 16px', textAlign: 'center' }}>
              <AlertTriangle size={24} strokeWidth={1.8} style={{ color: 'var(--text-faint)', margin: '0 auto 8px' }} />
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>No reports recorded</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {incidents.map((inc) => {
                const badge = getSyncBadge(inc.sync_stage);
                return (
                  <div
                    key={inc.id}
                    className="card"
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
                        background:
                          inc.severity === 'critical' || inc.severity === 'high'
                            ? 'var(--danger)'
                            : inc.severity === 'medium'
                            ? 'var(--warning)'
                            : 'var(--success)',
                      }}
                    />
                    <div>
                      <div className="font-title" style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-heading)' }}>{inc.title}</div>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>
                        {inc.category.replace('_', ' ')} · {inc.locationName}
                      </div>
                      <div style={{ fontSize: 8, color: 'var(--copper)', marginTop: 2, fontWeight: 600 }}>
                        👤 {inc.reportedBy || 'Field Operator'} · {inc.latitude.toFixed(5)}°N, {inc.longitude.toFixed(5)}°E
                      </div>
                      {(() => {
                        const photos = Array.from(
                          new Set([
                            ...(inc.photos || []),
                            ...(inc.photo_attachments || []).map((p) => p.dataUrl || p.remoteUrl).filter(Boolean) as string[],
                          ])
                        );
                        if (photos.length === 0) return null;
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                            {photos.map((photoUrl, pIdx) => (
                              <div
                                key={pIdx}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedViewerPhoto({
                                    url: photoUrl,
                                    title: inc.title,
                                    subtitle: `${inc.category.replace('_', ' ').toUpperCase()} · ${inc.locationName || inc.district_road_segment}`,
                                    reporter: inc.reportedBy,
                                    coordinates: `${inc.latitude.toFixed(5)}°N, ${inc.longitude.toFixed(5)}°E`,
                                    timestamp: new Date(inc.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                  });
                                }}
                                style={{
                                  position: 'relative',
                                  width: 44,
                                  height: 44,
                                  borderRadius: 6,
                                  overflow: 'hidden',
                                  border: '1.5px solid var(--border)',
                                  cursor: 'pointer',
                                  flexShrink: 0,
                                }}
                                title="Click to view photo evidence in high resolution"
                              >
                                <img
                                  src={photoUrl}
                                  alt={`Evidence ${pIdx + 1}`}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                />
                                <div
                                  style={{
                                    position: 'absolute',
                                    bottom: 0,
                                    right: 0,
                                    background: 'rgba(0,0,0,0.65)',
                                    borderRadius: '3px 0 0 0',
                                    padding: '1px 3px',
                                    display: 'flex',
                                    alignItems: 'center',
                                  }}
                                >
                                  <ZoomIn size={10} style={{ color: '#FFFFFF' }} />
                                </div>
                              </div>
                            ))}
                            <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>
                              {photos.length} photo{photos.length > 1 ? 's' : ''} (tap to inspect)
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-pill)',
                          fontSize: 8,
                          fontWeight: 800,
                          background: badge.bg,
                          color: badge.color,
                        }}
                      >
                        {badge.label}
                      </span>
                      <button
                        type="button"
                        onClick={() => deleteIncident(inc.id)}
                        style={{ border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--text-faint)', padding: 0 }}
                        title="Delete report"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Conflict Resolution Modal */}
      {conflictIncident && <ConflictDialog incident={conflictIncident} onClose={() => setConflictIncident(null)} />}

      {/* Fullscreen Photo Lightbox Modal */}
      {selectedViewerPhoto && (
        <ImageViewerModal
          isOpen={!!selectedViewerPhoto}
          imageUrl={selectedViewerPhoto.url}
          title={selectedViewerPhoto.title}
          subtitle={selectedViewerPhoto.subtitle}
          reporter={selectedViewerPhoto.reporter}
          coordinates={selectedViewerPhoto.coordinates}
          timestamp={selectedViewerPhoto.timestamp}
          onClose={() => setSelectedViewerPhoto(null)}
        />
      )}
    </div>
  );
};
