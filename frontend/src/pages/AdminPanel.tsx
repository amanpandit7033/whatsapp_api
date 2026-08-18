import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  UserIcon,
  ShieldIcon,
  WarningIcon,
  UserPlusIcon,
  SearchIcon,
  EditIcon,
  CheckCircleIcon,
  CalendarIcon,
  XIcon,
  LogInIcon,
  KeyIcon
} from '../components/Icons';

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
  const [newIsReseller, setNewIsReseller] = useState(false);
  const [newPermissions, setNewPermissions] = useState<string[]>(['instances', 'broadcast', 'filter', 'groups', 'reports', 'docs']);
  
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
      body: JSON.stringify({
        username: newUsername.trim(),
        password: newPassword.trim(),
        maxInstances: parseInt(newMaxInstances),
        messageLimit: parseInt(newMessageLimit),
        expiresAt: newExpiresAt || undefined,
        isReseller: newIsReseller,
        role: newIsReseller ? 'reseller' : 'user',
        permissions: newPermissions.join(',')
      })
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'Failed'); }
    else {
      setSuccess(`User "${data.user.username}" created successfully!`);
      setNewUsername('');
      setNewPassword('');
      setNewMaxInstances('1');
      setNewMessageLimit('1000');
      setNewExpiresAt('');
      setNewIsReseller(false);
      setNewPermissions(['instances', 'broadcast', 'filter', 'groups', 'reports', 'docs']);
      setIsAddUserModalOpen(false);
      fetchUsers();
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault(); if (!editingUser) return;
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/users/${editingUser.id}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: editingUser.username,
        password: editPassword || undefined,
        maxInstances: parseInt(editingUser.maxInstances),
        messageLimit: parseInt(editingUser.messageLimit),
        expiresAt: editingUser.expiresAt || null,
        isAdmin: editingUser.isAdmin,
        isReseller: editingUser.isReseller,
        role: editingUser.isReseller ? 'reseller' : (editingUser.isAdmin ? 'admin' : 'user'),
        permissions: editingUser.permissions
      })
    });
    if (res.ok) { setEditingUser(null); setEditPassword(''); fetchUsers(); }
    else { const d = await res.json(); alert(d.error || 'Failed'); }
  };

  const handlePreLogin = async (targetUser: any) => {
    if (!window.confirm(`Are you sure you want to Pre-Login into @${targetUser.username}'s account?`)) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/impersonate/${targetUser.id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to pre-login');
        return;
      }

      // Save original admin session for quick return
      const originalSession = {
        token: localStorage.getItem('token'),
        isAdmin: localStorage.getItem('isAdmin'),
        isReseller: localStorage.getItem('isReseller'),
        role: localStorage.getItem('role'),
        username: localStorage.getItem('username'),
        permissions: localStorage.getItem('permissions'),
        returnUrl: '/admin',
        returnRoleTitle: 'Admin Panel'
      };
      localStorage.setItem('originalSession', JSON.stringify(originalSession));
      localStorage.setItem('isImpersonating', 'true');
      localStorage.setItem('impersonatedUsername', data.username);

      // Set target user's session
      localStorage.setItem('token', data.token);
      localStorage.setItem('isAdmin', String(data.isAdmin));
      localStorage.setItem('isReseller', String(data.isReseller));
      localStorage.setItem('role', data.role);
      localStorage.setItem('username', data.username);
      localStorage.setItem('permissions', data.permissions || '');

      // Reload into target user dashboard
      window.location.href = '/';
    } catch (e: any) {
      alert('Error during pre-login: ' + e.message);
    }
  };

  const totalUsers = users.length;
  const adminCount = users.filter(u => u.isAdmin).length;
  const resellerCount = users.filter(u => u.isReseller || u.role === 'reseller').length;
  const expiredCount = users.filter(u => u.expiresAt && new Date(u.expiresAt) < new Date()).length;
  const activeCount = users.filter(u => !u.isAdmin && (!u.expiresAt || new Date(u.expiresAt) >= new Date())).length;

  return (
    <div className="animate-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>Admin Control Panel</h2>
          <p style={{ color: '#64748B', fontSize: '14px', margin: 0, fontWeight: 500 }}>Manage users, reseller accounts, permissions, and system quotas.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={() => navigate('/live-status')} 
            className="btn-outline" 
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: 700 }}
          >
            ⚡ View Live Status
          </button>
          <button 
            onClick={() => { setIsAddUserModalOpen(true); setError(''); setSuccess(''); }} 
            className="btn-primary" 
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '12px', fontSize: '13px', fontWeight: 800 }}
          >
            <UserPlusIcon size={16} /> Add User
          </button>
        </div>
      </div>

      {/* Stat strip (Shopeers Style) */}
      <div className="stats-grid">
        {[
          { label: 'Total Users', val: totalUsers, sub: 'Registered accounts', badge: 'Total', bg: '#EFF6FF', color: '#2563EB', icon: UserIcon },
          { label: 'Admins', val: adminCount, sub: 'System Managers', badge: 'Admin', bg: '#F3E8FF', color: '#7C3AED', icon: ShieldIcon },
          { label: 'Resellers', val: resellerCount, sub: 'Master Accounts', badge: 'Reseller', bg: '#FEF3C7', color: '#D97706', icon: UserPlusIcon },
          { label: 'Active Users', val: activeCount, sub: 'Valid Subscriptions', badge: 'Active', bg: '#D1FAE5', color: '#059669', icon: CheckCircleIcon },
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
                <span className={`badge ${badge === 'Expired' ? 'badge-danger' : 'badge-success'}`}>{badge}</span>
              </div>
              <span style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px', display: 'block' }}>{sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Table Card */}
      <div className="card" style={{ padding: '24px 0', marginTop: '24px' }}>
        
        {/* Table Header & Search */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px 20px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px', letterSpacing: '-0.01em' }}>All Accounts & Resellers</h3>
            <p style={{ color: '#64748B', fontSize: '13px', margin: 0, fontWeight: 500 }}>Active registered clients and instance quotas.</p>
          </div>
          <div style={{ position: 'relative', width: '280px' }}>
            <SearchIcon size={16} color="#94A3B8" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search by username..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="rounded-input"
              style={{ paddingRight: '38px', height: '40px', borderRadius: '10px' }}
            />
          </div>
        </div>

        {/* Users Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0' }}>
                <th style={{ padding: '14px 28px', fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em', textTransform: 'uppercase' }}>USER ACCOUNT</th>
                <th style={{ padding: '14px 16px', fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em', textTransform: 'uppercase' }}>ROLE</th>
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
                const isReseller = user.isReseller || user.role === 'reseller';
                const Icon = user.isAdmin ? ShieldIcon : isReseller ? UserPlusIcon : UserIcon;
                return (
                  <tr key={user.id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s ease' }}>
                    <td style={{ padding: '16px 28px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: user.isAdmin ? '#F3E8FF' : isReseller ? '#FEF3C7' : '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Icon size={18} color={user.isAdmin ? '#7C3AED' : isReseller ? '#D97706' : '#2563EB'} />
                        </div>
                        <div>
                          <p style={{ fontWeight: 800, fontSize: '14px', color: '#0F172A', margin: 0, lineHeight: 1.2 }}>{user.username}</p>
                          {user.reseller && (
                            <span style={{ fontSize: '11px', color: '#64748B', display: 'block', marginTop: '2px' }}>
                              By Reseller: <strong>@{user.reseller.username}</strong>
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px 16px' }}>
                      {user.isAdmin ? (
                        <span style={{ background: '#F3E8FF', color: '#7C3AED', padding: '3px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <ShieldIcon size={12} color="#7C3AED" /> Admin
                        </span>
                      ) : isReseller ? (
                        <span style={{ background: '#FEF3C7', color: '#B45309', padding: '3px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <UserPlusIcon size={12} color="#B45309" /> Reseller ({user._count?.clients || 0} clients)
                        </span>
                      ) : (
                        <span style={{ background: '#EFF6FF', color: '#2563EB', padding: '3px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <UserIcon size={12} color="#2563EB" /> Client
                        </span>
                      )}
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
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: isExpired ? '#FEE2E2' : '#EFF6FF', padding: '4px 10px', borderRadius: '8px' }}>
                          {isExpired ? (
                            <WarningIcon size={14} color="#DC2626" />
                          ) : (
                            <CalendarIcon size={14} color="#2563EB" />
                          )}
                          <span style={{ fontSize: '12px', fontWeight: 800, color: isExpired ? '#DC2626' : '#2563EB' }}>
                            {new Date(user.expiresAt).toLocaleDateString()}
                          </span>
                        </div>
                      ) : <span style={{ fontSize: '12px', color: '#94A3B8', fontStyle: 'italic', fontWeight: 600 }}>Never</span>}
                    </td>
                    <td style={{ padding: '16px 16px', fontSize: '13px', color: '#64748B', fontWeight: 600 }}>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '16px 28px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                        {!user.isAdmin && (
                          <button
                            onClick={() => handlePreLogin(user)}
                            title={`Pre-Login as @${user.username}`}
                            style={{
                              background: '#FEF3C7',
                              border: '1px solid #FDE68A',
                              borderRadius: '10px',
                              padding: '8px 14px',
                              fontSize: '13px',
                              fontWeight: 800,
                              color: '#B45309',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <KeyIcon size={14} color="#B45309" /> Pre-Login
                          </button>
                        )}
                        <button onClick={() => { setEditingUser({ ...user }); setEditPassword(''); }} style={{
                          background: '#EFF6FF', border: 'none', borderRadius: '10px',
                          padding: '8px 14px', fontSize: '13px', fontWeight: 700, color: '#2563EB',
                          cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s ease'
                        }}>
                          <EditIcon size={14} color="#2563EB" /> Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr><td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: '#94A3B8', fontWeight: 500 }}>No users found</td></tr>
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
          <div className="card" style={{ width: '100%', maxWidth: '640px', position: 'relative', borderRadius: '24px', padding: '32px', boxShadow: '0 25px 50px -12px rgba(124, 58, 237, 0.18), 0 0 0 1px rgba(226, 232, 240, 0.8)', background: '#FFFFFF', maxHeight: '90vh', overflowY: 'auto' }}>
            <button 
              onClick={() => setIsAddUserModalOpen(false)} 
              style={{ position: 'absolute', top: '24px', right: '24px', background: '#F1F5F9', border: 'none', borderRadius: '12px', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', transition: 'all 0.2s ease' }}
            >
              <XIcon size={18} color="currentColor" />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: 'linear-gradient(135deg, #F3E8FF 0%, #E9D5FF 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(124, 58, 237, 0.12)' }}>
                <UserPlusIcon size={26} color="#7C3AED" />
              </div>
              <div>
                <h3 style={{ fontWeight: 800, fontSize: '20px', color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>Add New Account</h3>
                <p style={{ fontSize: '13px', color: '#64748B', margin: '3px 0 0', fontWeight: 500 }}>Configure user credentials, instance allocations, and role.</p>
              </div>
            </div>

            {error && <div style={{ background: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: '12px', padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: '#DC2626', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}><WarningIcon size={16} color="#DC2626" /> {error}</div>}
            {success && <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '12px', padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: '#16A34A', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircleIcon size={16} color="#16A34A" /> {success}</div>}

            <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Account Role Selector */}
              <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
                <label style={S.label}>Account Role / Type</label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setNewIsReseller(false)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '10px',
                      border: !newIsReseller ? '2px solid #2563EB' : '1px solid #CBD5E1',
                      background: !newIsReseller ? '#EFF6FF' : '#FFFFFF',
                      color: !newIsReseller ? '#2563EB' : '#64748B',
                      fontWeight: 800,
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <UserIcon size={14} color={!newIsReseller ? '#2563EB' : '#64748B'} /> Standard Client
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewIsReseller(true)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '10px',
                      border: newIsReseller ? '2px solid #D97706' : '1px solid #CBD5E1',
                      background: newIsReseller ? '#FEF3C7' : '#FFFFFF',
                      color: newIsReseller ? '#B45309' : '#64748B',
                      fontWeight: 800,
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <UserPlusIcon size={14} color={newIsReseller ? '#B45309' : '#64748B'} /> Reseller Master Account
                  </button>
                </div>
              </div>

              {/* Form Grid */}
              <div className="admin-form-grid">
                <div>
                  <label style={S.label}>Username</label>
                  <input type="text" placeholder="e.g. john_doe" value={newUsername} onChange={e => setNewUsername(e.target.value)} className="rounded-input" style={{ height: '44px', borderRadius: '10px' }} required />
                </div>
                <div>
                  <label style={S.label}>Password</label>
                  <input type="password" placeholder="••••••••" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="rounded-input" style={{ height: '44px', borderRadius: '10px' }} required />
                </div>
                <div>
                  <label style={S.label}>{newIsReseller ? 'Master Instances Quota Pool' : 'Max Instances'}</label>
                  <input type="number" min="1" value={newMaxInstances} onChange={e => setNewMaxInstances(e.target.value)} className="rounded-input" style={{ height: '44px', borderRadius: '10px' }} required />
                </div>
                <div>
                  <label style={S.label}>{newIsReseller ? 'Master Message Quota Pool' : 'Monthly Message Limit'}</label>
                  <input type="number" min="1" value={newMessageLimit} onChange={e => setNewMessageLimit(e.target.value)} className="rounded-input" style={{ height: '44px', borderRadius: '10px' }} required />
                </div>
              </div>

              <div>
                <label style={S.label}>Subscription Expiry Date (Optional)</label>
                <input type="date" value={newExpiresAt} onChange={e => setNewExpiresAt(e.target.value)} className="rounded-input" style={{ height: '44px', borderRadius: '10px' }} />
              </div>

              <div>
                <label style={S.label}>Menu Permissions</label>
                <div className="admin-perms-grid">
                  {[
                    { id: 'instances', name: 'Instances' },
                    { id: 'broadcast', name: 'Broadcast' },
                    { id: 'filter', name: 'Number Filter' },
                    { id: 'groups', name: 'Groups Hub' },
                    { id: 'reports', name: 'Reports' },
                    { id: 'docs', name: 'API Docs' },
                  ].map(perm => {
                    const isChecked = newPermissions.includes(perm.id);
                    return (
                      <div
                        key={perm.id}
                        onClick={() => {
                          setNewPermissions(prev =>
                            isChecked ? prev.filter(p => p !== perm.id) : [...prev, perm.id]
                          );
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '10px 14px',
                          borderRadius: '10px',
                          border: isChecked ? '1.5px solid #7C3AED' : '1px solid #E2E8F0',
                          background: isChecked ? '#F3E8FF' : '#FFFFFF',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          userSelect: 'none'
                        }}
                      >
                        <div style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '6px',
                          border: isChecked ? 'none' : '2px solid #CBD5E1',
                          background: isChecked ? '#7C3AED' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {isChecked && <CheckCircleIcon size={12} color="#FFFFFF" />}
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: isChecked ? 700 : 500, color: isChecked ? '#7C3AED' : '#475569' }}>
                          {perm.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" onClick={() => setIsAddUserModalOpen(false)} className="btn-outline">Cancel</button>
                <button type="submit" className="btn-primary">Create Account</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Edit User Modal */}
      {editingUser && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '24px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '640px', position: 'relative', borderRadius: '24px', padding: '32px', boxShadow: '0 25px 50px -12px rgba(124, 58, 237, 0.18), 0 0 0 1px rgba(226, 232, 240, 0.8)', background: '#FFFFFF', maxHeight: '90vh', overflowY: 'auto' }}>
            <button 
              onClick={() => setEditingUser(null)} 
              style={{ position: 'absolute', top: '24px', right: '24px', background: '#F1F5F9', border: 'none', borderRadius: '12px', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', transition: 'all 0.2s ease' }}
            >
              <XIcon size={18} color="currentColor" />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(37, 99, 235, 0.12)' }}>
                <EditIcon size={24} color="#2563EB" />
              </div>
              <div>
                <h3 style={{ fontWeight: 800, fontSize: '20px', color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>Edit User Account</h3>
                <p style={{ fontSize: '13px', color: '#64748B', margin: '3px 0 0', fontWeight: 500 }}>Update permissions, max instances, or reset password.</p>
              </div>
            </div>

            <form onSubmit={handleUpdateUser} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Account Role Selector */}
              <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
                <label style={S.label}>Account Role / Type</label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setEditingUser({ ...editingUser, isReseller: false, role: 'user' })}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '10px',
                      border: !editingUser.isReseller && !editingUser.isAdmin ? '2px solid #2563EB' : '1px solid #CBD5E1',
                      background: !editingUser.isReseller && !editingUser.isAdmin ? '#EFF6FF' : '#FFFFFF',
                      color: !editingUser.isReseller && !editingUser.isAdmin ? '#2563EB' : '#64748B',
                      fontWeight: 800,
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <UserIcon size={14} color={!editingUser.isReseller && !editingUser.isAdmin ? '#2563EB' : '#64748B'} /> Standard Client
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingUser({ ...editingUser, isReseller: true, role: 'reseller' })}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '10px',
                      border: editingUser.isReseller ? '2px solid #D97706' : '1px solid #CBD5E1',
                      background: editingUser.isReseller ? '#FEF3C7' : '#FFFFFF',
                      color: editingUser.isReseller ? '#B45309' : '#64748B',
                      fontWeight: 800,
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <UserPlusIcon size={14} color={editingUser.isReseller ? '#B45309' : '#64748B'} /> Reseller Master
                  </button>
                </div>
              </div>

              {/* Form Grid */}
              <div className="admin-form-grid">
                <div>
                  <label style={S.label}>Username</label>
                  <input type="text" value={editingUser.username} onChange={e => setEditingUser({ ...editingUser, username: e.target.value })} className="rounded-input" style={{ height: '44px', borderRadius: '10px' }} required />
                </div>
                <div>
                  <label style={S.label}>New Password (leave blank to keep current)</label>
                  <input type="password" placeholder="••••••••" value={editPassword} onChange={e => setEditPassword(e.target.value)} className="rounded-input" style={{ height: '44px', borderRadius: '10px' }} />
                </div>
                <div>
                  <label style={S.label}>{editingUser.isReseller ? 'Master Instances Quota Pool' : 'Max Instances'}</label>
                  <input type="number" min="1" value={editingUser.maxInstances} onChange={e => setEditingUser({ ...editingUser, maxInstances: e.target.value })} className="rounded-input" style={{ height: '44px', borderRadius: '10px' }} required />
                </div>
                <div>
                  <label style={S.label}>{editingUser.isReseller ? 'Master Message Quota Pool' : 'Monthly Message Limit'}</label>
                  <input type="number" min="1" value={editingUser.messageLimit} onChange={e => setEditingUser({ ...editingUser, messageLimit: e.target.value })} className="rounded-input" style={{ height: '44px', borderRadius: '10px' }} required />
                </div>
              </div>

              <div>
                <label style={S.label}>Subscription Expiry Date</label>
                <input 
                  type="date" 
                  value={editingUser.expiresAt ? new Date(editingUser.expiresAt).toISOString().split('T')[0] : ''} 
                  onChange={e => setEditingUser({ ...editingUser, expiresAt: e.target.value ? new Date(e.target.value).toISOString() : null })} 
                  className="rounded-input" 
                  style={{ height: '44px', borderRadius: '10px' }} 
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" onClick={() => setEditingUser(null)} className="btn-outline">Cancel</button>
                <button type="submit" className="btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};
