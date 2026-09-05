import React, { useState, useContext, useRef, useEffect } from 'react';
import { useAuth, UserProfile } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { ThemeContext } from '../App';
import { BrandMark } from './StockFlowLogo';
import {
  Shield,
  CheckCircle2,
  ArrowRight,
  UserCheck,
  Truck,
  HardHat,
  HeartPulse,
  Mountain,
  Building2,
  Lock,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  Sparkles,
  Sun,
  Moon,
  ChevronDown,
  Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AuthPageProps {
  onSuccess?: () => void;
}

const USER_ICONS: Record<string, React.ReactNode> = {
  user_veyjval: <Building2 size={13} strokeWidth={2} />,
  user_shreyas: <HardHat size={13} strokeWidth={2} />,
  user_pari: <HeartPulse size={13} strokeWidth={2} />,
  user_arnab: <Mountain size={13} strokeWidth={2} />,
  user_dharmanshu: <Shield size={13} strokeWidth={2} />,
  user_thavanesh: <Truck size={13} strokeWidth={2} />,
};

export const AuthPage: React.FC<AuthPageProps> = ({ onSuccess }) => {
  const { login, quickLogin, allUsers } = useAuth();
  const { isDark, toggleTheme } = useContext(ThemeContext);
  const { currentLanguageInfo, setLanguage, northeastLanguages, globalLanguages } = useLanguage();
  const [showLangMenu, setShowLangMenu] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);

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

  const [emailOrBadge, setEmailOrBadge] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrBadge.trim()) {
      setError('Please enter your Work Email or Badge ID.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await login(emailOrBadge, password);
      if (res.success) {
        if (onSuccess) onSuccess();
      } else {
        setError(res.error || 'Authentication failed. Please verify credentials.');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoClick = async (user: UserProfile) => {
    setEmailOrBadge(user.email);
    setPassword(user.password || 'password123');
    setLoading(true);
    setError(null);
    try {
      await quickLogin(user.id);
      if (onSuccess) onSuccess();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        background: 'var(--bg)',
        color: 'var(--text)',
      }}
    >
      <div
        style={{
          minHeight: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '24px 16px 48px 16px',
          maxWidth: 440,
          margin: '0 auto',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {/* Top utility row: Status tag + Theme Toggle + Language Selector */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
            width: '100%',
          }}
        >
          <span
            className="pill pill-muted"
            style={{
              fontSize: 8,
              fontWeight: 800,
              letterSpacing: '0.08em',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <Shield size={10} style={{ color: 'var(--copper)' }} />
            <span>SECURE GATEWAY</span>
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* Theme Toggle Button */}
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={toggleTheme}
              style={{
                width: 28,
                height: 28,
                borderRadius: 'var(--radius-pill)',
                border: '1px solid var(--border)',
                background: 'var(--bg-warm)',
                display: 'grid',
                placeItems: 'center',
                cursor: 'pointer',
                flexShrink: 0,
                color: 'var(--text-muted)',
              }}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <Sun size={13} strokeWidth={2} /> : <Moon size={13} strokeWidth={2} />}
            </motion.button>

            {/* Language Selector Dropdown Button */}
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
                <ChevronDown
                  size={10}
                  strokeWidth={2.5}
                  style={{
                    transform: showLangMenu ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.15s ease',
                    color: 'var(--text-muted)',
                  }}
                />
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
                      width: 250,
                      maxHeight: 340,
                      overflowY: 'auto',
                      background: 'var(--card)',
                      borderRadius: 'var(--radius-card)',
                      border: '1px solid var(--border)',
                      boxShadow: '0 12px 36px rgba(0,0,0,0.22)',
                      padding: '8px 6px',
                      zIndex: 1000,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                    }}
                  >
                    {/* North Eastern Languages */}
                    <div
                      style={{
                        padding: '4px 8px 2px',
                        fontSize: 9,
                        fontWeight: 800,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: 'var(--copper)',
                      }}
                    >
                      North East Languages
                    </div>
                    {northeastLanguages.map((lang) => (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => {
                          setLanguage(lang.code);
                          setShowLangMenu(false);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '6px 8px',
                          borderRadius: 'var(--radius-card)',
                          border: 0,
                          background: currentLanguageInfo.code === lang.code ? 'var(--copper-10)' : 'transparent',
                          color: currentLanguageInfo.code === lang.code ? 'var(--copper)' : 'var(--text)',
                          fontSize: 11,
                          fontWeight: currentLanguageInfo.code === lang.code ? 700 : 500,
                          cursor: 'pointer',
                          textAlign: 'left',
                          width: '100%',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>{lang.flag}</span>
                          <span>{lang.name}</span>
                          <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>({lang.nativeName})</span>
                        </div>
                        {currentLanguageInfo.code === lang.code && (
                          <Check size={12} strokeWidth={2.5} style={{ color: 'var(--copper)' }} />
                        )}
                      </button>
                    ))}

                    <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />

                    {/* Global Languages */}
                    <div
                      style={{
                        padding: '4px 8px 2px',
                        fontSize: 9,
                        fontWeight: 800,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: 'var(--copper)',
                      }}
                    >
                      Indian & Global
                    </div>
                    {globalLanguages.map((lang) => (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => {
                          setLanguage(lang.code);
                          setShowLangMenu(false);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '6px 8px',
                          borderRadius: 'var(--radius-card)',
                          border: 0,
                          background: currentLanguageInfo.code === lang.code ? 'var(--copper-10)' : 'transparent',
                          color: currentLanguageInfo.code === lang.code ? 'var(--copper)' : 'var(--text)',
                          fontSize: 11,
                          fontWeight: currentLanguageInfo.code === lang.code ? 700 : 500,
                          cursor: 'pointer',
                          textAlign: 'left',
                          width: '100%',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>{lang.flag}</span>
                          <span>{lang.name}</span>
                          <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>({lang.nativeName})</span>
                        </div>
                        {currentLanguageInfo.code === lang.code && (
                          <Check size={12} strokeWidth={2.5} style={{ color: 'var(--copper)' }} />
                        )}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      {/* Brand Header */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          marginBottom: 20,
          gap: 12,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '6px 14px',
            background: 'var(--card-glass)',
            backdropFilter: 'var(--blur)',
            WebkitBackdropFilter: 'var(--blur)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-pill)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}
        >
          <BrandMark size={28} />
          <div style={{ textAlign: 'left', lineHeight: 1.15 }}>
            <div className="font-title" style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.3px', color: 'var(--text)', fontFamily: 'var(--font-heading)' }}>
              StockFlow <span style={{ color: 'var(--copper)' }}>AI</span>
            </div>
            <div style={{ fontSize: 8, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Field Operations Network
            </div>
          </div>
        </div>

        <div>
          <h1 className="font-title" style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.4px', margin: 0, color: 'var(--text)', fontFamily: 'var(--font-heading)' }}>
            Operator Authentication
          </h1>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Secure login for field logistics, incident dispatch & convoys
          </p>
        </div>
      </div>

      {/* Main Login Card */}
      <div
        className="card-glass"
        style={{
          padding: '22px 20px',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-card)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.14)',
          marginBottom: 16,
        }}
      >
        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              padding: '10px 12px',
              borderRadius: 'var(--radius-card)',
              background: 'var(--danger-10)',
              border: '1px solid rgba(196,72,59,0.3)',
              color: 'var(--danger)',
              fontSize: 11,
              fontWeight: 600,
              marginBottom: 16,
            }}
          >
            <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{error}</span>
          </div>
        )}

        {/* 1-Tap Operator Shortcuts Grid */}
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 9,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--copper)',
              marginBottom: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <Sparkles size={11} />
            <span className="font-title" style={{ fontFamily: 'var(--font-heading)' }}>1-Tap Operator Access</span>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 6,
            }}
          >
            {allUsers.map((u) => {
              const icon = USER_ICONS[u.id];
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleQuickDemoClick(u)}
                  disabled={loading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 8px',
                    borderRadius: 'var(--radius-card)',
                    border: '1px solid var(--border)',
                    background: 'var(--card)',
                    color: 'var(--text)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    minWidth: 0,
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--copper)';
                    e.currentTarget.style.background = 'var(--copper-10)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.background = 'var(--card)';
                  }}
                  title={`Sign in as ${u.name}`}
                >
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: u.avatarColor || 'var(--copper)',
                      color: '#FFFFFF',
                      display: 'grid',
                      placeItems: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {icon || <span style={{ fontSize: 9, fontWeight: 800 }}>{u.name.charAt(0)}</span>}
                  </div>
                  <div style={{ minWidth: 0, overflow: 'hidden' }}>
                    <div
                      className="font-title"
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        fontFamily: 'var(--font-heading)',
                      }}
                    >
                      {u.name}
                    </div>
                    <div
                      style={{
                        fontSize: 7.5,
                        color: 'var(--text-muted)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {u.badge}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Email / Badge Input */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 10,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: 'var(--text-muted)',
                marginBottom: 6,
              }}
            >
              Work Email / Badge ID / Callsign
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="e.g. veyjval@stockflow.ai or HUB COMMAND"
                value={emailOrBadge}
                onChange={(e) => setEmailOrBadge(e.target.value)}
                style={{
                  width: '100%',
                  paddingLeft: 36,
                  fontSize: 11,
                  minHeight: 42,
                }}
                disabled={loading}
              />
              <Mail
                size={14}
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  pointerEvents: 'none',
                }}
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 10,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: 'var(--text-muted)',
                marginBottom: 6,
              }}
            >
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter account password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  paddingLeft: 36,
                  paddingRight: 36,
                  fontSize: 11,
                  minHeight: 42,
                }}
                disabled={loading}
              />
              <Lock
                size={14}
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  pointerEvents: 'none',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 0,
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  padding: 4,
                }}
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || !emailOrBadge}
            style={{
              width: '100%',
              minHeight: 44,
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              marginTop: 4,
            }}
          >
            {loading ? (
              <>
                <Loader2 size={14} className="spinning" />
                <span>Verifying Credentials…</span>
              </>
            ) : (
              <>
                <span>Sign In to Field Dashboard</span>
                <ArrowRight size={14} strokeWidth={2.5} />
              </>
            )}
          </button>
        </form>
      </div>

    </div>
  </div>
);
};
