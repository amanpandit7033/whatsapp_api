import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { UserIcon, ShieldIcon, WarningIcon, UserPlusIcon, SearchIcon, EditIcon, CheckCircleIcon, GlassIcon } from '../components/Icons';

const S: Record<string, React.CSSProperties> = {
  label: { display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748B', marginBottom: '8px' },
};

export const AdminPanel = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newMaxInstances, setNewMaxInstances] = useState('1');
  const [newMessageLimit, setNewMessageLimit] = useState('1000');
  const [newExpiresAt, setNewExpiresAt] = useState('');
  const [newPermissions, setNewPermissions] = useState<string[]>(['instances', 'broadcast', 'reports', 'docs']);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editPassword, setEditPassword] = useState('');
  const navigate = useNavigate();

  useEffect(() => { fetchUsers(); }, [page, search]);

  const fetchUsers = async () => {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/users?page=${page}&limit=10&search=${search}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    if (res.status === 401 || res.status === 403) { navigate('/'); return; }
    const data = await res.json();
    if (data.users) { setUsers(data.users); setTotalPages(data.totalPages); }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSuccess('');
    if (!newUsername || !newPassword) { setError('Username and password required'); return; }
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/users`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: newUsername, password: newPassword, maxInstances: parseInt(newMaxInstances), messageLimit: parseInt(newMessageLimit), expiresAt: newExpiresAt || undefined, permissions: newPermissions.join(',') })
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'Failed'); }
    else { setSuccess(`User "${data.user.username}" created!`); setNewUsername(''); setNewPassword(''); setNewMaxInstances('1'); setNewMessageLimit('1000'); setNewExpiresAt(''); setNewPermissions(['instances', 'broadcast', 'reports', 'docs']); setIsAddUserModalOpen(false); fetchUsers(); }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault(); if (!editingUser) return;
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/users/${editingUser.id}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: editingUser.username, password: editPassword || undefined, maxInstances: parseInt(editingUser.maxInstances), messageLimit: parseInt(editingUser.messageLimit), expiresAt: editingUser.expiresAt || null, isAdmin: editingUser.isAdmin, permissions: editingUser.permissions })
    });
    if (res.ok) { setEditingUser(null); setEditPassword(''); fetchUsers(); }
    else { const d = await res.json(); alert(d.error || 'Failed'); }
  };

  const totalUsers = users.length;
  const adminCount = users.filter(u => u.isAdmin).length;
  const expiredCount = users.filter(u => u.expiresAt && new Date(u.expiresAt) < new Date()).length;
  const activeCount = users.filter(u => !u.isAdmin && (!u.expiresAt || new Date(u.expiresAt) >= new Date())).length;

  return (
    <div className="animate-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>Admin Control Panel</h2>
          <p style={{ color: '#64748B', fontSize: '14px', margin: 0, fontWeight: 500 }}>Manage users, permissions, and system limits.</p>
        </div>
        <button onClick={() => { setIsAddUserModalOpen(true); setError(''); setSuccess(''); }} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <UserPlusIcon size={16} /> Add User
        </button>
      </div>

      {/* Stat strip (Shopeers Style) */}
      <div className="stats-grid">
        {[
          { label: 'Total Users', val: totalUsers, sub: 'Registered accounts', badge: 'Total', bg: '#EFF6FF', color: '#2563EB', icon: UserIcon },
          { label: 'Admins', val: adminCount, sub: 'System Managers', badge: 'Admin', bg: '#EFF6FF', color: '#2563EB', icon: ShieldIcon },
          { label: 'Active Users', val: activeCount, sub: 'Valid Subscriptions', badge: 'Active', bg: '#D1FAE5', color: '#059669', icon: CheckCircleIcon },
          { label: 'Expired Users', val: expiredCount, sub: 'Needs Renewal', badge: 'Expired', bg: '#FEE2E2', color: '#DC2626', icon: WarningIcon },
        ].map(({ label, val, sub, badge, bg, color, icon: IconComp }) => (
          <div key={label} className="card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748B' }}>{label}</span>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IconComp size={16} color={color} />
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                <span style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>{val}</span>
                <span className={`badge ${badge === 'Expired' ? 'badge-danger' : 'badge-success'}`}>▲ {badge}</span>
              </div>
              <span style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px', display: 'block' }}>{sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Users Table Card (Shopeers Redesigned SaaS Style) */}
      <div className="card" style={{ padding: '24px 0', marginBottom: '24px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '20px', padding: '0 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.01em' }}>Manage System Users</h3>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#2563EB', background: '#EFF6FF', padding: '3px 10px', borderRadius: '9999px' }}>
              {totalUsers} Accounts
            </span>
          </div>
          <div style={{ position: 'relative', width: '240px' }}>
            <input
              type="text" 
              placeholder="Search user..." 
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="rounded-input" 
              style={{ height: '38px', paddingLeft: '38px', paddingRight: '16px', fontSize: '13px', borderRadius: '10px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}
            />
            <SearchIcon size={16} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }} className="custom-scrollbar">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0' }}>
                <th style={{ padding: '14px 28px', fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em', textTransform: 'uppercase' }}>USER ACCOUNT</th>
                <th style={{ padding: '14px 16px', fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em', textTransform: 'uppercase' }}>INSTANCES</th>
                <th style={{ padding: '14px 16px', fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em', textTransform: 'uppercase' }}>MONTHLY LIMIT</th>
                <th style={{ padding: '14px 16px', fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em', textTransform: 'uppercase' }}>EXPIRY</th>
                <th style={{ padding: '14px 16px', fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em', textTransform: 'uppercase' }}>JOINED</th>
                <th style={{ padding: '14px 28px', fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em', textTransform: 'uppercase', textAlign: 'right' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const isExpired = user.expiresAt && new Date(user.expiresAt) < new Date();
                const usagePct = Math.min(100, (user._count.instances / user.maxInstances) * 100);
                const Icon = user.isAdmin ? ShieldIcon : UserIcon;
                return (
                  <tr key={user.id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s ease' }}>
                    <td style={{ padding: '16px 28px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: user.isAdmin ? '#F3E8FF' : '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Icon size={18} color={user.isAdmin ? '#7C3AED' : '#2563EB'} />
                        </div>
                        <div>
                          <p style={{ fontWeight: 800, fontSize: '14px', color: '#0F172A', margin: 0, lineHeight: 1.2 }}>{user.username}</p>
                          {user.isAdmin && <span style={{ background: '#F3E8FF', color: '#7C3AED', padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 800, marginTop: '2px', display: 'inline-block' }}>ADMIN</span>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 800, color: '#0F172A', fontSize: '14px' }}>{user._count.instances}</span>
                        <span style={{ color: '#94A3B8', fontSize: '13px', fontWeight: 600 }}>/ {user.maxInstances}</span>
                      </div>
                      <div style={{ height: '5px', background: '#F1F5F9', borderRadius: '9999px', marginTop: '6px', width: '70px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: '9999px', background: usagePct >= 100 ? '#EF4444' : '#2563EB', width: `${usagePct}%`, transition: 'width 0.5s' }} />
                      </div>
                    </td>
                    <td style={{ padding: '16px 16px' }}>
                      <span style={{ fontWeight: 800, color: '#0F172A', fontSize: '14px', fontFamily: 'var(--font-mono)' }}>{user.messageLimit.toLocaleString()}</span>
                    </td>
                    <td style={{ padding: '16px 16px' }}>
                      {user.expiresAt ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: isExpired ? '#FEE2E2' : '#EFF6FF', padding: '4px 10px', borderRadius: '8px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 800, color: isExpired ? '#DC2626' : '#2563EB' }}>
                            {isExpired ? '⚠️ ' : '📅 '}{new Date(user.expiresAt).toLocaleDateString()}
                          </span>
                        </div>
                      ) : <span style={{ fontSize: '12px', color: '#94A3B8', fontStyle: 'italic', fontWeight: 600 }}>Never</span>}
                    </td>
                    <td style={{ padding: '16px 16px', fontSize: '13px', color: '#64748B', fontWeight: 600 }}>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '16px 28px', textAlign: 'right' }}>
                      <button onClick={() => { setEditingUser({ ...user }); setEditPassword(''); }} style={{
                        background: '#EFF6FF', border: 'none', borderRadius: '10px',
                        padding: '8px 14px', fontSize: '13px', fontWeight: 700, color: '#2563EB',
                        cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s ease'
                      }}>
                        <EditIcon size={14} color="#2563EB" /> Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr><td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: '#94A3B8', fontWeight: 500 }}>No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 28px 0' }}>
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '6px 16px', fontSize: '13px', fontWeight: 700, color: page === 1 ? '#CBD5E1' : '#0F172A', cursor: page === 1 ? 'not-allowed' : 'pointer' }}>← Prev</button>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748B' }}>Page {page} of {totalPages}</span>
            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '6px 16px', fontSize: '13px', fontWeight: 700, color: page === totalPages ? '#CBD5E1' : '#0F172A', cursor: page === totalPages ? 'not-allowed' : 'pointer' }}>Next →</button>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {isAddUserModalOpen && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '24px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '640px', position: 'relative', borderRadius: '24px', padding: '32px', boxShadow: '0 25px 50px -12px rgba(124, 58, 237, 0.18), 0 0 0 1px rgba(226, 232, 240, 0.8)', background: '#FFFFFF' }}>
            <button 
              onClick={() => setIsAddUserModalOpen(false)} 
              style={{ position: 'absolute', top: '24px', right: '24px', background: '#F1F5F9', border: 'none', borderRadius: '12px', width: '36px', height: '36px', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', transition: 'all 0.2s ease' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#E2E8F0'; e.currentTarget.style.color = '#0F172A'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.color = '#64748B'; }}
            >
              ✕
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: 'linear-gradient(135deg, #F3E8FF 0%, #E9D5FF 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(124, 58, 237, 0.12)' }}>
                <UserPlusIcon size={26} color="#7C3AED" />
              </div>
              <div>
                <h3 style={{ fontWeight: 800, fontSize: '20px', color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>Add New User</h3>
                <p style={{ fontSize: '13px', color: '#64748B', margin: '3px 0 0', fontWeight: 500 }}>Configure user credentials, instance allocations, and access permissions.</p>
              </div>
            </div>

            {error && <div style={{ background: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: '12px', padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: '#DC2626', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>⚠ {error}</div>}
            {success && <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '12px', padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: '#16A34A', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>✓ {success}</div>}

            <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* 2-Column Grid for Form Fields */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                <div>
                  <label style={S.label}>Username</label>
                  <input type="text" placeholder="e.g. john_doe" value={newUsername} onChange={e => setNewUsername(e.target.value)} className="rounded-input" style={{ height: '44px', borderRadius: '10px' }} />
                </div>
                <div>
                  <label style={S.label}>Password</label>
                  <input type="password" placeholder="••••••••" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="rounded-input" style={{ height: '44px', borderRadius: '10px' }} />
                </div>
                <div>
                  <label style={S.label}>Max Instances</label>
                  <input type="number" min="1" value={newMaxInstances} onChange={e => setNewMaxInstances(e.target.value)} className="rounded-input" style={{ height: '44px', borderRadius: '10px' }} />
                </div>
                <div>
                  <label style={S.label}>Monthly Message Limit</label>
                  <input type="number" min="1" value={newMessageLimit} onChange={e => setNewMessageLimit(e.target.value)} className="rounded-input" style={{ height: '44px', borderRadius: '10px' }} />
                </div>
              </div>

              <div>
                <label style={S.label}>Expiry Date <span style={{ color: '#94A3B8', fontWeight: 500 }}>(optional)</span></label>
                <input type="date" value={newExpiresAt} onChange={e => setNewExpiresAt(e.target.value)} className="rounded-input" style={{ height: '44px', borderRadius: '10px' }} />
              </div>

              {/* Menu Permissions as Styled Interactive Chips */}
              <div>
                <label style={S.label}>Menu Permissions</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginTop: '6px' }}>
                  {[
                    { id: 'instances', name: 'Instances' },
                    { id: 'broadcast', name: 'Broadcast' },
                    { id: 'reports', name: 'Reports' },
                    { id: 'docs', name: 'API Docs' },
                  ].map(perm => {
                    const isChecked = newPermissions.includes(perm.id);
                    return (
                      <div
                        key={perm.id}
                        onClick={() => {
                          if (isChecked) setNewPermissions(newPermissions.filter(p => p !== perm.id));
                          else setNewPermissions([...newPermissions, perm.id]);
                        }}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '12px',
                          border: isChecked ? '1.5px solid #7C3AED' : '1.5px solid #E2E8F0',
                          background: isChecked ? '#F3E8FF' : '#F8FAFC',
                          color: isChecked ? '#7C3AED' : '#64748B',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          transition: 'all 0.2s ease',
                          userSelect: 'none',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // Handled by parent div
                          style={{ accentColor: '#7C3AED', width: '15px', height: '15px', cursor: 'pointer' }}
                        />
                        <span>{perm.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px', paddingTop: '16px', borderTop: '1px solid #F1F5F9' }}>
                <button type="button" onClick={() => setIsAddUserModalOpen(false)} className="btn-outline" style={{ flex: 1, height: '46px', borderRadius: '12px', fontWeight: 700 }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ flex: 2, height: '46px', borderRadius: '12px', fontWeight: 700, background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)', boxShadow: '0 6px 16px rgba(124, 58, 237, 0.25)' }}>
                  Create User Account
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Edit User Modal */}
      {editingUser && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '24px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '640px', position: 'relative', borderRadius: '24px', padding: '32px', boxShadow: '0 25px 50px -12px rgba(124, 58, 237, 0.18), 0 0 0 1px rgba(226, 232, 240, 0.8)', background: '#FFFFFF' }}>
            <button 
              onClick={() => setEditingUser(null)} 
              style={{ position: 'absolute', top: '24px', right: '24px', background: '#F1F5F9', border: 'none', borderRadius: '12px', width: '36px', height: '36px', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', transition: 'all 0.2s ease' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#E2E8F0'; e.currentTarget.style.color = '#0F172A'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.color = '#64748B'; }}
            >
              ✕
            </button>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: 'linear-gradient(135deg, #F3E8FF 0%, #E9D5FF 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(124, 58, 237, 0.12)' }}>
                <EditIcon size={24} color="#7C3AED" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h3 style={{ fontWeight: 800, fontSize: '20px', color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>Edit User</h3>
                  <span style={{ background: '#F3E8FF', color: '#7C3AED', padding: '3px 10px', borderRadius: '9999px', fontSize: '12px', fontWeight: 800 }}>
                    {editingUser.username}
                  </span>
                </div>
                <p style={{ fontSize: '13px', color: '#64748B', margin: 0, fontWeight: 500 }}>Update security settings, resource quotas, and permissions.</p>
              </div>
            </div>

            <form onSubmit={handleUpdateUser} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* 2-Column Grid Layout */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                <div>
                  <label style={S.label}>New Password <span style={{ color: '#94A3B8', fontWeight: 500 }}>(leave blank to keep)</span></label>
                  <input type="password" value={editPassword} onChange={e => setEditPassword(e.target.value)} placeholder="••••••••" className="rounded-input" style={{ height: '44px', borderRadius: '10px' }} />
                </div>
                <div>
                  <label style={S.label}>Expiry Date</label>
                  <input type="date" value={editingUser.expiresAt ? new Date(editingUser.expiresAt).toISOString().split('T')[0] : ''} onChange={e => setEditingUser({ ...editingUser, expiresAt: e.target.value })} className="rounded-input" style={{ height: '44px', borderRadius: '10px' }} />
                </div>
                <div>
                  <label style={S.label}>Max Instances</label>
                  <input type="number" min="1" value={editingUser.maxInstances} onChange={e => setEditingUser({ ...editingUser, maxInstances: e.target.value })} className="rounded-input" style={{ height: '44px', borderRadius: '10px' }} />
                </div>
                <div>
                  <label style={S.label}>Monthly Message Limit</label>
                  <input type="number" min="1" value={editingUser.messageLimit} onChange={e => setEditingUser({ ...editingUser, messageLimit: e.target.value })} className="rounded-input" style={{ height: '44px', borderRadius: '10px' }} />
                </div>
              </div>

              {/* Menu Permissions as Styled Interactive Chips */}
              <div>
                <label style={S.label}>Menu Permissions</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginTop: '6px' }}>
                  {[
                    { id: 'instances', name: 'Instances' },
                    { id: 'broadcast', name: 'Broadcast' },
                    { id: 'reports', name: 'Reports' },
                    { id: 'docs', name: 'API Docs' },
                  ].map(perm => {
                    const perms = (editingUser.permissions || '').split(',');
                    const isChecked = perms.includes(perm.id);
                    return (
                      <div
                        key={perm.id}
                        onClick={() => {
                          const newPerms = isChecked ? perms.filter((p: string) => p !== perm.id && p !== '') : [...perms, perm.id];
                          setEditingUser({ ...editingUser, permissions: newPerms.join(',') });
                        }}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '12px',
                          border: isChecked ? '1.5px solid #7C3AED' : '1.5px solid #E2E8F0',
                          background: isChecked ? '#F3E8FF' : '#F8FAFC',
                          color: isChecked ? '#7C3AED' : '#64748B',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          transition: 'all 0.2s ease',
                          userSelect: 'none',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // Handled by parent div
                          style={{ accentColor: '#7C3AED', width: '15px', height: '15px', cursor: 'pointer' }}
                        />
                        <span>{perm.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Admin Privileges Card */}
              <label 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '14px', 
                  padding: '16px 20px', 
                  background: editingUser.isAdmin ? 'linear-gradient(135deg, #FAF5FF 0%, #F3E8FF 100%)' : '#F8FAFC', 
                  borderRadius: '16px', 
                  border: editingUser.isAdmin ? '1.5px solid #DDD6FE' : '1.5px solid #E2E8F0', 
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <input 
                  type="checkbox" 
                  checked={editingUser.isAdmin} 
                  onChange={e => setEditingUser({ ...editingUser, isAdmin: e.target.checked })} 
                  style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#7C3AED', flexShrink: 0 }} 
                />
                <div>
                  <p style={{ fontWeight: 800, fontSize: '14px', color: '#0F172A', margin: 0 }}>Grant Admin Privileges</p>
                  <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0', fontWeight: 500 }}>Allows user to manage all user accounts, system quotas, and global settings</p>
                </div>
              </label>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px', paddingTop: '16px', borderTop: '1px solid #F1F5F9' }}>
                <button type="button" onClick={() => setEditingUser(null)} className="btn-outline" style={{ flex: 1, height: '46px', borderRadius: '12px', fontWeight: 700 }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ flex: 2, height: '46px', borderRadius: '12px', fontWeight: 700, background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)', boxShadow: '0 6px 16px rgba(124, 58, 237, 0.25)' }}>
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
