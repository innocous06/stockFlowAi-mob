import React, { useContext } from 'react';
import { BrandMark } from './StockFlowLogo';
import { useApp } from '../context/AppContext';
import { ThemeContext } from '../App';
import { Wifi, WifiOff, Sun, Moon } from 'lucide-react';
import { motion } from 'motion/react';

interface HeaderProps { currentTab: string; }

const TAB_LABELS: Record<string, string> = {
  'driver-home':          'Overview',
  'resilient-navigation': 'Corridor',
  'incident-reporting':   'Report',
  'offline-sync-center':  'Sync',
  'emergency-sos':        'SOS',
};

export const Header: React.FC<HeaderProps> = ({ currentTab }) => {
  const { isOnline } = useApp();
  const { isDark, toggleTheme } = useContext(ThemeContext);

  return (
    <header style={{
      position: 'fixed',
      top: 0, left: 0, right: 0,
      height: 'var(--header-h)',
      background: 'var(--card-glass)',
      backdropFilter: 'var(--blur)',
      WebkitBackdropFilter: 'var(--blur)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 14px',
      gap: 10,
      zIndex: 100,
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0 }}>
        <BrandMark size={26} />
        <div style={{ lineHeight: 1.2 }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.3px', color: 'var(--text)' }}>
            StockFlow
          </div>
          <div style={{ fontSize: 8, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Field Ops
          </div>
        </div>
      </div>

      <div style={{ flex: 1 }} />

      {/* Page label */}
      <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>
        {TAB_LABELS[currentTab] ?? ''}
      </span>

      {/* Network badge */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '4px 9px',
        background: isOnline ? 'var(--success-10)' : 'var(--danger-10)',
        borderRadius: 'var(--radius-pill)',
        border: `1px solid ${isOnline ? 'rgba(47,143,91,0.2)' : 'rgba(196,72,59,0.2)'}`,
        fontSize: 9, fontWeight: 700,
        color: isOnline ? 'var(--success)' : 'var(--danger)',
        transition: 'all 0.25s',
        flexShrink: 0,
      }}>
        {isOnline
          ? <Wifi size={10} strokeWidth={2.2} />
          : <WifiOff size={10} strokeWidth={2.2} />
        }
        {isOnline ? 'Live' : 'Offline'}
      </div>

      {/* Theme toggle */}
      <motion.button
        whileTap={{ scale: 0.88 }}
        onClick={toggleTheme}
        style={{
          width: 30, height: 30,
          borderRadius: 'var(--radius-pill)',
          border: '1px solid var(--border)',
          background: 'var(--bg-warm)',
          display: 'grid', placeItems: 'center',
          cursor: 'pointer',
          flexShrink: 0,
          color: 'var(--text-muted)',
        }}
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isDark
          ? <Sun size={13} strokeWidth={2} />
          : <Moon size={13} strokeWidth={2} />
        }
      </motion.button>
    </header>
  );
};
