import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { DriverHome } from './components/DriverHome';
import { ResilientNavigation } from './components/ResilientNavigation';
import { IncidentReporting } from './components/IncidentReporting';
import { OfflineSyncCenter } from './components/OfflineSyncCenter';
import { EmergencySOS } from './components/EmergencySOS';
import { ActiveDrivingHUD } from './components/ActiveDrivingHUD';
import { AuthPage } from './components/AuthPage';

// Theme context
export const ThemeContext = React.createContext<{
  isDark: boolean;
  toggleTheme: () => void;
}>({ isDark: false, toggleTheme: () => {} });

const MainContent: React.FC = () => {
  const { currentTab, toastMessage, isDrivingJourney, dismissToast } = useApp();
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return (
    <div style={{ height: '100%', background: 'var(--bg)', color: 'var(--text)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Fixed Header */}
      <Header currentTab={currentTab} />

      {/* Scrollable content */}
      <main style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        paddingTop: 'calc(var(--header-h) + 14px)',
        paddingBottom: 'calc(var(--nav-h) + 14px)',
        paddingLeft: 14,
        paddingRight: 14,
        maxWidth: 480,
        width: '100%',
        margin: '0 auto',
      }}>
        {currentTab === 'driver-home'          && <DriverHome />}
        {currentTab === 'resilient-navigation' && <ResilientNavigation />}
        {currentTab === 'incident-reporting'   && <IncidentReporting />}
        {currentTab === 'emergency-sos'        && <EmergencySOS />}
        {currentTab === 'offline-sync-center'  && <OfflineSyncCenter />}
      </main>

      {/* Fixed Bottom Nav */}
      <BottomNav />

      {/* Fullscreen Driving HUD */}
      {isDrivingJourney && <ActiveDrivingHUD />}

      {/* Responsive Multi-line Toast Notification with Tap-to-Dismiss */}
      {toastMessage && (
        <div
          onClick={dismissToast}
          style={{
            position: 'fixed',
            top: 'calc(var(--header-h) + 10px)',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 14px',
            background: 'var(--card-glass)',
            backdropFilter: 'var(--blur)',
            WebkitBackdropFilter: 'var(--blur)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-card)',
            color: 'var(--text)',
            fontSize: 11,
            fontWeight: 600,
            lineHeight: 1.4,
            boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
            width: 'calc(100% - 24px)',
            maxWidth: 440,
            wordBreak: 'break-word',
            whiteSpace: 'normal',
            cursor: 'pointer',
          }}
          title="Tap to dismiss"
        >
          <div style={{ flex: 1 }}>{toastMessage}</div>
          <span style={{ fontSize: 10, opacity: 0.6, padding: '2px 4px', userSelect: 'none' }}>✕</span>
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [isDark, setIsDark] = useState(() => {
    // Persist preference
    try { return localStorage.getItem('sf-theme') === 'dark'; } catch { return false; }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.setAttribute('data-theme', 'dark');
      root.classList.add('dark');
    } else {
      root.removeAttribute('data-theme');
      root.classList.remove('dark');
    }
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', isDark ? '#0A0A0C' : '#F7F5F0');
    }
    try { localStorage.setItem('sf-theme', isDark ? 'dark' : 'light'); } catch {}
  }, [isDark]);

  const toggleTheme = () => setIsDark(d => !d);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      <LanguageProvider>
        <AuthProvider>
          <AppProvider>
            <MainContent />
          </AppProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeContext.Provider>
  );
}
