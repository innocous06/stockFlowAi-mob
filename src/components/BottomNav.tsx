import React from 'react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { LayoutDashboard, Navigation, AlertTriangle, RefreshCw, Siren } from 'lucide-react';

type Tab = 'driver-home' | 'resilient-navigation' | 'incident-reporting' | 'offline-sync-center' | 'emergency-sos';

const NAV_ITEMS: { id: Tab; label: string; Icon: React.ElementType }[] = [
  { id: 'driver-home',          label: 'Home',    Icon: LayoutDashboard },
  { id: 'resilient-navigation', label: 'Map',     Icon: Navigation },
  { id: 'incident-reporting',   label: 'Report',  Icon: AlertTriangle },
  { id: 'offline-sync-center',  label: 'Sync',    Icon: RefreshCw },
  { id: 'emergency-sos',        label: 'SOS',     Icon: Siren },
];

export const BottomNav: React.FC = () => {
  const { currentTab, setCurrentTab } = useApp();

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0, left: 0, right: 0,
      height: 'var(--nav-h)',
      background: 'var(--card-glass)',
      backdropFilter: 'var(--blur)',
      WebkitBackdropFilter: 'var(--blur)',
      borderTop: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'stretch',
      zIndex: 100,
    }}>
      {NAV_ITEMS.map(({ id, label, Icon }) => {
        const active = currentTab === id;
        const isSOS  = id === 'emergency-sos';

        return (
          <motion.button
            key={id}
            onClick={() => setCurrentTab(id)}
            whileTap={{ scale: 0.88 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            style={{
              flex: 1,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 3,
              border: 0, background: 'transparent',
              cursor: 'pointer', position: 'relative', padding: 0, outline: 'none',
            }}
          >
            {/* Active indicator — copper top line */}
            {active && (
              <motion.span
                layoutId="nav-bar"
                style={{
                  position: 'absolute', top: 0,
                  left: '22%', right: '22%', height: 2,
                  background: isSOS ? 'var(--danger)' : 'var(--copper)',
                  borderRadius: '0 0 2px 2px',
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              />
            )}

            <Icon
              size={isSOS ? 19 : 17}
              strokeWidth={active ? 2.3 : 1.6}
              style={{
                color: isSOS
                  ? (active ? 'var(--danger)' : 'var(--text-faint)')
                  : (active ? 'var(--copper)' : 'var(--text-faint)'),
                transition: 'color 0.18s',
              }}
            />
            <span style={{
              fontSize: 9, fontWeight: active ? 700 : 500,
              letterSpacing: '0.02em',
              color: isSOS
                ? (active ? 'var(--danger)' : 'var(--text-faint)')
                : (active ? 'var(--text)' : 'var(--text-faint)'),
              transition: 'color 0.18s',
            }}>
              {label}
            </span>
          </motion.button>
        );
      })}
    </nav>
  );
};
