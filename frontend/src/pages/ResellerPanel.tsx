import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
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
  GlassActivityIcon
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
        fetchStats();
        fetchClients();
      }
    } catch (e: any) {
      setError(e.message || 'Error creating client account.');
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
          password: editPassword.trim() || undefined,
          maxInstances: editingClient.maxInstances,
          messageLimit: editingClient.messageLimit,
          expiresAt: editingClient.expiresAt || null,
          permissions: editingClient.permissions
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

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Standard Clean Page Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
            User Management
          </h2>
          <p style={{ color: '#64748B', fontSize: '14px', margin: '4px 0 0', fontWeight: 500 }}>
            Create sub-client accounts, allocate instance & message quotas from your master pool, and manage client access.
          </p>
        </div>

        <button
          onClick={() => {
            setError('');
            setSuccess('');
            setIsAddModalOpen(true);
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'linear-gradient(135deg, #1E40AF 0%, #2563EB 100%)',
            boxShadow: '0 4px 15px rgba(37, 99, 235, 0.3)',
            borderRadius: '12px',
            padding: '10px 18px',
            fontWeight: 800,
            color: 'white',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          <GlassPlusIcon size={18} />
          <span>Create New Client</span>
        </button>
      </div>

      <div className="stats-grid">
        <div className="card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRadius: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Sub-Clients</span>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <GlassUsersIcon size={22} />
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
              <span style={{ fontSize: '26px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
                {stats?.totalClients ?? 0}
              </span>
              <span style={{ background: '#ECFDF5', color: '#059669', fontSize: '11px', fontWeight: 800, padding: '3px 8px', borderRadius: '6px' }}>
                {stats?.activeClients ?? 0} Active
              </span>
            </div>
            <span style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px', display: 'block', fontWeight: 600 }}>
              Direct client accounts managed
            </span>
          </div>
        </div>

        <div className="card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRadius: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Instance Pool Allocation</span>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <GlassInstanceIcon size={22} />
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '26px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
                {stats?.allocatedInstances ?? 0}
              </span>
              <span style={{ fontSize: '14px', color: '#64748B', fontWeight: 700 }}>
                / {stats?.masterMaxInstances ?? 0}
              </span>
            </div>
            
            <div style={{ width: '100%', height: '6px', background: '#F1F5F9', borderRadius: '999px', margin: '8px 0', overflow: 'hidden' }}>
              <div style={{ width: `${instanceUsagePercent}%`, height: '100%', background: instanceUsagePercent > 90 ? '#EF4444' : '#16A34A', borderRadius: '999px', transition: 'width 0.3s ease' }} />
            </div>
            <span style={{ fontSize: '11.5px', color: '#94A3B8', fontWeight: 600 }}>
              {stats?.remainingInstances ?? 0} instance(s) remaining in pool
            </span>
          </div>
        </div>

        <div className="card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRadius: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Monthly Message Pool</span>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: '#FAF5FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <GlassSendIcon size={22} />
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '26px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
                {(stats?.allocatedMessages ?? 0).toLocaleString()}
              </span>
              <span style={{ fontSize: '14px', color: '#64748B', fontWeight: 700 }}>
                / {(stats?.masterMessageLimit ?? 0).toLocaleString()}
              </span>
            </div>
            
            <div style={{ width: '100%', height: '6px', background: '#F1F5F9', borderRadius: '999px', margin: '8px 0', overflow: 'hidden' }}>
              <div style={{ width: `${messageUsagePercent}%`, height: '100%', background: messageUsagePercent > 90 ? '#EF4444' : '#9333EA', borderRadius: '999px', transition: 'width 0.3s ease' }} />
            </div>
            <span style={{ fontSize: '11.5px', color: '#94A3B8', fontWeight: 600 }}>
              {(stats?.remainingMessages ?? 0).toLocaleString()} quota remaining
            </span>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: '24px 0', borderRadius: '16px' }}>
        
        <div style={{ padding: '0 24px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
              Direct Client Accounts ({stats?.totalClients ?? 0})
            </h3>
            <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
              Manage credentials, allocate instance limits, and login as any client account.
            </span>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: '260px' }}>
              <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                <GlassSearchIcon size={16} />
              </div>
              <input
                type="text"
                placeholder="Search client username..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 38px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  background: '#FFFFFF',
                  outline: 'none',
                  fontWeight: 500
                }}
              />
            </div>

            <button
              onClick={() => {
                fetchStats();
                fetchClients();
              }}
              title="Refresh Client Accounts"
              style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                padding: '9px 12px',
                fontSize: '12px',
                fontWeight: 700,
                color: '#475569',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <GlassRefreshIcon size={16} />
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                <th style={{ padding: '12px 24px', fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.04em' }}>CLIENT USER</th>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 800, color: '#64748B', textAlign: 'center', letterSpacing: '0.04em' }}>INSTANCES ALLOCATED</th>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 800, color: '#64748B', textAlign: 'center', letterSpacing: '0.04em' }}>MONTHLY MSG LIMIT</th>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 800, color: '#64748B', textAlign: 'center', letterSpacing: '0.04em' }}>STATUS / EXPIRY</th>
                <th style={{ padding: '12px 24px', fontSize: '11px', fontWeight: 800, color: '#64748B', textAlign: 'right', letterSpacing: '0.04em' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: '48px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                    Loading client accounts...
                  </td>
                </tr>
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '48px', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>
                    No clients found. Click "+ Create New Client" above to get started.
                  </td>
                </tr>
              ) : (
                clients.map((c) => {
                  const isExpired = c.expiresAt && new Date(c.expiresAt) < new Date();
                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s ease' }}>
                      <td style={{ padding: '14px 24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#2563EB', fontSize: '14px', flexShrink: 0 }}>
                            {c.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span style={{ fontWeight: 700, color: '#0F172A', fontSize: '14px', display: 'block' }}>
                              {c.username}
                            </span>
                            <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                              Created {new Date(c.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                          {c.maxInstances}
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748B', display: 'block', fontWeight: 600 }}>
                          ({c._count?.instances || 0} active)
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                          {c.messageLimit.toLocaleString()}
                        </span>
                        <span style={{ fontSize: '11px', color: '#94A3B8', display: 'block' }}>
                          per month
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        {isExpired ? (
                          <span style={{ background: '#FEF2F2', color: '#DC2626', fontSize: '11.5px', fontWeight: 800, padding: '3px 10px', borderRadius: '6px', display: 'inline-block' }}>
                            Expired ({new Date(c.expiresAt!).toLocaleDateString()})
                          </span>
                        ) : c.expiresAt ? (
                          <span style={{ background: '#F0FDF4', color: '#16A34A', fontSize: '11.5px', fontWeight: 700, padding: '3px 10px', borderRadius: '6px', display: 'inline-block' }}>
                            Expires {new Date(c.expiresAt).toLocaleDateString()}
                          </span>
                        ) : (
                          <span style={{ background: '#EFF6FF', color: '#2563EB', fontSize: '11.5px', fontWeight: 700, padding: '3px 10px', borderRadius: '6px', display: 'inline-block' }}>
                            Lifetime Active
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '14px 24px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                          <button
                            onClick={() => handleImpersonate(c)}
                            title="Log in as this client"
                            style={{
                              background: '#EFF6FF',
                              border: '1px solid #BFDBFE',
                              color: '#1D4ED8',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <GlassAstronautIcon size={14} />
                            <span>Impersonate</span>
                          </button>

                          <button
                            onClick={() => {
                              setError('');
                              setSuccess('');
                              setEditingClient({ ...c });
                              setEditPassword('');
                            }}
                            title="Edit client quotas and credentials"
                            style={{
                              background: '#F8FAFC',
                              border: '1px solid #E2E8F0',
                              color: '#334155',
                              padding: '6px 10px',
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <GlassEditIcon size={14} />
                            <span>Edit</span>
                          </button>

                          <button
                            onClick={() => setDeletingClient(c)}
                            title="Delete client account"
                            style={{
                              background: '#FEF2F2',
                              border: '1px solid #FEE2E2',
                              color: '#DC2626',
                              padding: '6px 10px',
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <GlassCancelIcon size={14} />
                            <span>Delete</span>
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

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '20px', padding: '0 24px' }}>
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                background: page <= 1 ? '#F8FAFC' : '#FFFFFF',
                color: page <= 1 ? '#94A3B8' : '#334155',
                cursor: page <= 1 ? 'not-allowed' : 'pointer',
                fontWeight: 700,
                fontSize: '12px'
              }}
            >
              Previous
            </button>
            <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                background: page >= totalPages ? '#F8FAFC' : '#FFFFFF',
                color: page >= totalPages ? '#94A3B8' : '#334155',
                cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                fontWeight: 700,
                fontSize: '12px'
              }}
            >
              Next
            </button>
          </div>
        )}
      </div>

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
                      min="100" 
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
                          userSelect: 'none',
                          transition: 'all 0.15s ease'
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
                <button type="submit" className="btn-primary" style={{ flex: 2, height: '46px', borderRadius: '12px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <GlassPlusIcon size={18} /> <span>Create Client Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

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
                <h3 style={{ fontWeight: 800, fontSize: '20px', color: '#0F172A', margin: 0 }}>
                  Edit Client: {editingClient.username}
                </h3>
                <p style={{ fontSize: '13px', color: '#64748B', margin: '3px 0 0', fontWeight: 500 }}>
                  Update quotas, extend expiry date, or reset password.
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
                  <label style={S.label}>Subscription Expiry Date</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <span style={{ position: 'absolute', left: '12px', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                      <GlassCalendarIcon size={16} />
                    </span>
                    <input 
                      type="date" 
                      value={editingClient.expiresAt ? new Date(editingClient.expiresAt).toISOString().split('T')[0] : ''} 
                      onChange={(e) => setEditingClient({ ...editingClient, expiresAt: e.target.value })} 
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
                <div>
                  <label style={S.label}>Max Instances</label>
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
                  <label style={S.label}>Monthly Message Limit</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <span style={{ position: 'absolute', left: '12px', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                      <GlassSendIcon size={16} />
                    </span>
                    <input 
                      type="number" 
                      min="100" 
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
                          userSelect: 'none',
                          transition: 'all 0.15s ease'
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

      {deletingClient && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '24px' }}>
          <div className="card animate-in" style={{ width: '100%', maxWidth: '440px', borderRadius: '24px', padding: '28px', background: '#FFFFFF', boxShadow: '0 25px 50px -12px rgba(220, 38, 38, 0.25)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
              <GlassWarningIcon size={24} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: '0 0 8px' }}>
              Delete Client Account?
            </h3>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 20px', lineHeight: 1.5 }}>
              Are you sure you want to permanently delete <strong style={{ color: '#0F172A' }}>@{deletingClient.username}</strong>? All connected instances, messages, and configurations will be permanently removed.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setDeletingClient(null)}
                className="btn-outline"
                style={{ flex: 1, height: '44px', borderRadius: '12px', fontWeight: 700 }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteClient(deletingClient.id)}
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
                Delete Client
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};
