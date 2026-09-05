import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth, UserProfile } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  User,
  Shield,
  KeyRound,
  Lock,
  Mail,
  Phone,
  Building2,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  X,
  LogOut,
  ChevronRight,
  Sparkles,
  Users,
} from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSwitcher?: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  onOpenSwitcher,
}) => {
  const { currentUser, logout, changePassword, allUsers, quickLogin } = useAuth();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'switch'>('profile');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passLoading, setPassLoading] = useState(false);
  const [passMessage, setPassMessage] = useState<{ text: string; isError: boolean } | null>(null);

  if (!isOpen) return null;

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMessage(null);

    if (newPassword !== confirmPassword) {
      setPassMessage({ text: 'New passwords do not match.', isError: true });
      return;
    }
    if (newPassword.length < 4) {
      setPassMessage({ text: 'Password must be at least 4 characters.', isError: true });
      return;
    }

    setPassLoading(true);
    try {
      const res = await changePassword(currentPassword, newPassword);
      if (res.success) {
        setPassMessage({ text: 'Password updated successfully in database.', isError: false });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPassMessage({ text: res.error || 'Failed to update password.', isError: true });
      }
    } catch (err: any) {
      setPassMessage({ text: err.message || 'Error updating password', isError: true });
    } finally {
      setPassLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2 }}
        style={{
          width: '100%',
          maxWidth: 440,
          background: 'var(--card)',
          borderRadius: 'var(--radius-card)',
          border: '1px solid var(--border)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.45)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg-warm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={16} strokeWidth={2} style={{ color: 'var(--copper)' }} />
            <span className="font-title" style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.2px', color: 'var(--text)', fontFamily: 'var(--font-heading)' }}>
              Operator Profile & Security
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text-muted)',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            padding: '8px 16px 0',
            gap: 6,
            background: 'var(--bg-warm)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          {[
            { id: 'profile', label: 'Details', icon: User },
            { id: 'security', label: 'Security & Password', icon: KeyRound },
            { id: 'switch', label: 'Switch Operator', icon: Users },
          ].map(({ id, label, icon: Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setActiveTab(id as any);
                  setPassMessage(null);
                }}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                  padding: '7px 8px',
                  borderRadius: 'var(--radius-pill)',
                  border: 0,
                  background: active ? 'var(--card)' : 'transparent',
                  color: active ? 'var(--copper)' : 'var(--text-muted)',
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                <Icon size={12} strokeWidth={2} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div style={{ padding: '16px 18px', overflowY: 'auto', flex: 1 }}>
          {activeTab === 'profile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Primary Operator Badge Card */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-card)',
                  background: 'var(--bg-warm)',
                  border: '1px solid var(--border)',
                }}
              >
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: '50%',
                    background: currentUser.avatarColor || 'var(--copper)',
                    color: '#FFFFFF',
                    fontSize: 18,
                    fontWeight: 800,
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  }}
                >
                  {currentUser.name.charAt(0)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="font-title" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2, fontFamily: 'var(--font-heading)' }}>
                    {currentUser.name}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                    {currentUser.role}
                  </div>
                  <div style={{ marginTop: 4, display: 'flex', gap: 5 }}>
                    <span className="pill pill-copper" style={{ fontSize: 8 }}>
                      {currentUser.badge}
                    </span>
                    <span className="pill pill-success" style={{ fontSize: 8 }}>
                      Active
                    </span>
                  </div>
                </div>
              </div>

              {/* Detailed Operational Attributes */}
              <div
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-card)',
                  overflow: 'hidden',
                }}
              >
                {[
                  { icon: Shield, label: 'Clearance Level', value: currentUser.clearance },
                  { icon: Building2, label: 'Department / Hub', value: currentUser.department },
                  { icon: MapPin, label: 'Assigned Sector', value: currentUser.sector },
                  { icon: Mail, label: 'Official Email', value: currentUser.email },
                  { icon: Phone, label: 'Field Comms / Phone', value: currentUser.phone },
                  { icon: Clock, label: 'Last Active Session', value: currentUser.lastLogin || 'Today' },
                ].map(({ icon: Icon, label, value }, idx) => (
                  <div
                    key={label}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      padding: '10px 14px',
                      borderTop: idx > 0 ? '1px solid var(--border-soft)' : undefined,
                      fontSize: 11,
                    }}
                  >
                    <Icon size={14} strokeWidth={2} style={{ color: 'var(--copper)', marginTop: 2, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                        {label}
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', marginTop: 1, wordBreak: 'break-word' }}>
                        {value}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <form onSubmit={handleChangePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                Update your tactical field operator password. Changes will persist directly to the field database.
              </div>

              {passMessage && (
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-card)',
                    fontSize: 10,
                    fontWeight: 700,
                    background: passMessage.isError ? 'var(--danger-10)' : 'var(--success-10)',
                    color: passMessage.isError ? 'var(--danger)' : 'var(--success)',
                    border: `1px solid ${passMessage.isError ? 'rgba(196,72,59,0.3)' : 'rgba(47,143,91,0.3)'}`,
                  }}
                >
                  {passMessage.text}
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>
                  Current Password
                </label>
                <input
                  type="password"
                  placeholder="Enter current password (default: password123)"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  style={{ width: '100%', fontSize: 11 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>
                  New Password
                </label>
                <input
                  type="password"
                  placeholder="Enter new secure password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ width: '100%', fontSize: 11 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>
                  Confirm New Password
                </label>
                <input
                  type="password"
                  placeholder="Re-type new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{ width: '100%', fontSize: 11 }}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={passLoading || !newPassword}
                style={{ width: '100%', minHeight: 40, marginTop: 6, fontSize: 11, fontWeight: 800 }}
              >
                <Lock size={13} strokeWidth={2} />
                <span>{passLoading ? 'Updating Database…' : 'Update Password'}</span>
              </button>
            </form>
          )}

          {activeTab === 'switch' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                Switch to any registered field operator profile in the database:
              </div>
              {allUsers.map((user) => {
                const isCurrent = user.id === currentUser.id;
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => {
                      quickLogin(user.id);
                      onClose();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-card)',
                      border: '1px solid',
                      borderColor: isCurrent ? 'var(--copper)' : 'var(--border)',
                      background: isCurrent ? 'var(--copper-10)' : 'var(--card)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          background: user.avatarColor || 'var(--copper)',
                          color: '#FFFFFF',
                          fontSize: 10,
                          fontWeight: 800,
                          display: 'grid',
                          placeItems: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {user.name.charAt(0)}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div className="font-title" style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-heading)' }}>
                          {user.name}
                        </div>
                        <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>
                          {user.role} · {user.unitId}
                        </div>
                      </div>
                    </div>
                    {isCurrent && (
                      <span className="pill pill-copper" style={{ fontSize: 8 }}>
                        Active
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
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
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            style={{ fontSize: 10 }}
          >
            Close
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              logout();
              onClose();
            }}
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--danger)',
              borderColor: 'rgba(196,72,59,0.3)',
              gap: 5,
            }}
          >
            <LogOut size={12} strokeWidth={2} />
            <span>Sign Out Session</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
