import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  UserIcon,
  WarningIcon,
  SearchIcon,
  EditIcon,
  CheckCircleIcon,
  XIcon,
  LogInIcon,
  KeyIcon,
  ToggleIcon
} from '../components/Icons';
import {
  GlassUsersIcon,
  GlassResellerIcon,
  GlassCheckCircleIcon,
  GlassSearchIcon,
  GlassAstronautIcon,
  GlassEditIcon,
  GlassTurboIcon,
  GlassAdminIcon,
  GlassLiveStatusIcon,
  GlassUserIcon,
  GlassUserPlusIcon,
  GlassPlusIcon,
  GlassCancelIcon,
  GlassLockIcon,
  GlassCalendarIcon,
  GlassSendIcon,
  GlassInstanceIcon
} from '../components/GlassIcons';

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
  const [newCheckWhatsAppNumber, setNewCheckWhatsAppNumber] = useState(true);
  const [newPermissions, setNewPermissions] = useState<string[]>(['instances', 'broadcast', 'filter', 'groups', 'reports', 'docs']);
  
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editPassword, setEditPassword] = useState('');
  const [deletingUser, setDeletingUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => { fetchUsers(); }, [page, search]);

  const handleDeleteUser = async (id: string) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to delete user');
      } else {
        setDeletingUser(null);
        fetchUsers();
      }
    } catch (e: any) {
      alert('Error deleting user: ' + e.message);
    }
  };

  const fetchUsers = async () => {
    const isReseller = localStorage.getItem('isReseller') === 'true' || localStorage.getItem('role') === 'reseller';
    if (isReseller && !localStorage.getItem('isAdmin')) {
      navigate('/reseller');
      return;
    }
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/users?page=${page}&limit=10&search=${search}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    if (res.status === 401 || res.status === 403) { 
      navigate(isReseller ? '/reseller' : '/'); 
      return; 
    }
    const data = await res.json();
    if (data.users) {
      const sortedUsers = [...data.users].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setUsers(sortedUsers);
      setTotalPages(data.totalPages);
    }
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
        checkWhatsAppNumber: newCheckWhatsAppNumber,
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
      setNewCheckWhatsAppNumber(true);
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
        checkWhatsAppNumber: editingUser.checkWhatsAppNumber !== false,
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
        returnUrl: '/user-management',
        returnRoleTitle: 'User Management'
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
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>User Management</h2>
          <p style={{ color: '#64748B', fontSize: '14px', margin: 0, fontWeight: 500 }}>Manage client user accounts, quotas, subscriptions, and role access.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={() => navigate('/live-status')} 
            className="btn-outline" 
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: 700 }}
          >
            <GlassLiveStatusIcon size={18} /> View Live Status
          </button>
          <button 
            onClick={() => { setIsAddUserModalOpen(true); setError(''); setSuccess(''); }} 
            className="btn-primary" 
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '12px', fontSize: '13px', fontWeight: 800 }}
          >
            <GlassPlusIcon size={16} /> Add User
          </button>
        </div>
      </div>

      {/* Stat strip (Shopeers Style) */}
      <div className="stats-grid">
        {[
          { label: 'Total Users', val: totalUsers, sub: 'Registered accounts', badge: 'Total', bg: '#EFF6FF', icon: GlassUserIcon },
          { label: 'Admins', val: adminCount, sub: 'System Managers', badge: 'Admin', bg: '#F3E8FF', icon: GlassAdminIcon },
          { label: 'Resellers', val: resellerCount, sub: 'Master Accounts', badge: 'Reseller', bg: '#FEF3C7', icon: GlassResellerIcon },
          { label: 'Active Users', val: activeCount, sub: 'Valid Subscriptions', badge: 'Active', bg: '#D1FAE5', icon: GlassCheckCircleIcon },
        ].map(({ label, val, sub, badge, bg, icon: IconComp }) => (
          <div key={label} className="card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRadius: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748B' }}>{label}</span>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IconComp size={24} />
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
            <GlassSearchIcon size={18} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
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
                <th style={{ padding: '14px 16px', fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em', textTransform: 'uppercase' }}>USER BELONGING</th>
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
                return (
                  <tr key={user.id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s ease' }}>
                    <td style={{ padding: '16px 28px' }}>
                      <div>
                        <p style={{ fontWeight: 800, fontSize: '14px', color: '#0F172A', margin: 0, lineHeight: 1.2 }}>{user.username}</p>
                        {user.checkWhatsAppNumber === false && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                            <span title="Turbo Mode Active: Sends directly without pre-checking WhatsApp numbers" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A', padding: '2px 7px', borderRadius: '6px', fontSize: '10px', fontWeight: 800 }}>
                              <GlassTurboIcon size={12} /> Turbo Direct Send
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '16px 16px' }}>
                      {user.isAdmin ? (
                        <span style={{ background: '#F3E8FF', color: '#7C3AED', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 800, display: 'inline-flex', alignItems: 'center' }}>
                          Admin
                        </span>
                      ) : isReseller ? (
                        <span style={{ background: '#FEF3C7', color: '#B45309', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 800, display: 'inline-flex', alignItems: 'center' }}>
                          Reseller ({user._count?.clients || 0} clients)
                        </span>
                      ) : (
                        <span style={{ background: '#EFF6FF', color: '#2563EB', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, display: 'inline-flex', alignItems: 'center' }}>
                          Client
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '16px 16px' }}>
                      {user.reseller?.username ? (
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                          {user.reseller.username}
                        </span>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 600 }}>
                          Direct
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
                        <div style={{ display: 'inline-flex', alignItems: 'center', background: isExpired ? '#FEE2E2' : '#EFF6FF', padding: '4px 10px', borderRadius: '8px' }}>
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
                            title={`Pre-Login as ${user.username}`}
                            style={{
                              background: '#FEF3C7',
                              border: '1px solid #FDE68A',
                              borderRadius: '10px',
                              padding: '6px 12px',
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
                            <GlassAstronautIcon size={16} />
                            <span>Impersonate</span>
                          </button>
                        )}
                        <button onClick={() => { setEditingUser({ ...user }); setEditPassword(''); }} style={{
                          background: '#EFF6FF', border: '1px solid #DBEAFE', borderRadius: '10px',
                          padding: '6px 12px', fontSize: '13px', fontWeight: 700, color: '#2563EB',
                          cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s ease'
                        }} title={`Edit ${user.username}`}>
                          <GlassEditIcon size={16} />
                          <span>Edit</span>
                        </button>
                        {!user.isAdmin && (
                          <button
                            onClick={() => setDeletingUser(user)}
                            title={`Delete ${user.username}`}
                            style={{
                              background: '#FEF2F2',
                              border: '1px solid #FEE2E2',
                              borderRadius: '10px',
                              padding: '6px 12px',
                              fontSize: '13px',
                              fontWeight: 700,
                              color: '#DC2626',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <GlassCancelIcon size={16} />
                            <span>Delete</span>
                          </button>
                        )}
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
          <div className="card hide-scrollbar" style={{ width: '100%', maxWidth: '640px', position: 'relative', borderRadius: '24px', padding: '32px', boxShadow: '0 25px 50px -12px rgba(124, 58, 237, 0.18), 0 0 0 1px rgba(226, 232, 240, 0.8)', background: '#FFFFFF', maxHeight: '90vh', overflowY: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <button 
              onClick={() => setIsAddUserModalOpen(false)} 
              title="Close modal"
              style={{
                position: 'absolute',
                top: '24px',
                right: '24px',
                background: '#F1F5F9',
                border: 'none',
                borderRadius: '12px',
                width: '36px',
                height: '36px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748B',
                transition: 'all 0.2s ease',
                padding: 0
              }}
            >
              <GlassCancelIcon size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: '#F3E8FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <GlassUserPlusIcon size={28} />
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
                      gap: '8px'
                    }}
                  >
                    <GlassUserIcon size={16} /> Standard Client
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
                      gap: '8px'
                    }}
                  >
                    <GlassResellerIcon size={16} /> Reseller Master Account
                  </button>
                </div>
              </div>

              {/* Form Grid */}
              <div className="admin-form-grid">
                <div>
                  <label style={S.label}>Username</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <span style={{ position: 'absolute', left: '12px', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                      <GlassUserIcon size={16} />
                    </span>
                    <input 
                      type="text" 
                      placeholder="e.g. john_doe" 
                      value={newUsername} 
                      onChange={e => setNewUsername(e.target.value)} 
                      style={{
                        width: '100%',
                        height: '44px',
                        borderRadius: '12px',
                        fontSize: '13.5px',
                        fontWeight: 600,
                        background: '#FFFFFF',
                        border: '1.5px solid #E2E8F0',
                        padding: '0 12px 0 38px',
                        color: '#0F172A',
                        outline: 'none',
                        transition: 'all 0.2s ease'
                      }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.12)'; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; }}
                      required 
                    />
                  </div>
                </div>
                <div>
                  <label style={S.label}>Password</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <span style={{ position: 'absolute', left: '12px', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                      <GlassLockIcon size={16} />
                    </span>
                    <input 
                      type="password" 
                      placeholder="••••••••" 
                      value={newPassword} 
                      onChange={e => setNewPassword(e.target.value)} 
                      style={{
                        width: '100%',
                        height: '44px',
                        borderRadius: '12px',
                        fontSize: '13.5px',
                        fontWeight: 600,
                        background: '#FFFFFF',
                        border: '1.5px solid #E2E8F0',
                        padding: '0 12px 0 38px',
                        color: '#0F172A',
                        outline: 'none',
                        transition: 'all 0.2s ease'
                      }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.12)'; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; }}
                      required 
                    />
                  </div>
                </div>
                <div>
                  <label style={S.label}>{newIsReseller ? 'Master Instances Quota Pool' : 'Max Instances'}</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <span style={{ position: 'absolute', left: '12px', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                      <GlassInstanceIcon size={16} />
                    </span>
                    <input 
                      type="number" 
                      min="1" 
                      value={newMaxInstances} 
                      onChange={e => setNewMaxInstances(e.target.value)} 
                      style={{
                        width: '100%',
                        height: '44px',
                        borderRadius: '12px',
                        fontSize: '13.5px',
                        fontWeight: 600,
                        background: '#FFFFFF',
                        border: '1.5px solid #E2E8F0',
                        padding: '0 12px 0 38px',
                        color: '#0F172A',
                        outline: 'none',
                        transition: 'all 0.2s ease'
                      }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.12)'; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; }}
                      required 
                    />
                  </div>
                </div>
                <div>
                  <label style={S.label}>{newIsReseller ? 'Master Message Quota Pool' : 'Monthly Message Limit'}</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <span style={{ position: 'absolute', left: '12px', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                      <GlassSendIcon size={16} />
                    </span>
                    <input 
                      type="number" 
                      min="1" 
                      value={newMessageLimit} 
                      onChange={e => setNewMessageLimit(e.target.value)} 
                      style={{
                        width: '100%',
                        height: '44px',
                        borderRadius: '12px',
                        fontSize: '13.5px',
                        fontWeight: 600,
                        background: '#FFFFFF',
                        border: '1.5px solid #E2E8F0',
                        padding: '0 12px 0 38px',
                        color: '#0F172A',
                        outline: 'none',
                        transition: 'all 0.2s ease'
                      }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.12)'; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; }}
                      required 
                    />
                  </div>
                </div>
              </div>

              <div>
                <label style={S.label}>Subscription Expiry Date (Optional)</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{ position: 'absolute', left: '12px', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                    <GlassCalendarIcon size={16} />
                  </span>
                  <input 
                    type="date" 
                    value={newExpiresAt} 
                    onChange={e => setNewExpiresAt(e.target.value)} 
                    onClick={(e) => e.currentTarget.showPicker?.()}
                    style={{
                      width: '100%',
                      height: '44px',
                      borderRadius: '12px',
                      fontSize: '13.5px',
                      fontWeight: 600,
                      background: '#FFFFFF',
                      border: '1.5px solid #E2E8F0',
                      padding: '0 12px 0 38px',
                      color: '#0F172A',
                      outline: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.12)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>
              </div>

              {/* WhatsApp Number Verification Mode Toggle */}
              <div 
                onClick={() => setNewCheckWhatsAppNumber(!newCheckWhatsAppNumber)}
                style={{ 
                  background: '#F8FAFC', 
                  padding: '16px', 
                  borderRadius: '16px', 
                  border: newCheckWhatsAppNumber ? '1px solid #E2E8F0' : '1px solid #FDE68A', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  gap: '16px',
                  cursor: 'pointer',
                  userSelect: 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>⚡ WhatsApp Number Verification Mode</span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#64748B', margin: '3px 0 0', fontWeight: 500 }}>
                    {newCheckWhatsAppNumber 
                      ? 'Default ON: Checks if numbers are registered on WhatsApp before dispatch.' 
                      : 'OFF (Turbo Mode): Sends directly without checking WhatsApp existence for 2x faster delivery speed.'}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: newCheckWhatsAppNumber ? '#15803D' : '#B45309' }}>
                    {newCheckWhatsAppNumber ? 'Verification ON' : '⚡ Turbo Mode'}
                  </span>
                  <ToggleIcon
                    size={38}
                    checked={newCheckWhatsAppNumber}
                    onColor="#16A34A"
                    offColor="#F59E0B"
                  />
                </div>
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
                        {isChecked ? (
                          <GlassCheckCircleIcon size={18} />
                        ) : (
                          <div style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            border: '2px solid #CBD5E1',
                            flexShrink: 0
                          }} />
                        )}
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
          <div className="card hide-scrollbar" style={{ width: '100%', maxWidth: '640px', position: 'relative', borderRadius: '24px', padding: '32px', boxShadow: '0 25px 50px -12px rgba(124, 58, 237, 0.18), 0 0 0 1px rgba(226, 232, 240, 0.8)', background: '#FFFFFF', maxHeight: '90vh', overflowY: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <button 
              onClick={() => setEditingUser(null)} 
              title="Close modal"
              style={{
                position: 'absolute',
                top: '24px',
                right: '24px',
                background: '#F1F5F9',
                border: 'none',
                borderRadius: '12px',
                width: '36px',
                height: '36px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748B',
                transition: 'all 0.2s ease',
                padding: 0
              }}
            >
              <GlassCancelIcon size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <GlassEditIcon size={28} />
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
                      gap: '8px'
                    }}
                  >
                    <GlassUserIcon size={16} /> Standard Client
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
                      gap: '8px'
                    }}
                  >
                    <GlassResellerIcon size={16} /> Reseller Master
                  </button>
                </div>
              </div>

              {/* Form Grid */}
              <div className="admin-form-grid">
                <div>
                  <label style={S.label}>Username</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <span style={{ position: 'absolute', left: '12px', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                      <GlassUserIcon size={16} />
                    </span>
                    <input 
                      type="text" 
                      value={editingUser.username} 
                      onChange={e => setEditingUser({ ...editingUser, username: e.target.value })} 
                      style={{
                        width: '100%',
                        height: '44px',
                        borderRadius: '12px',
                        fontSize: '13.5px',
                        fontWeight: 600,
                        background: '#FFFFFF',
                        border: '1.5px solid #E2E8F0',
                        padding: '0 12px 0 38px',
                        color: '#0F172A',
                        outline: 'none',
                        transition: 'all 0.2s ease'
                      }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.12)'; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; }}
                      required 
                    />
                  </div>
                </div>
                <div>
                  <label style={S.label}>New Password (leave blank to keep current)</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <span style={{ position: 'absolute', left: '12px', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                      <GlassLockIcon size={16} />
                    </span>
                    <input 
                      type="password" 
                      placeholder="••••••••" 
                      value={editPassword} 
                      onChange={e => setEditPassword(e.target.value)} 
                      style={{
                        width: '100%',
                        height: '44px',
                        borderRadius: '12px',
                        fontSize: '13.5px',
                        fontWeight: 600,
                        background: '#FFFFFF',
                        border: '1.5px solid #E2E8F0',
                        padding: '0 12px 0 38px',
                        color: '#0F172A',
                        outline: 'none',
                        transition: 'all 0.2s ease'
                      }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.12)'; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; }}
                    />
                  </div>
                </div>
                <div>
                  <label style={S.label}>{editingUser.isReseller ? 'Master Instances Quota Pool' : 'Max Instances'}</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <span style={{ position: 'absolute', left: '12px', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                      <GlassInstanceIcon size={16} />
                    </span>
                    <input 
                      type="number" 
                      min="1" 
                      value={editingUser.maxInstances} 
                      onChange={e => setEditingUser({ ...editingUser, maxInstances: e.target.value })} 
                      style={{
                        width: '100%',
                        height: '44px',
                        borderRadius: '12px',
                        fontSize: '13.5px',
                        fontWeight: 600,
                        background: '#FFFFFF',
                        border: '1.5px solid #E2E8F0',
                        padding: '0 12px 0 38px',
                        color: '#0F172A',
                        outline: 'none',
                        transition: 'all 0.2s ease'
                      }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.12)'; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; }}
                      required 
                    />
                  </div>
                </div>
                <div>
                  <label style={S.label}>{editingUser.isReseller ? 'Master Message Quota Pool' : 'Monthly Message Limit'}</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <span style={{ position: 'absolute', left: '12px', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                      <GlassSendIcon size={16} />
                    </span>
                    <input 
                      type="number" 
                      min="1" 
                      value={editingUser.messageLimit} 
                      onChange={e => setEditingUser({ ...editingUser, messageLimit: e.target.value })} 
                      style={{
                        width: '100%',
                        height: '44px',
                        borderRadius: '12px',
                        fontSize: '13.5px',
                        fontWeight: 600,
                        background: '#FFFFFF',
                        border: '1.5px solid #E2E8F0',
                        padding: '0 12px 0 38px',
                        color: '#0F172A',
                        outline: 'none',
                        transition: 'all 0.2s ease'
                      }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.12)'; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; }}
                      required 
                    />
                  </div>
                </div>
              </div>

              <div>
                <label style={S.label}>Subscription Expiry Date</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{ position: 'absolute', left: '12px', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                    <GlassCalendarIcon size={16} />
                  </span>
                  <input 
                    type="date" 
                    value={editingUser.expiresAt ? new Date(editingUser.expiresAt).toISOString().split('T')[0] : ''} 
                    onChange={e => setEditingUser({ ...editingUser, expiresAt: e.target.value ? new Date(e.target.value).toISOString() : null })} 
                    onClick={(e) => e.currentTarget.showPicker?.()}
                    style={{
                      width: '100%',
                      height: '44px',
                      borderRadius: '12px',
                      fontSize: '13.5px',
                      fontWeight: 600,
                      background: '#FFFFFF',
                      border: '1.5px solid #E2E8F0',
                      padding: '0 12px 0 38px',
                      color: '#0F172A',
                      outline: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.12)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>
              </div>

              {/* WhatsApp Number Verification Mode Toggle */}
              <div 
                onClick={() => setEditingUser({ ...editingUser, checkWhatsAppNumber: editingUser.checkWhatsAppNumber === false })}
                style={{ 
                  background: '#F8FAFC', 
                  padding: '16px', 
                  borderRadius: '16px', 
                  border: editingUser.checkWhatsAppNumber !== false ? '1px solid #E2E8F0' : '1px solid #FDE68A', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  gap: '16px',
                  cursor: 'pointer',
                  userSelect: 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>⚡ WhatsApp Number Verification Mode</span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#64748B', margin: '3px 0 0', fontWeight: 500 }}>
                    {editingUser.checkWhatsAppNumber !== false 
                      ? 'Default ON: Checks if numbers are registered on WhatsApp before dispatch.' 
                      : 'OFF (Turbo Mode): Sends directly without checking WhatsApp existence for 2x faster delivery speed.'}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: editingUser.checkWhatsAppNumber !== false ? '#15803D' : '#B45309' }}>
                    {editingUser.checkWhatsAppNumber !== false ? 'Verification ON' : '⚡ Turbo Mode'}
                  </span>
                  <ToggleIcon
                    size={38}
                    checked={editingUser.checkWhatsAppNumber !== false}
                    onColor="#16A34A"
                    offColor="#F59E0B"
                  />
                </div>
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
                    const currentPerms = (editingUser.permissions || 'instances,broadcast,filter,groups,reports,docs')
                      .split(',')
                      .map((p: string) => p.trim())
                      .filter(Boolean);
                    const isChecked = currentPerms.includes(perm.id);
                    return (
                      <div
                        key={perm.id}
                        onClick={() => {
                          const updated = isChecked
                            ? currentPerms.filter((p: string) => p !== perm.id)
                            : [...currentPerms, perm.id];
                          setEditingUser({ ...editingUser, permissions: updated.join(',') });
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
                        {isChecked ? (
                          <GlassCheckCircleIcon size={18} />
                        ) : (
                          <div style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            border: '2px solid #CBD5E1',
                            flexShrink: 0
                          }} />
                        )}
                        <span style={{ fontSize: '13px', fontWeight: isChecked ? 700 : 500, color: isChecked ? '#7C3AED' : '#475569' }}>
                          {perm.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
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

      {/* Delete User Confirmation Modal */}
      {deletingUser && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '24px' }}>
          <div className="card animate-in" style={{ width: '100%', maxWidth: '440px', borderRadius: '24px', padding: '28px', background: '#FFFFFF', boxShadow: '0 25px 50px -12px rgba(220, 38, 38, 0.25)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
              <GlassWarningIcon size={24} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: '0 0 8px' }}>
              Delete User Account?
            </h3>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 20px', lineHeight: 1.5 }}>
              Are you sure you want to permanently delete <strong style={{ color: '#0F172A' }}>@{deletingUser.username}</strong>? All connected instances, message logs, and account configurations will be permanently removed.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setDeletingUser(null)}
                className="btn-outline"
                style={{ flex: 1, height: '44px', borderRadius: '12px', fontWeight: 700 }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteUser(deletingUser.id)}
                style={{
                  flex: 1,
                  height: '44px',
                  borderRadius: '12px',
                  fontWeight: 800,
                  background: '#DC2626',
                  color: '#FFFFFF',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Delete User
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};
