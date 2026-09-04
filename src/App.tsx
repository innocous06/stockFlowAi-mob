import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { LanguageProvider } from './context/LanguageContext';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { DriverHome } from './components/DriverHome';
import { ResilientNavigation } from './components/ResilientNavigation';
import { IncidentReporting } from './components/IncidentReporting';
import { OfflineSyncCenter } from './components/OfflineSyncCenter';
import { EmergencySOS } from './components/EmergencySOS';
import { ActiveDrivingHUD } from './components/ActiveDrivingHUD';

// Theme context
export const ThemeContext = React.createContext<{
  isDark: boolean;
  toggleTheme: () => void;
}>({ isDark: false, toggleTheme: () => {} });

const MainContent: React.FC = () => {
  const { currentTab, toastMessage, isDrivingJourney } = useApp();

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

      {/* Toast */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: 'calc(var(--header-h) + 8px)',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 300,
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '9px 16px',
          background: 'var(--card-glass)',
          backdropFilter: 'var(--blur)',
          WebkitBackdropFilter: 'var(--blur)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-pill)',
          color: 'var(--text)',
          fontSize: 11, fontWeight: 600,
          boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
          maxWidth: '86vw',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {toastMessage}
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
        <AppProvider>
          <MainContent />
        </AppProvider>
      </LanguageProvider>
    </ThemeContext.Provider>
  );
}
