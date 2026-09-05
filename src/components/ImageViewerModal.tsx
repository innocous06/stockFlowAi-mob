import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ZoomIn, ZoomOut, MapPin, User, Clock, ShieldAlert } from 'lucide-react';

interface ImageViewerModalProps {
  isOpen: boolean;
  imageUrl: string | null;
  title?: string;
  subtitle?: string;
  reporter?: string;
  coordinates?: string;
  timestamp?: string;
  onClose: () => void;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  isOpen,
  imageUrl,
  title = 'Hazard Photo Evidence',
  subtitle,
  reporter,
  coordinates,
  timestamp,
  onClose,
}) => {
  const [zoomLevel, setZoomLevel] = React.useState<number>(1);

  // Reset zoom when image changes or closes
  React.useEffect(() => {
    if (!isOpen) {
      setZoomLevel(1);
    }
  }, [isOpen, imageUrl]);

  // Close on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !imageUrl) return null;

  const toggleZoom = () => {
    setZoomLevel((prev) => (prev === 1 ? 1.75 : 1));
  };

  return (
    <AnimatePresence>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 110005, // higher than RouteBlockedModal (100000)
          background: 'rgba(5, 5, 8, 0.94)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeIn 0.18s ease-out',
        }}
        onClick={onClose}
      >
        {/* Top Header Bar */}
        <div
          style={{
            padding: '12px 16px',
            background: 'rgba(20, 22, 28, 0.85)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            zIndex: 10,
            flexShrink: 0,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'rgba(194, 59, 46, 0.2)',
                border: '1px solid var(--danger)',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}
            >
              <ShieldAlert size={16} style={{ color: 'var(--danger)' }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                className="font-title"
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#F7F5F0',
                  letterSpacing: '-0.2px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  fontFamily: 'var(--font-heading)',
                }}
              >
                {title}
              </div>
              {subtitle && (
                <div style={{ fontSize: 10, color: 'rgba(247, 245, 240, 0.65)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {subtitle}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {/* Zoom Toggle */}
            <button
              type="button"
              onClick={toggleZoom}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#F7F5F0',
                borderRadius: 'var(--radius-pill)',
                padding: '6px 10px',
                fontSize: 10,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                cursor: 'pointer',
              }}
              title={zoomLevel === 1 ? 'Zoom In' : 'Reset Zoom'}
            >
              {zoomLevel === 1 ? <ZoomIn size={13} /> : <ZoomOut size={13} />}
              <span>{zoomLevel === 1 ? 'Zoom' : 'Reset'}</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.12)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#FFFFFF',
                display: 'grid',
                placeItems: 'center',
                cursor: 'pointer',
                transition: 'background 0.15s ease',
              }}
              title="Close Image Viewer (Esc)"
            >
              <X size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Central High-Resolution Image Canvas */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 12,
            overflow: 'auto',
            position: 'relative',
            cursor: zoomLevel > 1 ? 'grab' : 'zoom-in',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              onClose();
            } else {
              toggleZoom();
            }
          }}
        >
          <motion.img
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: zoomLevel }}
            transition={{ duration: 0.2 }}
            src={imageUrl}
            alt={title}
            style={{
              maxWidth: '100%',
              maxHeight: 'calc(100vh - 160px)',
              objectFit: 'contain',
              borderRadius: 8,
              boxShadow: '0 20px 60px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.5)',
              transformOrigin: 'center center',
              transition: 'transform 0.2s ease',
            }}
          />
        </div>

        {/* Bottom Metadata & Controls Bar */}
        <div
          style={{
            padding: '12px 16px',
            background: 'rgba(20, 22, 28, 0.85)',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexShrink: 0,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 14px', fontSize: 10, color: 'rgba(247, 245, 240, 0.75)' }}>
            {reporter && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <User size={12} style={{ color: 'var(--copper)' }} />
                <span>{reporter}</span>
              </span>
            )}
            {coordinates && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'monospace' }}>
                <MapPin size={12} style={{ color: 'var(--danger)' }} />
                <span>{coordinates}</span>
              </span>
            )}
            {timestamp && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={12} style={{ color: 'var(--text-muted)' }} />
                <span>{timestamp}</span>
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary btn-sm"
            style={{
              padding: '6px 14px',
              fontSize: 10,
              fontWeight: 800,
              flexShrink: 0,
              color: '#FFFFFF',
              borderColor: 'rgba(255,255,255,0.25)',
              background: 'rgba(255,255,255,0.08)',
            }}
          >
            Done Viewing
          </button>
        </div>
      </div>
    </AnimatePresence>
  );
};
