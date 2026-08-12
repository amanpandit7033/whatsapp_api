import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserIcon, ShieldIcon, LockIcon, KeyIcon, CheckCircleIcon, CalendarIcon, DeviceIcon, SendIcon, WarningIcon } from '../components/Icons';

export const Profile = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updating, setUpdating] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/profile`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.status === 401) { navigate('/login'); return; }
      const data = await res.json();
      setUser(data.user);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    if (newPassword !== confirmPassword) {
      setMsg({ type: 'error', text: 'New password and confirm password do not match.' });
      return;
    }
    if (newPassword.length < 4) {
      setMsg({ type: 'error', text: 'New password must be at least 4 characters long.' });
      return;
    }

    setUpdating(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      setUpdating(false);

      if (res.ok) {
        setMsg({ type: 'success', text: 'Password updated successfully!' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setMsg({ type: 'error', text: data.error || 'Failed to update password' });
      }
    } catch {
      setUpdating(false);
      setMsg({ type: 'error', text: 'Network error occurred' });
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px' }}>
        <div style={{ width: '28px', height: '28px', border: '3px solid #E2E8F0', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  const Icon = user?.isAdmin ? ShieldIcon : UserIcon;
  const isExpired = user?.expiresAt && new Date(user.expiresAt) < new Date();
  const instancePct = user ? Math.min(100, ((user._count?.instances || 0) / user.maxInstances) * 100) : 0;
  const msgPct = user ? Math.min(100, (user.messagesSentThisMonth / user.messageLimit) * 100) : 0;

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '900px', margin: '0 auto' }}>
      
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
          Account Profile & Security
        </h2>
        <p style={{ color: '#64748B', fontSize: '14px', margin: 0, fontWeight: 500 }}>
          Manage your account credentials, limits, and security password.
        </p>
      </div>

      {/* Account Overview Card */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid #F1F5F9' }}>
          <div style={{ width: '54px', height: '54px', borderRadius: '16px', background: user?.isAdmin ? '#F3E8FF' : '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon size={26} color={user?.isAdmin ? '#7C3AED' : '#2563EB'} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#0F172A' }}>{user?.username}</h3>
              <span style={{ background: user?.isAdmin ? '#F3E8FF' : '#EFF6FF', color: user?.isAdmin ? '#7C3AED' : '#2563EB', padding: '3px 10px', borderRadius: '9999px', fontSize: '11px', fontWeight: 800 }}>
                {user?.isAdmin ? 'ADMINISTRATOR' : 'STANDARD USER'}
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748B', fontWeight: 500 }}>
              Joined {new Date(user?.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
          
          {/* Instance Limit */}
          <div style={{ background: '#F8FAFC', borderRadius: '14px', padding: '16px 20px', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>MAX INSTANCES</span>
              <DeviceIcon size={16} color="#2563EB" />
            </div>
            <p style={{ fontSize: '20px', fontWeight: 900, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
              {user?._count?.instances || 0} <span style={{ fontSize: '13px', fontWeight: 600, color: '#94A3B8' }}>/ {user?.maxInstances}</span>
            </p>
            <div style={{ height: '5px', background: '#E2E8F0', borderRadius: '9999px', marginTop: '10px', overflow: 'hidden' }}>
              <div style={{ height: '100%', background: '#2563EB', borderRadius: '9999px', width: `${instancePct}%` }} />
            </div>
          </div>

          {/* Message Limit */}
          <div style={{ background: '#F8FAFC', borderRadius: '14px', padding: '16px 20px', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>MONTHLY MESSAGES</span>
              <SendIcon size={16} color="#059669" />
            </div>
            <p style={{ fontSize: '20px', fontWeight: 900, color: '#0F172A', margin: 0, letterSpacing: '-0.02em', fontFamily: 'var(--font-mono)' }}>
              {(user?.messagesSentThisMonth || 0).toLocaleString()} <span style={{ fontSize: '13px', fontWeight: 600, color: '#94A3B8' }}>/ {(user?.messageLimit || 0).toLocaleString()}</span>
            </p>
            <div style={{ height: '5px', background: '#E2E8F0', borderRadius: '9999px', marginTop: '10px', overflow: 'hidden' }}>
              <div style={{ height: '100%', background: '#059669', borderRadius: '9999px', width: `${msgPct}%` }} />
            </div>
          </div>

          {/* Account Expiry */}
          <div style={{ background: '#F8FAFC', borderRadius: '14px', padding: '16px 20px', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>EXPIRATION DATE</span>
              <CalendarIcon size={16} color="#7C3AED" />
            </div>
            {user?.expiresAt ? (
              <span style={{ fontSize: '14px', fontWeight: 800, color: isExpired ? '#DC2626' : '#0F172A', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                {isExpired && <WarningIcon size={14} color="#DC2626" />}
                <span>{new Date(user.expiresAt).toLocaleDateString()}{isExpired ? ' (Expired)' : ''}</span>
              </span>
            ) : (
              <span style={{ fontSize: '14px', fontWeight: 800, color: '#059669' }}>
                Never Expire
              </span>
            )}
          </div>

        </div>
      </div>

      {/* Change Password Card */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <KeyIcon size={20} color="#2563EB" />
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>Update Password</h3>
        </div>

        {msg && (
          <div style={{
            background: msg.type === 'success' ? '#F0FDF4' : '#FEF2F2',
            border: `1px solid ${msg.type === 'success' ? '#BBF7D0' : '#FEE2E2'}`,
            color: msg.type === 'success' ? '#15803D' : '#DC2626',
            borderRadius: '12px', padding: '12px 16px', fontSize: '13px', fontWeight: 700, marginBottom: '20px'
          }}>
            {msg.text}
          </div>
        )}

        <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#64748B', marginBottom: '6px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              className="rounded-input"
              placeholder="••••••••••••"
              required
            />
          </div>

          <div className="profile-pw-grid">
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#64748B', marginBottom: '6px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="rounded-input"
                placeholder="At least 4 characters"
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#64748B', marginBottom: '6px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="rounded-input"
                placeholder="Re-enter new password"
                required
              />
            </div>
          </div>

          <div style={{ marginTop: '8px' }}>
            <button
              type="submit"
              disabled={updating}
              className="btn-primary"
              style={{
                padding: '12px 24px', fontSize: '14px', fontWeight: 800, borderRadius: '10px',
                display: 'inline-flex', alignItems: 'center', gap: '8px'
              }}
            >
              {updating ? 'Updating...' : 'Save New Password'}
            </button>
          </div>
        </form>
      </div>

    </div>
  );
};
