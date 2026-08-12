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
  DeviceIcon,
  SendIcon,
  RefreshIcon
} from '../components/Icons';

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
  const [newPermissions, setNewPermissions] = useState<string[]>(['instances', 'broadcast', 'filter', 'groups', 'reports', 'docs']);
  
  // Edit Client Modal State
  const [editingClient, setEditingClient] = useState<ClientUser | null>(null);
  const [editPassword, setEditPassword] = useState('');

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
        setClients(data.clients);
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
          permissions: newPermissions.join(',')
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create client');
      } else {
        setSuccess(`Client "${newUsername}" created successfully!`);
        setNewUsername('');
        setNewPassword('');
        setNewMaxInstances('1');
        setNewMessageLimit('1000');
        setNewExpiresAt('');
        setIsAddModalOpen(false);
        fetchStats();
        fetchClients();
      }
    } catch (err: any) {
      setError(err.message || 'Server error');
    }
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
          username: editingClient.username,
          password: editPassword.trim() || undefined,
          maxInstances: parseInt(editingClient.maxInstances as any) || 1,
          messageLimit: parseInt(editingClient.messageLimit as any) || 1000,
          expiresAt: editingClient.expiresAt || null,
          permissions: editingClient.permissions
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to update client');
      } else {
        setEditingClient(null);
        setEditPassword('');
        fetchStats();
        fetchClients();
      }
    } catch (err: any) {
      alert(err.message || 'Server error');
    }
  };

  const instanceUsagePercent = stats && stats.masterMaxInstances > 0
    ? Math.min(100, Math.round((stats.allocatedInstances / stats.masterMaxInstances) * 100))
    : 0;

  const messageUsagePercent = stats && stats.masterMessageLimit > 0
    ? Math.min(100, Math.round((stats.allocatedMessages / stats.masterMessageLimit) * 100))
    : 0;

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
              Reseller Client Management Hub
            </h2>
            <span className="badge badge-warning" style={{ fontSize: '11px', fontWeight: 800 }}>
              💼 Reseller Account
            </span>
          </div>
          <p style={{ color: '#64748B', fontSize: '14px', margin: '4px 0 0', fontWeight: 500 }}>
            Create sub-client accounts, allocate instances & message quotas, and manage client subscriptions.
          </p>
        </div>

        <button
          onClick={() => {
            setError('');
            setSuccess('');
            setIsAddModalOpen(true);
          }}
          className="btn-primary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'linear-gradient(135deg, #1E40AF 0%, #2563EB 100%)',
            boxShadow: '0 4px 15px rgba(37, 99, 235, 0.3)'
          }}
        >
          <UserPlusIcon size={16} color="#FFFFFF" /> + Create New Client
        </button>
      </div>

      {/* Reseller Master Quota KPI Cards */}
      <div className="stats-grid">
        
        {/* Total Clients */}
        <div className="card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748B' }}>Total Clients</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserIcon size={16} color="#2563EB" />
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
              <span style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
                {stats?.totalClients ?? 0}
              </span>
              <span className="badge badge-success">
                {stats?.activeClients ?? 0} Active
              </span>
            </div>
            <span style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px', display: 'block' }}>
              Sub-accounts managed
            </span>
          </div>
        </div>

        {/* Master Instance Pool */}
        <div className="card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748B' }}>Instance Pool Allocation</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#F3E8FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DeviceIcon size={16} color="#7C3AED" />
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
                {stats?.allocatedInstances ?? 0} <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748B' }}>/ {stats?.masterMaxInstances ?? 0}</span>
              </span>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#7C3AED' }}>
                {stats?.remainingInstances ?? 0} Left
              </span>
            </div>
            <div style={{ height: '6px', background: '#F1F5F9', borderRadius: '9999px', marginTop: '8px', overflow: 'hidden' }}>
              <div style={{ height: '100%', background: '#7C3AED', width: `${instanceUsagePercent}%`, transition: 'width 0.3s' }} />
            </div>
          </div>
        </div>

        {/* Master Message Limit Pool */}
        <div className="card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748B' }}>Monthly Message Quota Pool</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <SendIcon size={16} color="#059669" />
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
                {(stats?.allocatedMessages ?? 0).toLocaleString()} <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>/ {(stats?.masterMessageLimit ?? 0).toLocaleString()}</span>
              </span>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#059669' }}>
                {(stats?.remainingMessages ?? 0).toLocaleString()} Left
              </span>
            </div>
            <div style={{ height: '6px', background: '#F1F5F9', borderRadius: '9999px', marginTop: '8px', overflow: 'hidden' }}>
              <div style={{ height: '100%', background: '#059669', width: `${messageUsagePercent}%`, transition: 'width 0.3s' }} />
            </div>
          </div>
        </div>

      </div>

      {/* Main Clients Table Card */}
      <div className="card" style={{ padding: '24px 0' }}>
        
        {/* Table Search & Controls */}
        <div style={{ padding: '0 24px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
              Your Sub-Clients ({stats?.totalClients ?? 0})
            </h3>
            <span style={{ fontSize: '12px', color: '#64748B' }}>
              Manage accounts, reset passwords, and edit instance limits for your direct clients.
            </span>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: '260px' }}>
              <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }}>
                <SearchIcon size={15} />
              </div>
              <input
                type="text"
                placeholder="Search client username..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 36px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  background: '#FFFFFF',
                  outline: 'none'
                }}
              />
            </div>

            <button
              onClick={() => {
                fetchStats();
                fetchClients();
              }}
              style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                padding: '8px 12px',
                fontSize: '12px',
                fontWeight: 700,
                color: '#475569',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <RefreshIcon size={14} color="#475569" />
            </button>
          </div>
        </div>

        {/* Clients Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                <th style={{ padding: '12px 24px', fontSize: '11px', fontWeight: 800, color: '#64748B' }}>CLIENT USERNAME</th>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 800, color: '#64748B', textAlign: 'center' }}>INSTANCES QUOTA</th>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 800, color: '#64748B', textAlign: 'center' }}>MESSAGE LIMIT</th>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 800, color: '#64748B', textAlign: 'center' }}>SUBSCRIPTION EXPIRY</th>
                <th style={{ padding: '12px 24px', fontSize: '11px', fontWeight: 800, color: '#64748B', textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                    <div style={{ width: '22px', height: '22px', border: '2px solid #DBEAFE', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 8px' }} />
                    <span>Loading client accounts...</span>
                  </td>
                </tr>
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '48px', textAlign: 'center' }}>
                    <div style={{ maxWidth: '360px', margin: '0 auto' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                        <UserPlusIcon size={24} color="#2563EB" />
                      </div>
                      <h4 style={{ margin: '0 0 6px', color: '#0F172A', fontSize: '15px', fontWeight: 800 }}>No Clients Found</h4>
                      <p style={{ margin: '0 0 16px', color: '#64748B', fontSize: '13px' }}>
                        You haven't created any client accounts yet. Create your first client to allocate quotas.
                      </p>
                      <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="btn-primary"
                        style={{ padding: '8px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: 700 }}
                      >
                        + Create First Client
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                clients.map((c) => {
                  const isExpired = c.expiresAt && new Date(c.expiresAt) < new Date();
                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      
                      {/* Username */}
                      <td style={{ padding: '14px 24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#2563EB', fontSize: '14px' }}>
                            {c.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '14px' }}>
                              {c.username}
                            </div>
                            <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                              Created: {new Date(c.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Instances */}
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <span className="badge badge-info" style={{ fontSize: '12px', fontWeight: 800 }}>
                          {c._count.instances} / {c.maxInstances} Allowed
                        </span>
                      </td>

                      {/* Messages */}
                      <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 700, color: '#0F172A', fontSize: '13px' }}>
                        {c.messageLimit.toLocaleString()} / mo
                      </td>

                      {/* Expiry */}
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        {c.expiresAt ? (
                          <span className={`badge ${isExpired ? 'badge-danger' : 'badge-success'}`} style={{ fontSize: '11px' }}>
                            {isExpired ? 'Expired: ' : 'Expires: '} {new Date(c.expiresAt).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="badge badge-success" style={{ fontSize: '11px' }}>
                            ✓ Lifetime Active
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 24px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px' }}>
                          <button
                            onClick={() => {
                              setError('');
                              setSuccess('');
                              setEditingClient(c);
                              setEditPassword('');
                            }}
                            title="Edit Client"
                            style={{
                              background: '#EFF6FF',
                              border: '1px solid #DBEAFE',
                              borderRadius: '8px',
                              padding: '6px 14px',
                              color: '#2563EB',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px'
                            }}
                          >
                            <EditIcon size={14} color="#2563EB" /> Edit Client
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px 0', borderTop: '1px solid #E2E8F0' }}>
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="btn-outline" style={{ padding: '6px 14px', fontSize: '12px' }}>
              ← Prev
            </button>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748B' }}>
              Page {page} of {totalPages}
            </span>
            <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="btn-outline" style={{ padding: '6px 14px', fontSize: '12px' }}>
              Next →
            </button>
          </div>
        )}

      </div>

      {/* ADD CLIENT MODAL */}
      {isAddModalOpen && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '24px' }}>
          <div className="card animate-in" style={{ width: '100%', maxWidth: '640px', position: 'relative', borderRadius: '24px', padding: '32px', boxShadow: '0 25px 50px -12px rgba(37, 99, 235, 0.25)', background: '#FFFFFF', maxHeight: '90vh', overflowY: 'auto' }}>
            
            <button
              onClick={() => setIsAddModalOpen(false)}
              style={{ position: 'absolute', top: '24px', right: '24px', background: '#F1F5F9', border: 'none', borderRadius: '12px', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}
            >
              <XIcon size={18} color="currentColor" />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <UserPlusIcon size={24} color="#2563EB" />
              </div>
              <div>
                <h3 style={{ fontWeight: 800, fontSize: '20px', color: '#0F172A', margin: 0 }}>Create Sub-Client</h3>
                <p style={{ fontSize: '13px', color: '#64748B', margin: '3px 0 0', fontWeight: 500 }}>
                  Allocate instances and message quotas from your master reseller pool.
                </p>
              </div>
            </div>

            {error && <div style={{ background: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: '10px', padding: '10px 14px', color: '#DC2626', fontSize: '12px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><WarningIcon size={14} color="#DC2626" /> {error}</div>}

            <form onSubmit={handleCreateClient} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div className="admin-form-grid">
                <div>
                  <label style={S.label}>Username</label>
                  <input type="text" placeholder="e.g. client_name" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className="rounded-input" style={{ height: '44px', borderRadius: '10px' }} required />
                </div>
                <div>
                  <label style={S.label}>Password</label>
                  <input type="password" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="rounded-input" style={{ height: '44px', borderRadius: '10px' }} required />
                </div>
                <div>
                  <label style={S.label}>
                    Max Instances <span style={{ color: '#2563EB', fontWeight: 800 }}>({stats?.remainingInstances ?? 0} available)</span>
                  </label>
                  <input type="number" min="1" max={stats?.remainingInstances ?? 100} value={newMaxInstances} onChange={(e) => setNewMaxInstances(e.target.value)} className="rounded-input" style={{ height: '44px', borderRadius: '10px' }} required />
                </div>
                <div>
                  <label style={S.label}>
                    Monthly Message Limit <span style={{ color: '#059669', fontWeight: 800 }}>({(stats?.remainingMessages ?? 0).toLocaleString()} available)</span>
                  </label>
                  <input type="number" min="100" max={stats?.remainingMessages ?? 100000} value={newMessageLimit} onChange={(e) => setNewMessageLimit(e.target.value)} className="rounded-input" style={{ height: '44px', borderRadius: '10px' }} required />
                </div>
              </div>

              <div>
                <label style={S.label}>Subscription Expiry Date (Optional)</label>
                <input type="date" value={newExpiresAt} onChange={(e) => setNewExpiresAt(e.target.value)} className="rounded-input" style={{ height: '44px', borderRadius: '10px' }} />
              </div>

              {/* Menu Permissions */}
              <div>
                <label style={S.label}>Client Menu Permissions</label>
                <div className="admin-perms-grid">
                  {[
                    { id: 'instances', name: 'Instances' },
                    { id: 'broadcast', name: 'Broadcast' },
                    { id: 'filter', name: 'Number Filter' },
                    { id: 'groups', name: 'Groups Hub' },
                    { id: 'reports', name: 'Reports' },
                    { id: 'docs', name: 'API Docs' },
                  ].map((perm) => {
                    const isChecked = newPermissions.includes(perm.id);
                    return (
                      <div
                        key={perm.id}
                        onClick={() => {
                          if (isChecked) setNewPermissions(newPermissions.filter((p) => p !== perm.id));
                          else setNewPermissions([...newPermissions, perm.id]);
                        }}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '12px',
                          border: isChecked ? '1.5px solid #2563EB' : '1.5px solid #E2E8F0',
                          background: isChecked ? '#EFF6FF' : '#F8FAFC',
                          color: isChecked ? '#2563EB' : '#64748B',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          userSelect: 'none'
                        }}
                      >
                        <input type="checkbox" checked={isChecked} onChange={() => {}} style={{ accentColor: '#2563EB', width: '15px', height: '15px', cursor: 'pointer' }} />
                        <span>{perm.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px', paddingTop: '16px', borderTop: '1px solid #F1F5F9' }}>
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="btn-outline" style={{ flex: 1, height: '46px', borderRadius: '12px', fontWeight: 700 }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ flex: 2, height: '46px', borderRadius: '12px', fontWeight: 800 }}>
                  <UserPlusIcon size={18} color="#FFFFFF" /> Create Client Account
                </button>
              </div>
            </form>

          </div>
        </div>,
        document.body
      )}

      {/* EDIT CLIENT MODAL */}
      {editingClient && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '24px' }}>
          <div className="card animate-in" style={{ width: '100%', maxWidth: '640px', position: 'relative', borderRadius: '24px', padding: '32px', boxShadow: '0 25px 50px -12px rgba(37, 99, 235, 0.25)', background: '#FFFFFF', maxHeight: '90vh', overflowY: 'auto' }}>
            
            <button
              onClick={() => setEditingClient(null)}
              style={{ position: 'absolute', top: '24px', right: '24px', background: '#F1F5F9', border: 'none', borderRadius: '12px', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}
            >
              <XIcon size={18} color="currentColor" />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <EditIcon size={24} color="#2563EB" />
              </div>
              <div>
                <h3 style={{ fontWeight: 800, fontSize: '20px', color: '#0F172A', margin: 0 }}>
                  Edit Client: {editingClient.username}
                </h3>
                <p style={{ fontSize: '13px', color: '#64748B', margin: '3px 0 0', fontWeight: 500 }}>
                  Update quotas, extend expiry date, or reset password.
                </p>
              </div>
            </div>

            {error && <div style={{ background: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: '10px', padding: '10px 14px', color: '#DC2626', fontSize: '12px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><WarningIcon size={14} color="#DC2626" /> {error}</div>}

            <form onSubmit={handleUpdateClient} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div className="admin-form-grid">
                <div>
                  <label style={S.label}>New Password (leave blank to keep)</label>
                  <input type="password" placeholder="••••••••" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} className="rounded-input" style={{ height: '44px', borderRadius: '10px' }} />
                </div>
                <div>
                  <label style={S.label}>Subscription Expiry Date</label>
                  <input type="date" value={editingClient.expiresAt ? new Date(editingClient.expiresAt).toISOString().split('T')[0] : ''} onChange={(e) => setEditingClient({ ...editingClient, expiresAt: e.target.value })} className="rounded-input" style={{ height: '44px', borderRadius: '10px' }} />
                </div>
                <div>
                  <label style={S.label}>Max Instances</label>
                  <input type="number" min="1" value={editingClient.maxInstances} onChange={(e) => setEditingClient({ ...editingClient, maxInstances: parseInt(e.target.value) || 1 })} className="rounded-input" style={{ height: '44px', borderRadius: '10px' }} required />
                </div>
                <div>
                  <label style={S.label}>Monthly Message Limit</label>
                  <input type="number" min="100" value={editingClient.messageLimit} onChange={(e) => setEditingClient({ ...editingClient, messageLimit: parseInt(e.target.value) || 1000 })} className="rounded-input" style={{ height: '44px', borderRadius: '10px' }} required />
                </div>
              </div>

              {/* Menu Permissions */}
              <div>
                <label style={S.label}>Client Menu Permissions</label>
                <div className="admin-perms-grid">
                  {[
                    { id: 'instances', name: 'Instances' },
                    { id: 'broadcast', name: 'Broadcast' },
                    { id: 'filter', name: 'Number Filter' },
                    { id: 'groups', name: 'Groups Hub' },
                    { id: 'reports', name: 'Reports' },
                    { id: 'docs', name: 'API Docs' },
                  ].map((perm) => {
                    const perms = (editingClient.permissions || '').split(',');
                    const isChecked = perms.includes(perm.id);
                    return (
                      <div
                        key={perm.id}
                        onClick={() => {
                          const newPerms = isChecked ? perms.filter((p) => p !== perm.id && p !== '') : [...perms, perm.id];
                          setEditingClient({ ...editingClient, permissions: newPerms.join(',') });
                        }}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '12px',
                          border: isChecked ? '1.5px solid #2563EB' : '1.5px solid #E2E8F0',
                          background: isChecked ? '#EFF6FF' : '#F8FAFC',
                          color: isChecked ? '#2563EB' : '#64748B',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          userSelect: 'none'
                        }}
                      >
                        <input type="checkbox" checked={isChecked} onChange={() => {}} style={{ accentColor: '#2563EB', width: '15px', height: '15px', cursor: 'pointer' }} />
                        <span>{perm.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px', paddingTop: '16px', borderTop: '1px solid #F1F5F9' }}>
                <button type="button" onClick={() => setEditingClient(null)} className="btn-outline" style={{ flex: 1, height: '46px', borderRadius: '12px', fontWeight: 700 }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ flex: 2, height: '46px', borderRadius: '12px', fontWeight: 800 }}>
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
