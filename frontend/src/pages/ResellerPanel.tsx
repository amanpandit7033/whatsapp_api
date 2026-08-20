import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ToggleIcon } from '../components/Icons';
import {
  GlassUsersIcon,
  GlassInstanceIcon,
  GlassSendIcon,
  GlassSearchIcon,
  GlassRefreshIcon,
  GlassPlusIcon,
  GlassEditIcon,
  GlassCancelIcon,
  GlassAstronautIcon,
  GlassUserIcon,
  GlassLockIcon,
  GlassCalendarIcon,
  GlassCheckCircleIcon,
  GlassWarningIcon,
  GlassActivityIcon,
  GlassTurboIcon,
  GlassBoltIcon,
  GlassLiveStatusIcon,
  GlassTrashIcon
} from '../components/GlassIcons';

interface ResellerStats {
  masterMaxInstances: number;
  masterMessageLimit: number;
  allocatedInstances: number;
  remainingInstances: number;
  actualActiveInstances: number;
  allocatedMessages: number;
  remainingMessages: number;
  totalClients: number;
  activeClients: number;
}

interface ClientUser {
  id: string;
  username: string;
  maxInstances: number;
  messageLimit: number;
  expiresAt: string | null;
  permissions: string;
  checkWhatsAppNumber?: boolean;
  createdAt: string;
  _count: { instances: number };
}

