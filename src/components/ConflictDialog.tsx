import React, { useState } from 'react';
import { IncidentReport, ServerIncidentRevision } from '../types';
import {
  AlertTriangle,
  X,
  GitMerge,
  Upload,
  Download,
  Check,
  RefreshCw,
  Smartphone,
  Cloud,
} from 'lucide-react';

interface ConflictDialogProps {
  isOpen: boolean;
  incident: IncidentReport;
  serverVersion: ServerIncidentRevision;
  onClose: () => void;
  onResolve: (choice: 'keep_local' | 'accept_server' | 'merge', mergedText?: string) => Promise<void>;
}

export const ConflictDialog: React.FC<ConflictDialogProps> = ({
  isOpen,
  incident,
  serverVersion,
  onClose,
  onResolve,
}) => {
  const [selectedChoice, setSelectedChoice] = useState<'keep_local' | 'accept_server' | 'merge'>('merge');
  const [mergedDescription, setMergedDescription] = useState(
    `[Field Unit Note]: ${incident.description}\n\n[HQ Revision Note (${serverVersion.updated_by})]: ${serverVersion.description}`
  );
  const [isResolving, setIsResolving] = useState(false);

  if (!isOpen) return null;

  const handleResolveClick = async () => {
    setIsResolving(true);
    try {
      await onResolve(selectedChoice, selectedChoice === 'merge' ? mergedDescription : undefined);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 400,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'var(--blur)',
        WebkitBackdropFilter: 'var(--blur)',
      }}
    >
      <div
        className="card-glass"
        style={{
          maxWidth: 480,
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--danger-10)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-pill)',
                background: 'var(--danger)',
                display: 'grid',
                placeItems: 'center',
                color: '#FFFFFF',
              }}
            >
              <AlertTriangle size={16} strokeWidth={2.2} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="pill pill-danger" style={{ fontSize: 8 }}>
                  HTTP 409 CONFLICT
                </span>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)' }}>
                  Report: {incident.id}
                </span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginTop: 2 }}>
                Version Collision Detected
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            style={{ padding: 6, minHeight: 'auto', borderRadius: '50%' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Comparison Body */}
        <div style={{ padding: '16px 18px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.55 }}>
            Headquarters received a concurrent modification for this sector. The server revision (v{serverVersion.revision})
            differs from your offline draft (v{incident.revision}). Select a resolution protocol:
          </p>

          {/* Side-by-Side Diff */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {/* Local Unit */}
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-card)',
                background: 'var(--bg-warm)',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', pb: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--copper)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Smartphone size={12} />
                  Local (v{incident.revision})
                </span>
                <span style={{ fontSize: 8, color: 'var(--text-muted)' }}>Draft</span>
              </div>
              <div>
                <span style={{ fontSize: 8, textTransform: 'uppercase', color: 'var(--text-faint)', fontWeight: 700, display: 'block' }}>
                  Title
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>{incident.title}</span>
              </div>
              <div>
                <span style={{ fontSize: 8, textTransform: 'uppercase', color: 'var(--text-faint)', fontWeight: 700, display: 'block' }}>
                  Description
                </span>
                <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, maxHeight: 60, overflowY: 'auto', lineHeight: 1.4 }}>
                  {incident.description}
                </p>
              </div>
            </div>

            {/* Remote HQ */}
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-card)',
                background: 'var(--bg-warm)',
                border: '1px solid rgba(194,59,46,0.3)',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', pb: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Cloud size={12} />
                  HQ (v{serverVersion.revision})
                </span>
                <span style={{ fontSize: 8, color: 'var(--danger)', fontWeight: 700 }}>Server</span>
              </div>
              <div>
                <span style={{ fontSize: 8, textTransform: 'uppercase', color: 'var(--text-faint)', fontWeight: 700, display: 'block' }}>
                  Title
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>{serverVersion.title}</span>
              </div>
              <div>
                <span style={{ fontSize: 8, textTransform: 'uppercase', color: 'var(--text-faint)', fontWeight: 700, display: 'block' }}>
                  Description ({serverVersion.updated_by})
                </span>
                <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, maxHeight: 60, overflowY: 'auto', lineHeight: 1.4 }}>
                  {serverVersion.description}
                </p>
              </div>
            </div>
          </div>

          {/* Strategy Picker */}
          <div>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Resolution Protocol</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
              {[
                { id: 'merge', label: 'Merge Notes', icon: GitMerge },
                { id: 'keep_local', label: 'Keep Local', icon: Upload },
                { id: 'accept_server', label: 'Accept HQ', icon: Download },
              ].map((opt) => {
                const isSelected = selectedChoice === opt.id;
                const Icon = opt.icon;

                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedChoice(opt.id as any)}
                    style={{
                      padding: '10px 8px',
                      borderRadius: 'var(--radius-card)',
                      border: '1px solid',
                      borderColor: isSelected ? 'var(--copper)' : 'var(--border)',
                      background: isSelected ? 'var(--copper-10)' : 'var(--card)',
                      color: isSelected ? 'var(--copper)' : 'var(--text)',
                      cursor: 'pointer',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Icon size={14} strokeWidth={2} />
                    <span style={{ fontSize: 10, fontWeight: 700 }}>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Merged Textarea */}
          {selectedChoice === 'merge' && (
            <div>
              <label style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                Merged Observations Preview:
              </label>
              <textarea
                value={mergedDescription}
                onChange={(e) => setMergedDescription(e.target.value)}
                rows={3}
                style={{
                  width: '100%',
                  background: 'var(--card)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                  fontSize: 11,
                  fontFamily: 'monospace',
                  borderRadius: 'var(--radius-card)',
                  padding: '10px 12px',
                  outline: 'none',
                }}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 18px',
            borderTop: '1px solid var(--border)',
            background: 'var(--bg-warm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
          }}
        >
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
            Dismiss
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleResolveClick}
            disabled={isResolving}
          >
            {isResolving ? (
              <>
                <RefreshCw size={12} className="spinning" />
                <span>Applying…</span>
              </>
            ) : (
              <>
                <Check size={12} strokeWidth={2.5} />
                <span>Apply Resolution</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
