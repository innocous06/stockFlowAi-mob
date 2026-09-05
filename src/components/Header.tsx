import React, { useContext, useState, useRef, useEffect } from 'react';
import { BrandMark } from './StockFlowLogo';
import { useApp } from '../context/AppContext';
import { useLanguage, SupportedLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { ThemeContext } from '../App';
import { Wifi, WifiOff, Sun, Moon, Globe, ChevronDown, Check, User, X, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfileModal } from './UserProfileModal';

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
  const { currentLanguageInfo, setLanguage, northeastLanguages, globalLanguages, t } = useLanguage();
  const { currentUser } = useAuth();

  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setShowLangMenu(false);
      }
    };
    if (showLangMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showLangMenu]);

  return (
    <>
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
        padding: '0 12px',
        gap: 8,
        zIndex: 100,
      }}>
        {/* Brand Lockup */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <BrandMark size={24} />
          <div style={{ lineHeight: 1.15 }}>
            <div className="font-title" style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.3px', color: 'var(--text)', fontFamily: 'var(--font-heading)' }}>
              StockFlow
            </div>
            <div style={{ fontSize: 8, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              {t('header.ops')}
            </div>
          </div>
        </div>

        <div style={{ flex: 1 }} />

        {/* User Profile Pill Button (Quick Switcher) */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => setShowProfileModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '3px 8px 3px 4px',
            borderRadius: 'var(--radius-pill)',
            border: '1px solid var(--border)',
            background: 'var(--bg-warm)',
            color: 'var(--text)',
            cursor: 'pointer',
            maxWidth: 120,
          }}
          title={`Active Operator: ${currentUser.name} (${currentUser.badge})`}
        >
          <div style={{
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: currentUser.avatarColor || 'var(--copper)',
            color: '#FFFFFF',
            fontSize: 9,
            fontWeight: 800,
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
          }}>
            {currentUser.name.charAt(0)}
          </div>
          <span
            className="font-title"
            style={{
              fontSize: 11,
              fontWeight: 700,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontFamily: 'var(--font-heading)',
            }}
          >
            {currentUser.name.split(' ')[0]}
          </span>
        </motion.button>

        {/* Network Status Badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '3px 7px',
          background: isOnline ? 'var(--success-10)' : 'var(--danger-10)',
          borderRadius: 'var(--radius-pill)',
          border: `1px solid ${isOnline ? 'rgba(47,143,91,0.2)' : 'rgba(196,72,59,0.2)'}`,
          fontSize: 9, fontWeight: 700,
          color: isOnline ? 'var(--success)' : 'var(--danger)',
          flexShrink: 0,
        }}>
          {isOnline
            ? <Wifi size={10} strokeWidth={2.2} />
            : <WifiOff size={10} strokeWidth={2.2} />
          }
          <span>{isOnline ? t('header.live') : t('header.off')}</span>
        </div>

        {/* Theme Toggle Button */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={toggleTheme}
          style={{
            width: 28, height: 28,
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

        {/* Language Selector Dropdown Button (Beside Dark Mode) */}
        <div style={{ position: 'relative' }} ref={langMenuRef}>
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => setShowLangMenu((prev) => !prev)}
            style={{
              height: 28,
              padding: '0 8px',
              borderRadius: 'var(--radius-pill)',
              border: showLangMenu ? '1px solid var(--copper)' : '1px solid var(--border)',
              background: showLangMenu ? 'var(--copper-10)' : 'var(--bg-warm)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              cursor: 'pointer',
              flexShrink: 0,
              color: showLangMenu ? 'var(--copper)' : 'var(--text)',
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: '0.04em',
            }}
            title={`Language: ${currentLanguageInfo.name}`}
          >
            <span>{currentLanguageInfo.shortCode}</span>
            <ChevronDown size={10} strokeWidth={2.5} style={{
              transform: showLangMenu ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.15s ease',
              color: 'var(--text-muted)',
            }} />
          </motion.button>

          {/* Language Dropdown Popover */}
          <AnimatePresence>
            {showLangMenu && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.96 }}
                transition={{ duration: 0.14 }}
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  width: 260,
                  maxHeight: 380,
                  overflowY: 'auto',
                  background: 'var(--card)',
                  borderRadius: 'var(--radius-card)',
                  border: '1px solid var(--border)',
                  boxShadow: '0 12px 36px rgba(0,0,0,0.18)',
                  padding: '8px 6px',
                  zIndex: 1000,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                {/* Group 1: North Eastern Languages */}
                <div style={{
                  padding: '4px 8px 2px',
                  fontSize: 9,
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--copper)',
                }}>
                  North Eastern Languages
                </div>

                {northeastLanguages.map((lang) => {
                  const isSelected = lang.code === currentLanguageInfo.code;
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => {
                        setLanguage(lang.code as SupportedLanguage);
                        setShowLangMenu(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 10px',
                        borderRadius: 'var(--radius-sharp)',
                        border: 0,
                        background: isSelected ? 'var(--copper-10)' : 'transparent',
                        color: isSelected ? 'var(--copper)' : 'var(--text)',
                        fontSize: 12,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background 0.1s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          fontSize: 9,
                          fontWeight: 800,
                          padding: '1px 5px',
                          borderRadius: 'var(--radius-pill)',
                          background: isSelected ? 'var(--copper)' : 'var(--bg-warm)',
                          color: isSelected ? '#FFFFFF' : 'var(--text-muted)',
                        }}>
                          {lang.shortCode}
                        </span>
                        <div>
                          <div style={{ fontWeight: isSelected ? 700 : 500 }}>{lang.name}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>{lang.nativeName}</div>
                        </div>
                      </div>
                      {isSelected && <Check size={14} strokeWidth={2.5} style={{ color: 'var(--copper)' }} />}
                    </button>
                  );
                })}

                {/* Divider */}
                <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />

                {/* Group 2: Indian & Global Languages */}
                <div style={{
                  padding: '4px 8px 2px',
                  fontSize: 9,
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                }}>
                  National & Global Languages
                </div>

                {globalLanguages.map((lang) => {
                  const isSelected = lang.code === currentLanguageInfo.code;
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => {
                        setLanguage(lang.code as SupportedLanguage);
                        setShowLangMenu(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 10px',
                        borderRadius: 'var(--radius-sharp)',
                        border: 0,
                        background: isSelected ? 'var(--copper-10)' : 'transparent',
                        color: isSelected ? 'var(--copper)' : 'var(--text)',
                        fontSize: 12,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background 0.1s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          fontSize: 9,
                          fontWeight: 800,
                          padding: '1px 5px',
                          borderRadius: 'var(--radius-pill)',
                          background: isSelected ? 'var(--copper)' : 'var(--bg-warm)',
                          color: isSelected ? '#FFFFFF' : 'var(--text-muted)',
                        }}>
                          {lang.shortCode}
                        </span>
                        <div>
                          <div style={{ fontWeight: isSelected ? 700 : 500 }}>{lang.name}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>{lang.nativeName}</div>
                        </div>
                      </div>
                      {isSelected && <Check size={14} strokeWidth={2.5} style={{ color: 'var(--copper)' }} />}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Operator Profile & Security Details Modal */}
      <UserProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
    </>
  );
};