const S: Record<string, React.CSSProperties> = {
  label: { display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748B', marginBottom: '8px' },
};

export const ResellerPanel = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<ResellerStats | null>(null);
  const [clients, setClients] = useState<ClientUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');

  // Add Client Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newMaxInstances, setNewMaxInstances] = useState('1');
  const [newMessageLimit, setNewMessageLimit] = useState('1000');
  const [newExpiresAt, setNewExpiresAt] = useState('');
  const [newCheckWhatsAppNumber, setNewCheckWhatsAppNumber] = useState(true);
  const [newPermissions, setNewPermissions] = useState<string[]>(['instances', 'broadcast', 'filter', 'groups', 'reports', 'docs']);
  
  // Edit Client Modal State
  const [editingClient, setEditingClient] = useState<ClientUser | null>(null);
  const [editPassword, setEditPassword] = useState('');
  const [editCheckWhatsAppNumber, setEditCheckWhatsAppNumber] = useState(true);
  const [editPermissions, setEditPermissions] = useState<string[]>([]);

  // Delete Confirm Modal State
  const [deletingClient, setDeletingClient] = useState<ClientUser | null>(null);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchStats();
    fetchClients();
  }, [page, search]);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/reseller/stats`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.status === 401 || res.status === 403) {
        navigate('/');
        return;
      }
      const data = await res.json();
      setStats(data);
    } catch (e) {
      console.error('Failed to load reseller stats', e);
    }
  };

  const fetchClients = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/reseller/clients?page=${page}&limit=10&search=${encodeURIComponent(search)}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.status === 401 || res.status === 403) {
        navigate('/');
        return;
      }
      const data = await res.json();
      if (data.clients) {
        const sortedClients = [...data.clients].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setClients(sortedClients);
        setTotalPages(data.totalPages || 1);
      }
    } catch (e) {
      console.error('Failed to load clients', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newUsername.trim() || !newPassword.trim()) {
      setError('Username and password are required.');
      return;
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/reseller/clients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          username: newUsername.trim(),
          password: newPassword.trim(),
          maxInstances: parseInt(newMaxInstances) || 1,
          messageLimit: parseInt(newMessageLimit) || 1000,
          expiresAt: newExpiresAt || undefined,
          checkWhatsAppNumber: newCheckWhatsAppNumber,
          permissions: newPermissions.join(',')
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create client.');
      } else {
        setSuccess('Client account created successfully!');
        setIsAddModalOpen(false);
        setNewUsername('');
        setNewPassword('');
        setNewMaxInstances('1');
        setNewMessageLimit('1000');
        setNewExpiresAt('');
        setNewCheckWhatsAppNumber(true);
        fetchStats();
        fetchClients();
      }
    } catch (e: any) {
      setError(e.message || 'Error creating client account.');
    }
  };

  const handleOpenEdit = (client: ClientUser) => {
    setError('');
    setSuccess('');
    setEditingClient({ ...client });
    setEditPassword('');
    setEditCheckWhatsAppNumber(client.checkWhatsAppNumber !== false);
    setEditPermissions(client.permissions ? client.permissions.split(',').map(s => s.trim()) : ['instances', 'broadcast', 'filter', 'groups', 'reports', 'docs']);
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/reseller/clients/${editingClient.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          password: editPassword.trim() || undefined,
          maxInstances: editingClient.maxInstances,
          messageLimit: editingClient.messageLimit,
          expiresAt: editingClient.expiresAt || null,
          checkWhatsAppNumber: editCheckWhatsAppNumber,
          permissions: editPermissions.join(',')
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to update client.');
      } else {
        setSuccess('Client updated successfully!');
        setEditingClient(null);
        setEditPassword('');
        fetchStats();
        fetchClients();
      }
    } catch (e: any) {
      setError(e.message || 'Error updating client account.');
    }
  };

  const handleDeleteClient = async (id: string) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/reseller/clients/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to delete client');
      } else {
        setDeletingClient(null);
        fetchStats();
        fetchClients();
      }
    } catch (e: any) {
      alert('Error deleting client: ' + e.message);
    }
  };

  const handleImpersonate = async (client: ClientUser) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/reseller/impersonate/${client.id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to login as client');
        return;
      }

      // Save original reseller session
      const originalSession = {
        token: localStorage.getItem('token'),
        isAdmin: localStorage.getItem('isAdmin'),
        isReseller: localStorage.getItem('isReseller'),
        role: localStorage.getItem('role'),
        username: localStorage.getItem('username'),
        permissions: localStorage.getItem('permissions'),
        returnUrl: '/reseller',
        returnRoleTitle: 'User Management'
      };

      localStorage.setItem('originalSession', JSON.stringify(originalSession));
      localStorage.setItem('isImpersonating', 'true');
      localStorage.setItem('impersonatedUsername', client.username);

      // Set new client session
      localStorage.setItem('token', data.token);
      localStorage.setItem('username', data.username);
      localStorage.setItem('isAdmin', 'false');
      localStorage.setItem('isReseller', String(data.isReseller));
      localStorage.setItem('role', data.role || 'user');
      localStorage.setItem('permissions', data.permissions || '');

      window.location.href = '/';
    } catch (e: any) {
      alert('Error during pre-login: ' + e.message);
    }
  };

  const instanceUsagePercent = stats && stats.masterMaxInstances > 0
    ? Math.min(100, Math.round((stats.allocatedInstances / stats.masterMaxInstances) * 100))
    : 0;

  const messageUsagePercent = stats && stats.masterMessageLimit > 0
    ? Math.min(100, Math.round((stats.allocatedMessages / stats.masterMessageLimit) * 100))
    : 0;

  const permissionList = [
    { id: 'instances', name: 'Instances' },
    { id: 'broadcast', name: 'Broadcast' },
    { id: 'filter', name: 'Number Filter' },
    { id: 'groups', name: 'Groups Hub' },
    { id: 'reports', name: 'Reports' },
    { id: 'docs', name: 'API Docs' },
  ];

  return (
    <div className="animate-in">
      
      {/* Header matching Admin Panel */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>User Management</h2>
          <p style={{ color: '#64748B', fontSize: '14px', margin: 0, fontWeight: 500 }}>
            Manage client user accounts, quotas, subscriptions, and role access.
          </p>
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
            onClick={() => { setIsAddModalOpen(true); setError(''); setSuccess(''); }} 
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
          {
            label: 'Total Clients',
            val: (stats?.totalClients ?? 0).toLocaleString(),
            sub: 'Direct client accounts',
            badge: 'Total',
            bg: '#EFF6FF',
            icon: GlassUsersIcon,
            progress: null
          },
          {
            label: 'Active Clients',
            val: (stats?.activeClients ?? 0).toLocaleString(),
            sub: 'Valid Subscriptions',
            badge: 'Active',
            bg: '#D1FAE5',
            icon: GlassCheckCircleIcon,
            progress: null
          },
          {
            label: 'Instance Pool',
            val: `${stats?.allocatedInstances ?? 0} / ${stats?.masterMaxInstances ?? 0}`,
            sub: `${stats?.remainingInstances ?? 0} available in pool`,
            badge: `${instanceUsagePercent}% Pool`,
            bg: '#EFF6FF',
            icon: GlassInstanceIcon,
            progress: { pct: instanceUsagePercent, color: instanceUsagePercent > 90 ? '#EF4444' : '#2563EB' }
          },
          {
            label: 'Message Quota',
            val: `${(stats?.allocatedMessages ?? 0).toLocaleString()}`,
            sub: `of ${(stats?.masterMessageLimit ?? 0).toLocaleString()} limit`,
            badge: `${messageUsagePercent}% Quota`,
            bg: '#FAF5FF',
            icon: GlassSendIcon,
            progress: { pct: messageUsagePercent, color: messageUsagePercent > 90 ? '#EF4444' : '#9333EA' }
          }
        ].map(({ label, val, sub, badge, bg, icon: IconComp, progress }) => (
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
              {progress && (
                <div style={{ width: '100%', height: '5px', background: '#F1F5F9', borderRadius: '9999px', margin: '8px 0 4px', overflow: 'hidden' }}>
                  <div style={{ width: `${progress.pct}%`, height: '100%', background: progress.color, borderRadius: '9999px', transition: 'width 0.4s ease' }} />
                </div>
              )}
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
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px', letterSpacing: '-0.01em' }}>All Accounts & Sub-Clients</h3>
            <p style={{ color: '#64748B', fontSize: '13px', margin: 0, fontWeight: 500 }}>Active registered clients and instance quotas.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
            <button
              onClick={() => { fetchStats(); fetchClients(); }}
              title="Refresh Accounts"
              className="btn-outline"
              style={{ padding: '8px 12px', borderRadius: '10px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <GlassRefreshIcon size={16} />
            </button>
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
              {clients.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '48px 20px', color: '#94A3B8', fontSize: '14px', fontWeight: 600 }}>
                    {loading ? 'Loading client accounts...' : 'No client accounts found. Click "Add User" to create one.'}
                  </td>
                </tr>
              ) : (
                clients.map((c) => {
                  const isExpired = c.expiresAt && new Date(c.expiresAt) < new Date();
                  const usagePct = Math.min(100, ((c._count?.instances || 0) / c.maxInstances) * 100);
                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s ease' }}>
                      <td style={{ padding: '16px 28px' }}>
                        <div>
                          <p style={{ fontWeight: 800, fontSize: '14px', color: '#0F172A', margin: 0, lineHeight: 1.2 }}>{c.username}</p>
                          {c.checkWhatsAppNumber === false && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                              <span title="Turbo Mode Active: Sends directly without pre-checking WhatsApp numbers" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A', padding: '2px 7px', borderRadius: '6px', fontSize: '10px', fontWeight: 800 }}>
                                <GlassTurboIcon size={12} /> Turbo Direct Send
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '16px 16px' }}>
                        <span style={{ background: '#EFF6FF', color: '#2563EB', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, display: 'inline-flex', alignItems: 'center' }}>
                          Client
                        </span>
                      </td>
                      <td style={{ padding: '16px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 800, color: '#0F172A', fontSize: '14px' }}>{c._count?.instances || 0}</span>
                          <span style={{ color: '#94A3B8', fontSize: '13px', fontWeight: 600 }}>/ {c.maxInstances}</span>
                        </div>
                        <div style={{ height: '5px', background: '#F1F5F9', borderRadius: '9999px', marginTop: '6px', width: '70px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: '9999px', background: usagePct >= 100 ? '#EF4444' : '#2563EB', width: `${usagePct}%`, transition: 'width 0.5s' }} />
                        </div>
                      </td>
                      <td style={{ padding: '16px 16px' }}>
                        <span style={{ fontWeight: 800, color: '#0F172A', fontSize: '14px', fontFamily: 'var(--font-mono)' }}>{c.messageLimit.toLocaleString()}</span>
                      </td>
                      <td style={{ padding: '16px 16px' }}>
                        {c.expiresAt ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', background: isExpired ? '#FEE2E2' : '#EFF6FF', padding: '4px 10px', borderRadius: '8px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 800, color: isExpired ? '#DC2626' : '#2563EB' }}>
                              {new Date(c.expiresAt).toLocaleDateString()}
                            </span>
                          </div>
                        ) : <span style={{ fontSize: '12px', color: '#94A3B8', fontStyle: 'italic', fontWeight: 600 }}>Lifetime</span>}
                      </td>
                      <td style={{ padding: '16px 16px', fontSize: '13px', color: '#64748B', fontWeight: 600 }}>
                        {new Date(c.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '16px 28px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                          <button
                            onClick={() => handleImpersonate(c)}
                            title={`Pre-Login as ${c.username}`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              background: '#EFF6FF',
                              border: '1px solid #BFDBFE',
                              color: '#2563EB',
                              fontSize: '12px',
                              fontWeight: 800,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <GlassAstronautIcon size={14} /> Impersonate
                          </button>
                          <button
                            onClick={() => handleOpenEdit(c)}
                            title="Edit User"
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              background: '#F8FAFC',
                              border: '1px solid #E2E8F0',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#64748B',
                              cursor: 'pointer'
                            }}
                          >
                            <GlassEditIcon size={15} /> 
                          </button>
                          <button
                            onClick={() => setDeletingClient(c)}
                            title="Delete User"
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              background: '#FEF2F2',
                              border: '1px solid #FEE2E2',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#DC2626',
                              cursor: 'pointer'
                            }}
                          >
                            <GlassCancelIcon size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination matching Admin Panel */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 28px 0', borderTop: '1px solid #F1F5F9' }}>
            <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>
              Page {page} of {totalPages}
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="btn-outline"
                style={{ padding: '6px 14px', fontSize: '12px', fontWeight: 700, borderRadius: '8px' }}
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="btn-outline"
                style={{ padding: '6px 14px', fontSize: '12px', fontWeight: 700, borderRadius: '8px' }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────────
          MODAL: ADD CLIENT (Exact Admin Panel Styling & Pill Permissions)
          ───────────────────────────────────────────────────────────────── */}
      {isAddModalOpen && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '24px' }}>
          <div className="card animate-in hide-scrollbar" style={{ width: '100%', maxWidth: '640px', position: 'relative', borderRadius: '24px', padding: '32px', boxShadow: '0 25px 50px -12px rgba(37, 99, 235, 0.25)', background: '#FFFFFF', maxHeight: '90vh', overflowY: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            
            <button
              onClick={() => setIsAddModalOpen(false)}
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <GlassUsersIcon size={24} />
              </div>
              <div>
                <h3 style={{ fontWeight: 800, fontSize: '20px', color: '#0F172A', margin: 0 }}>Create Sub-Client</h3>
                <p style={{ fontSize: '13px', color: '#64748B', margin: '3px 0 0', fontWeight: 500 }}>
                  Allocate instances and message quotas from your master reseller pool.
                </p>
              </div>
            </div>

            {error && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: '10px', padding: '10px 14px', color: '#DC2626', fontSize: '12px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <GlassWarningIcon size={16} /> <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreateClient} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div className="admin-form-grid">
                <div>
                  <label style={S.label}>Username</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <span style={{ position: 'absolute', left: '12px', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                      <GlassUserIcon size={16} />
                    </span>
                    <input 
                      type="text" 
                      placeholder="e.g. client_name" 
                      value={newUsername} 
                      onChange={(e) => setNewUsername(e.target.value)} 
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
                      onChange={(e) => setNewPassword(e.target.value)} 
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
                  <label style={S.label}>
                    Max Instances <span style={{ color: '#2563EB', fontWeight: 800 }}>({stats?.remainingInstances ?? 0} available)</span>
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <span style={{ position: 'absolute', left: '12px', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                      <GlassInstanceIcon size={16} />
                    </span>
                    <input 
                      type="number" 
                      min="1" 
                      max={stats?.remainingInstances ?? 100} 
                      value={newMaxInstances} 
                      onChange={(e) => setNewMaxInstances(e.target.value)} 
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
                  <label style={S.label}>
                    Monthly Message Limit <span style={{ color: '#059669', fontWeight: 800 }}>({(stats?.remainingMessages ?? 0).toLocaleString()} available)</span>
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <span style={{ position: 'absolute', left: '12px', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                      <GlassSendIcon size={16} />
                    </span>
                    <input 
                      type="number" 
                      min="1" 
                      max={stats?.remainingMessages ?? 100000} 
                      value={newMessageLimit} 
                      onChange={(e) => setNewMessageLimit(e.target.value)} 
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
                <label style={S.label}>Subscription Expiry Date (Optional, leave blank for Lifetime)</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{ position: 'absolute', left: '12px', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                    <GlassCalendarIcon size={16} />
                  </span>
                  <input 
                    type="date" 
                    value={newExpiresAt} 
                    onChange={(e) => setNewExpiresAt(e.target.value)} 
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
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <GlassBoltIcon size={15} /> WhatsApp Number Verification Mode
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#64748B', margin: '3px 0 0', fontWeight: 500 }}>
                    {newCheckWhatsAppNumber 
                      ? 'Default ON: Checks if numbers are registered on WhatsApp before dispatch.' 
                      : 'OFF (Turbo Mode): Sends directly without checking WhatsApp existence for 2x faster delivery speed.'}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: newCheckWhatsAppNumber ? '#15803D' : '#B45309', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    {newCheckWhatsAppNumber ? 'Verification ON' : <><GlassBoltIcon size={13} /> Turbo Mode</>}
                  </span>
                  <ToggleIcon
                    size={38}
                    checked={newCheckWhatsAppNumber}
                    onColor="#16A34A"
                    offColor="#F59E0B"
                  />
                </div>
              </div>

              {/* Menu Permissions with Exact Purple / Green Badge Pill Design */}
              <div>
                <label style={S.label}>Menu Permissions</label>
                <div className="admin-perms-grid">
                  {permissionList.map((perm) => {
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

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px', paddingTop: '16px', borderTop: '1px solid #F1F5F9' }}>
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="btn-outline" style={{ flex: 1, height: '46px', borderRadius: '12px', fontWeight: 700 }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ flex: 2, height: '46px', borderRadius: '12px', fontWeight: 800, fontSize: '14px' }}>
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ─────────────────────────────────────────────────────────────────
          MODAL: EDIT CLIENT
          ───────────────────────────────────────────────────────────────── */}
      {editingClient && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '24px' }}>
          <div className="card animate-in hide-scrollbar" style={{ width: '100%', maxWidth: '640px', position: 'relative', borderRadius: '24px', padding: '32px', boxShadow: '0 25px 50px -12px rgba(37, 99, 235, 0.25)', background: '#FFFFFF', maxHeight: '90vh', overflowY: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            
            <button
              onClick={() => setEditingClient(null)}
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <GlassEditIcon size={24} />
              </div>
              <div>
                <h3 style={{ fontWeight: 800, fontSize: '20px', color: '#0F172A', margin: 0 }}>Edit Client Account</h3>
                <p style={{ fontSize: '13px', color: '#64748B', margin: '3px 0 0', fontWeight: 500 }}>
                  Editing account: <span style={{ color: '#2563EB', fontWeight: 700 }}>{editingClient.username}</span>
                </p>
              </div>
            </div>

            {error && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: '10px', padding: '10px 14px', color: '#DC2626', fontSize: '12px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <GlassWarningIcon size={16} /> <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleUpdateClient} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div className="admin-form-grid">
                <div>
                  <label style={S.label}>Username</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <span style={{ position: 'absolute', left: '12px', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                      <GlassUserIcon size={16} />
                    </span>
                    <input 
                      type="text" 
                      value={editingClient.username} 
                      disabled
                      style={{
                        width: '100%',
                        height: '44px',
                        borderRadius: '12px',
                        fontSize: '13.5px',
                        fontWeight: 600,
                        background: '#F8FAFC',
                        border: '1.5px solid #E2E8F0',
                        padding: '0 12px 0 38px',
                        color: '#64748B',
                        outline: 'none',
                        cursor: 'not-allowed'
                      }}
                    />
                  </div>
                </div>
                <div>
                  <label style={S.label}>New Password (leave blank to keep)</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <span style={{ position: 'absolute', left: '12px', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                      <GlassLockIcon size={16} />
                    </span>
                    <input 
                      type="password" 
                      placeholder="••••••••" 
                      value={editPassword} 
                      onChange={(e) => setEditPassword(e.target.value)} 
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
                  <label style={S.label}>
                    Max Instances <span style={{ color: '#2563EB', fontWeight: 800 }}>({stats?.remainingInstances ?? 0} available)</span>
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <span style={{ position: 'absolute', left: '12px', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                      <GlassInstanceIcon size={16} />
                    </span>
                    <input 
                      type="number" 
                      min="1" 
                      value={editingClient.maxInstances} 
                      onChange={(e) => setEditingClient({ ...editingClient, maxInstances: parseInt(e.target.value) || 1 })} 
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
                  <label style={S.label}>
                    Monthly Message Limit <span style={{ color: '#059669', fontWeight: 800 }}>({(stats?.remainingMessages ?? 0).toLocaleString()} available)</span>
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <span style={{ position: 'absolute', left: '12px', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                      <GlassSendIcon size={16} />
                    </span>
                    <input 
                      type="number" 
                      min="1" 
                      value={editingClient.messageLimit} 
                      onChange={(e) => setEditingClient({ ...editingClient, messageLimit: parseInt(e.target.value) || 1000 })} 
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
                    value={editingClient.expiresAt ? new Date(editingClient.expiresAt).toISOString().split('T')[0] : ''} 
                    onChange={(e) => setEditingClient({ ...editingClient, expiresAt: e.target.value ? new Date(e.target.value).toISOString() : null })} 
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
                onClick={() => setEditCheckWhatsAppNumber(!editCheckWhatsAppNumber)}
                style={{ 
                  background: '#F8FAFC', 
                  padding: '16px', 
                  borderRadius: '16px', 
                  border: editCheckWhatsAppNumber ? '1px solid #E2E8F0' : '1px solid #FDE68A', 
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
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <GlassBoltIcon size={15} /> WhatsApp Number Verification Mode
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#64748B', margin: '3px 0 0', fontWeight: 500 }}>
                    {editCheckWhatsAppNumber 
                      ? 'Default ON: Checks if numbers are registered on WhatsApp before dispatch.' 
                      : 'OFF (Turbo Mode): Sends directly without checking WhatsApp existence for 2x faster delivery speed.'}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: editCheckWhatsAppNumber ? '#15803D' : '#B45309', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    {editCheckWhatsAppNumber ? 'Verification ON' : <><GlassBoltIcon size={13} /> Turbo Mode</>}
                  </span>
                  <ToggleIcon
                    size={38}
                    checked={editCheckWhatsAppNumber}
                    onColor="#16A34A"
                    offColor="#F59E0B"
                  />
                </div>
              </div>

              {/* Menu Permissions with Exact Purple / Green Badge Pill Design */}
              <div>
                <label style={S.label}>Menu Permissions</label>
                <div className="admin-perms-grid">
                  {permissionList.map((perm) => {
                    const isChecked = editPermissions.includes(perm.id);
                    return (
                      <div
                        key={perm.id}
                        onClick={() => {
                          setEditPermissions(prev =>
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

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px', paddingTop: '16px', borderTop: '1px solid #F1F5F9' }}>
                <button type="button" onClick={() => setEditingClient(null)} className="btn-outline" style={{ flex: 1, height: '46px', borderRadius: '12px', fontWeight: 700 }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ flex: 2, height: '46px', borderRadius: '12px', fontWeight: 800, fontSize: '14px' }}>
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ─────────────────────────────────────────────────────────────────
          MODAL: DELETE CLIENT CONFIRMATION
          ───────────────────────────────────────────────────────────────── */}
      {deletingClient && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '24px' }}>
          <div className="card animate-in" style={{ width: '100%', maxWidth: '440px', position: 'relative', borderRadius: '24px', padding: '32px', textAlign: 'center', background: '#FFFFFF', boxShadow: '0 25px 50px -12px rgba(220, 38, 38, 0.25)' }}>
            
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: '#FEF2F2', border: '1px solid #FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <GlassWarningIcon size={28} />
            </div>

            <h3 style={{ fontSize: '19px', fontWeight: 800, color: '#0F172A', margin: '0 0 8px' }}>Delete Client Account?</h3>
            <p style={{ fontSize: '13.5px', color: '#64748B', lineHeight: 1.5, margin: '0 0 24px', fontWeight: 500 }}>
              Are you sure you want to delete <strong style={{ color: '#0F172A' }}>{deletingClient.username}</strong>? All connected instances, message logs, and quotas will be revoked and returned to your reseller pool.
            </p>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                type="button" 
                onClick={() => setDeletingClient(null)} 
                className="btn-outline" 
                style={{ flex: 1, height: '44px', borderRadius: '12px', fontWeight: 700 }}
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={() => handleDeleteClient(deletingClient.id)} 
                style={{ 
                  flex: 1, 
                  height: '44px', 
                  borderRadius: '12px', 
                  background: '#DC2626', 
                  color: '#FFFFFF', 
                  border: 'none', 
                  fontWeight: 800, 
                  fontSize: '13.5px', 
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)'
                }}
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};
