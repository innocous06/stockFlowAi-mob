import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Loader2,
  Trash2,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Radio,
  Sparkles,
} from 'lucide-react';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return `${Math.floor(diff / 3600000)}h ago`;
}

export const OfflineSyncCenter: React.FC = () => {
  const {
    networkSimulationMode,
    setNetworkSimulationMode,
    isOnline,
    isSyncing,
    syncProgress,
    lastSyncedTimestamp,
    syncQueue,
    removeItemFromQueue,
    retryQueueItem,
    forceSync,
    mapPackages,
    totalCachedStorageBytes,
    incidents,
  } = useApp();

  const [isAutoRadio, setIsAutoRadio] = useState<boolean>(true);

  // Auto-detect connectivity and switch radio mode dynamically
  useEffect(() => {
    if (!isAutoRadio) return;

    const evaluateNetwork = () => {
      if (!navigator.onLine) {
        setNetworkSimulationMode('offline');
      } else {
        // Test connectivity
        setNetworkSimulationMode('online');
      }
    };

    evaluateNetwork();
    window.addEventListener('online', evaluateNetwork);
    window.addEventListener('offline', evaluateNetwork);

    return () => {
      window.removeEventListener('online', evaluateNetwork);
      window.removeEventListener('offline', evaluateNetwork);
    };
  }, [isAutoRadio, setNetworkSimulationMode]);

  const pendingItems = syncQueue.filter((i) => i.status === 'pending' || i.status === 'failed');
  const totalQueuedBytes = pendingItems.reduce((s, i) => s + i.sizeBytes, 0);

  // Storage calculation
  const incidentBytes = incidents.reduce((s, i) => s + i.photo_attachments.reduce((ps, p) => ps + p.sizeBytes, 0) + 8192, 0);
  const tileBytes = mapPackages.filter((p) => p.status === 'downloaded').reduce((s, p) => s + p.sizeBytes, 0);
  const breadBytes = Math.max(0, totalCachedStorageBytes - incidentBytes - tileBytes);
  const totalBytes = totalCachedStorageBytes || incidentBytes + tileBytes + breadBytes;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* ── Radio Link Control ── */}
      <div className="card-glass" style={{ padding: '16px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div className="eyebrow">Radio Transceiver Mode</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginTop: 2 }}>
              Telemetry Uplink Controller
            </div>
          </div>
          <button
            type="button"
            className="pill"
            onClick={() => setIsAutoRadio((p) => !p)}
            style={{
              cursor: 'pointer',
              background: isAutoRadio ? 'var(--copper-10)' : 'var(--bg-warm)',
              color: isAutoRadio ? 'var(--copper)' : 'var(--text-muted)',
              border: `1px solid ${isAutoRadio ? 'rgba(184,112,61,0.3)' : 'var(--border)'}`,
              padding: '4px 10px',
            }}
          >
            <Sparkles size={11} strokeWidth={2} />
            {isAutoRadio ? 'Auto (Adaptive)' : 'Manual Override'}
          </button>
        </div>

        {/* Radio Modes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            {
              id: 'online',
              label: 'Live RTK Uplink',
              desc: isAutoRadio && networkSimulationMode === 'online' ? 'Active: Auto-routed through real network' : 'Full bandwidth · immediate cloud sync',
              icon: Wifi,
            },
            {
              id: 'spotty',
              label: 'High-Latency Mesh',
              desc: isAutoRadio && networkSimulationMode === 'spotty' ? 'Active: Degraded signal detected' : 'Intermittent 2G/LoRa simulated buffer',
              icon: Radio,
            },
            {
              id: 'offline',
              label: 'Airgap Protocol',
              desc: isAutoRadio && networkSimulationMode === 'offline' ? 'Active: Network down · local caching' : 'Zero radio emission · IndexedDB storage only',
              icon: WifiOff,
            },
          ].map((mode) => {
            const isCurrent = networkSimulationMode === mode.id;
            const Icon = mode.icon;

            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => {
                  setIsAutoRadio(false);
                  setNetworkSimulationMode(mode.id as 'online' | 'spotty' | 'offline');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '11px 14px',
                  borderRadius: 'var(--radius-card)',
                  border: '1px solid',
                  borderColor: isCurrent ? 'var(--copper)' : 'var(--border)',
                  background: isCurrent ? 'var(--copper-10)' : 'var(--card)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 'var(--radius-pill)',
                    background: isCurrent ? 'var(--copper)' : 'var(--bg-warm)',
                    color: isCurrent ? '#FFFFFF' : 'var(--text-muted)',
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon size={14} strokeWidth={2} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: isCurrent ? 'var(--text)' : 'var(--text)' }}>
                    {mode.label}
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 1 }}>{mode.desc}</div>
                </div>
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    border: `1.5px solid ${isCurrent ? 'var(--copper)' : 'var(--border)'}`,
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  {isCurrent && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--copper)' }} />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Immediate Force Sync Card ── */}
      <div className="card-glass" style={{ padding: '16px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="eyebrow">Outbox Pipeline</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginTop: 2 }}>
              {pendingItems.length > 0 ? `${pendingItems.length} Reports Queued (${formatBytes(totalQueuedBytes)})` : 'Outbox Cleared'}
            </div>
            {lastSyncedTimestamp > 0 && (
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                Last synced {relativeTime(lastSyncedTimestamp)}
              </div>
            )}
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => forceSync()}
            disabled={isSyncing || !isOnline}
            style={{ minHeight: 36, padding: '0 16px', fontSize: 11 }}
          >
            {isSyncing ? <Loader2 size={13} className="spinning" /> : <RefreshCw size={13} strokeWidth={2} />}
            <span>{isSyncing ? `${syncProgress}%` : 'Sync Now'}</span>
          </button>
        </div>

        {isSyncing && (
          <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, overflow: 'hidden', marginTop: 12 }}>
            <motion.div
              style={{ height: '100%', background: 'var(--copper)', borderRadius: 2, width: `${syncProgress}%` }}
              transition={{ duration: 0.2 }}
            />
          </div>
        )}
      </div>

      {/* ── Storage Allocation ── */}
      <div className="card-glass" style={{ padding: '16px 18px' }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>Local IndexedDB Cache</div>
        <div style={{ display: 'flex', height: 6, borderRadius: 'var(--radius-pill)', overflow: 'hidden', gap: 2, marginBottom: 12 }}>
          {[{ bytes: tileBytes, color: 'var(--copper)' }, { bytes: incidentBytes, color: 'var(--text)' }, { bytes: breadBytes, color: 'var(--border)' }].map(
            (seg, idx) => seg.bytes > 0 && <div key={idx} style={{ flex: seg.bytes, background: seg.color }} />
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[
            { label: 'Map Sectors', bytes: tileBytes, dot: 'var(--copper)' },
            { label: 'Reports', bytes: incidentBytes, dot: 'var(--text)' },
            { label: 'Breadcrumbs', bytes: breadBytes, dot: 'var(--border)' },
          ].map(({ label, bytes, dot }) => (
            <div key={label}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: dot }} />
                <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>{label}</span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }} className="mono">
                {formatBytes(bytes)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Queued Queue Items ── */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, padding: '0 2px' }}>
          <div className="eyebrow">Outbox Buffer</div>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{syncQueue.length} total entries</span>
        </div>

        {syncQueue.length === 0 ? (
          <div
            className="card-glass"
            style={{ padding: '24px 16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
          >
            <CheckCircle2 size={22} strokeWidth={1.8} style={{ color: 'var(--text-faint)', marginBottom: 6 }} />
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Outbox is empty</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {syncQueue.map((item) => {
              const isFailed = item.status === 'failed';
              const isPending = item.status === 'pending';

              return (
                <div
                  key={item.id}
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
                      background: isFailed ? 'var(--danger)' : isPending ? 'var(--warning)' : 'var(--success)',
                    }}
                  />

                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>{item.title}</div>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>
                      {formatBytes(item.sizeBytes)} · {relativeTime(item.timestamp)}
                      {item.retryCount > 0 && <span> · {item.retryCount} retry attempts</span>}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 6 }}>
                    {(isFailed || isPending) && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => retryQueueItem(item.id)}
                        title="Retry upload"
                      >
                        <RotateCcw size={12} />
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => removeItemFromQueue(item.id)}
                      title="Discard item"
                      style={{ color: 'var(--danger)' }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
