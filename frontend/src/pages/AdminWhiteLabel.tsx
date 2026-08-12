import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  GlobeIcon,
  CopyIcon,
  CheckIcon,
  LockIcon,
  UserIcon,
  WarningIcon,
  CheckCircleIcon,
  RefreshIcon,
  EditIcon,
  XIcon,
  SearchIcon,
  ShieldIcon,
  UserPlusIcon
} from '../components/Icons';

interface UserDomainData {
  id: string;
  username: string;
  role: string;
  isReseller: boolean;
  isAdmin: boolean;
  customDomain: string | null;
  domainStatus: string;
  domainSslActive: boolean;
  brandName: string | null;
  brandLogoUrl: string | null;
  brandThemeColor: string | null;
  createdAt: string;
  _count?: { instances: number };
}

const S: Record<string, React.CSSProperties> = {
  label: { display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748B', marginBottom: '8px' },
};

export const AdminWhiteLabel = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserDomainData[]>([]);
  const [serverIp, setServerIp] = useState('104.251.211.226');
  const [loading, setLoading] = useState(true);
  const [copiedIp, setCopiedIp] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [selectedUserId, setSelectedUserId] = useState('');
  const [domainInput, setDomainInput] = useState('');
  const [brandNameInput, setBrandNameInput] = useState('');
  const [brandLogoInput, setBrandLogoInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filter & Search
  const [search, setSearch] = useState('');

  useEffect(() => {
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    if (!isAdmin) {
      navigate('/');
      return;
    }
    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/domains`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.status === 401 || res.status === 403) {
        navigate('/');
        return;
      }
      const data = await res.json();
      if (data.serverIp) setServerIp(data.serverIp);
      if (data.users) setUsers(data.users);
    } catch (e) {
      console.error('Failed to load white-label data', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyIp = () => {
    navigator.clipboard.writeText(serverIp);
    setCopiedIp(true);
    setTimeout(() => setCopiedIp(false), 2000);
  };

  const openNewDomainModal = () => {
    setSelectedUserId('');
    setDomainInput('');
    setBrandNameInput('');
    setBrandLogoInput('');
    setMessage(null);
    setIsModalOpen(true);
  };

  const handleEditUserDomain = (user: UserDomainData) => {
    setSelectedUserId(user.id);
    setDomainInput(user.customDomain || '');
    setBrandNameInput(user.brandName || '');
    setBrandLogoInput(user.brandLogoUrl || '');
    setMessage(null);
    setIsModalOpen(true);
  };

  const handleSaveDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      setMessage({ type: 'error', text: 'Please select a target user account.' });
      return;
    }

    setVerifying(true);
    setMessage(null);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/domains/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          targetUserId: selectedUserId,
          domain: domainInput,
          brandName: brandNameInput,
          brandLogoUrl: brandLogoInput
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to verify and save domain' });
      } else {
        setMessage({ type: 'success', text: data.message || 'Custom domain connected and SSL provisioned successfully!' });
        fetchData();
        setTimeout(() => {
          setIsModalOpen(false);
        }, 1500);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Network error occurred' });
    } finally {
      setVerifying(false);
    }
  };

  const handleDisconnect = async (userId: string, username: string) => {
    if (!confirm(`Are you sure you want to disconnect custom domain for user "${username}"?`)) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/domains/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      alert('Failed to disconnect domain');
    }
  };

  const activeDomains = users.filter(u => !!u.customDomain);
  const filteredDomains = activeDomains.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    (u.customDomain && u.customDomain.toLowerCase().includes(search.toLowerCase())) ||
    (u.brandName && u.brandName.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header with Title & Action Button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
              Enterprise White-Label Management Hub
            </h2>
            <span className="badge badge-primary" style={{ fontSize: '11px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <ShieldIcon size={12} color="#2563EB" /> Super Admin Control
            </span>
          </div>
          <p style={{ color: '#64748B', fontSize: '14px', margin: '4px 0 0', fontWeight: 500 }}>
            Configure custom domains, brand titles, logos, and auto-provision SSL certificates for any client or reseller account.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={fetchData}
            style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '10px 16px',
              fontSize: '13px',
              fontWeight: 700,
              color: '#475569',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
            }}
          >
            <RefreshIcon size={14} color="#475569" /> Refresh
          </button>

          <button
            onClick={openNewDomainModal}
            className="btn-primary"
            style={{
              padding: '10px 20px',
              borderRadius: '12px',
              fontSize: '13.5px',
              fontWeight: 800,
              background: 'linear-gradient(135deg, #1E40AF 0%, #2563EB 100%)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 15px rgba(37, 99, 235, 0.3)',
              cursor: 'pointer'
            }}
          >
            <GlobeIcon size={16} color="#FFFFFF" /> + Add Domain
          </button>
        </div>
      </div>

      {/* Top DNS Instructions Card */}
      <div className="card" style={{ padding: '28px', background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)', border: '1px solid #E2E8F0' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <GlobeIcon size={24} color="#2563EB" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0F172A' }}>
                Server DNS Configuration Guide
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#64748B', fontWeight: 500 }}>
                Ask your client to point their domain/subdomain to this server IPv4 address via an <strong>A-Record</strong> before clicking Verify.
              </p>
            </div>
          </div>

          {/* IP Box with Copy Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#FFFFFF', padding: '8px 16px', borderRadius: '12px', border: '1px solid #CBD5E1', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
            <div>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', display: 'block', textTransform: 'uppercase' }}>Server IPv4</span>
              <code style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', fontFamily: 'var(--font-mono)' }}>{serverIp}</code>
            </div>
            <button
              type="button"
              onClick={handleCopyIp}
              style={{
                background: copiedIp ? '#D1FAE5' : '#F1F5F9',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                fontWeight: 700,
                color: copiedIp ? '#059669' : '#334155',
                transition: 'all 0.2s'
              }}
            >
              {copiedIp ? <CheckIcon size={14} color="#059669" /> : <CopyIcon size={14} color="#334155" />}
              <span>{copiedIp ? 'Copied!' : 'Copy IP'}</span>
            </button>
          </div>
        </div>

        {/* DNS Table */}
        <div style={{ overflowX: 'auto', background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '16px' }}>
          <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ color: '#64748B', fontSize: '11px', fontWeight: 800, borderBottom: '1px solid #F1F5F9' }}>
                <th style={{ padding: '8px 12px' }}>RECORD TYPE</th>
                <th style={{ padding: '8px 12px' }}>HOST / NAME</th>
                <th style={{ padding: '8px 12px' }}>POINTS TO / VALUE</th>
                <th style={{ padding: '8px 12px' }}>TTL</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '10px 12px', fontWeight: 800, color: '#2563EB' }}>A</td>
                <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)' }}>@ <span style={{ color: '#94A3B8', fontSize: '11px' }}>(root)</span> or <strong>portal</strong> / <strong>app</strong></td>
                <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{serverIp}</td>
                <td style={{ padding: '10px 12px', color: '#64748B' }}>Auto / 300s</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Cloudflare Tip */}
        <div style={{ marginTop: '14px', background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: '10px', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12.5px', color: '#92400E' }}>
          <span style={{ fontWeight: 800, background: '#D97706', color: '#FFFFFF', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', textTransform: 'uppercase' }}>Cloudflare Users</span>
          <span>Set Proxy Status to <strong>DNS Only (Grey Cloud)</strong> for automatic origin SSL verification, OR set Cloudflare SSL/TLS mode to <strong>Full</strong> or <strong>Flexible</strong>.</span>
        </div>
      </div>

      {/* Main Full-Width Management Card */}
      <div className="card" style={{ padding: '28px' }}>
        
        {/* Table Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                All Platform Accounts & White-Label Domains
              </h3>
              <span className="badge badge-success" style={{ fontSize: '12px', fontWeight: 800 }}>
                {activeDomains.length} Active Domains
              </span>
            </div>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0', fontWeight: 500 }}>
              Click on <strong>"+ Add Domain"</strong> or <strong>"Edit"</strong> on any account to attach or update custom domain and branding.
            </p>
          </div>

          {/* Search Bar */}
          <div style={{ position: 'relative', width: '280px' }}>
            <input
              type="text"
              placeholder="Search user, domain, or brand..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                borderRadius: '10px',
                border: '1.5px solid #CBD5E1',
                fontSize: '13px',
                outline: 'none'
              }}
            />
            <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#94A3B8' }}>
              <SearchIcon size={16} color="currentColor" />
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13.5px' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', color: '#64748B', fontSize: '11.5px', fontWeight: 800, borderBottom: '1.5px solid #E2E8F0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ padding: '12px 16px' }}>Target Account</th>
                <th style={{ padding: '12px 16px' }}>Account Role</th>
                <th style={{ padding: '12px 16px' }}>White-Label Custom Domain</th>
                <th style={{ padding: '12px 16px' }}>Brand Details</th>
                <th style={{ padding: '12px 16px' }}>SSL & Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDomains.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '48px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '4px' }}>
                        <GlobeIcon size={24} color="#2563EB" />
                      </div>
                      <h4 style={{ margin: 0, color: '#0F172A', fontSize: '15px', fontWeight: 800 }}>
                        {search ? 'No Matching Custom Domains Found' : 'No Custom Domains Configured Yet'}
                      </h4>
                      <p style={{ margin: 0, fontSize: '13px', color: '#64748B', maxWidth: '420px' }}>
                        {search
                          ? `No white-labeled accounts match "${search}". Try searching for another username or domain.`
                          : 'No client or reseller accounts have custom domains connected. Click the button below to connect and configure a domain.'}
                      </p>
                      {!search && (
                        <button
                          type="button"
                          onClick={openNewDomainModal}
                          className="btn-primary"
                          style={{
                            marginTop: '12px',
                            padding: '9px 18px',
                            borderRadius: '10px',
                            fontSize: '13px',
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                            cursor: 'pointer'
                          }}
                        >
                          <GlobeIcon size={15} color="#FFFFFF" /> + Add Domain
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDomains.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s' }}>
                    
                    {/* User */}
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#2563EB' }}>
                          {u.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span style={{ fontWeight: 800, color: '#0F172A', display: 'block' }}>{u.username}</span>
                          <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                            Created {new Date(u.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td style={{ padding: '16px' }}>
                      {u.isAdmin ? (
                        <span className="badge badge-primary" style={{ fontSize: '11px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <ShieldIcon size={12} color="#2563EB" /> Super Admin
                        </span>
                      ) : u.isReseller ? (
                        <span className="badge badge-warning" style={{ fontSize: '11px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <UserPlusIcon size={12} color="#D97706" /> Reseller
                        </span>
                      ) : (
                        <span className="badge badge-neutral" style={{ fontSize: '11px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <UserIcon size={12} color="#64748B" /> Client
                        </span>
                      )}
                    </td>

                    {/* Custom Domain */}
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <code style={{ fontSize: '13px', fontWeight: 800, color: '#2563EB', fontFamily: 'var(--font-mono)' }}>
                          https://{u.customDomain}
                        </code>
                        <a
                          href={`https://${u.customDomain}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            padding: '2px 8px',
                            borderRadius: '6px',
                            background: '#EFF6FF',
                            border: '1px solid #DBEAFE',
                            color: '#2563EB',
                            fontSize: '11px',
                            fontWeight: 800,
                            textDecoration: 'none'
                          }}
                        >
                          Visit ↗
                        </a>
                      </div>
                    </td>

                    {/* Brand Details */}
                    <td style={{ padding: '16px' }}>
                      {u.brandName || u.brandLogoUrl ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {u.brandLogoUrl && (
                            <img
                              src={u.brandLogoUrl}
                              alt="Logo"
                              style={{ width: '22px', height: '22px', objectFit: 'contain', borderRadius: '4px' }}
                              onError={(e) => { (e.target as any).style.display = 'none'; }}
                            />
                          )}
                          <span style={{ fontWeight: 700, color: '#1E293B', fontSize: '13px' }}>
                            {u.brandName || 'Custom Logo'}
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: '#94A3B8', fontSize: '12.5px' }}>Default Branding</span>
                      )}
                    </td>

                    {/* SSL & Status */}
                    <td style={{ padding: '16px' }}>
                      <span className="badge badge-success" style={{ fontSize: '11px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <LockIcon size={12} color="#15803D" /> SSL Active
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => handleEditUserDomain(u)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            background: '#F1F5F9',
                            border: '1px solid #E2E8F0',
                            color: '#334155',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <EditIcon size={13} color="#475569" />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDisconnect(u.id, u.username)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            background: '#FEF2F2',
                            border: '1px solid #FEE2E2',
                            color: '#DC2626',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Disconnect
                        </button>
                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* DIALOG / MODAL POPUP WITH BLURRED BACKGROUND */}
      {isModalOpen && createPortal(
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '24px'
          }}
        >
          <div
            className="card animate-in"
            style={{
              width: '100%',
              maxWidth: '560px',
              position: 'relative',
              borderRadius: '24px',
              padding: '32px',
              boxShadow: '0 25px 50px -12px rgba(37, 99, 235, 0.25)',
              background: '#FFFFFF',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            {/* Close X Button */}
            <button
              onClick={() => setIsModalOpen(false)}
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
                color: '#64748B'
              }}
            >
              <XIcon size={18} color="currentColor" />
            </button>

            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <GlobeIcon size={24} color="#2563EB" />
              </div>
              <div>
                <h3 style={{ fontWeight: 800, fontSize: '20px', color: '#0F172A', margin: 0 }}>
                  Connect & White-Label Account
                </h3>
                <p style={{ fontSize: '13px', color: '#64748B', margin: '3px 0 0', fontWeight: 500 }}>
                  Select any client or reseller account, input their custom domain, and click verify to provision SSL automatically.
                </p>
              </div>
            </div>

            {/* Alert Message */}
            {message && (
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: 600,
                  marginBottom: '20px',
                  background: message.type === 'success' ? '#F0FDF4' : '#FEF2F2',
                  border: `1px solid ${message.type === 'success' ? '#BBF7D0' : '#FECACA'}`,
                  color: message.type === 'success' ? '#15803D' : '#DC2626',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {message.type === 'success' ? <CheckCircleIcon size={16} color="#15803D" /> : <WarningIcon size={16} color="#DC2626" />}
                <span>{message.text}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSaveDomain} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              
              {/* Select Target User */}
              <div>
                <label style={S.label}>
                  Select Target Account <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => {
                    const userId = e.target.value;
                    setSelectedUserId(userId);
                    const user = users.find(u => u.id === userId);
                    if (user) {
                      setDomainInput(user.customDomain || '');
                      setBrandNameInput(user.brandName || '');
                      setBrandLogoInput(user.brandLogoUrl || '');
                    }
                  }}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '14px',
                    fontWeight: 600,
                    outline: 'none',
                    background: '#FFFFFF'
                  }}
                >
                  <option value="">-- Choose Client or Reseller Account --</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.username} ({u.isAdmin ? 'Super Admin' : u.isReseller ? 'Reseller' : 'Client'}) {u.customDomain ? `— [${u.customDomain}]` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom Domain Input */}
              <div>
                <label style={S.label}>
                  Custom Domain Name <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. portal.clientbrand.com or app.agency.in"
                  value={domainInput}
                  onChange={(e) => setDomainInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '14px',
                    fontWeight: 600,
                    outline: 'none',
                    fontFamily: 'var(--font-mono)'
                  }}
                />
                <span style={{ fontSize: '11.5px', color: '#94A3B8', marginTop: '4px', display: 'block' }}>
                  Do not include https://. Example: <code>portal.clientbrand.com</code>
                </span>
              </div>

              {/* Brand Title */}
              <div>
                <label style={S.label}>Portal Brand Name</label>
                <input
                  type="text"
                  placeholder="e.g. Client Messaging Cloud"
                  value={brandNameInput}
                  onChange={(e) => setBrandNameInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Logo URL */}
              <div>
                <label style={S.label}>Custom Brand Logo URL (Optional)</label>
                <input
                  type="url"
                  placeholder="e.g. https://clientbrand.com/logo.png"
                  value={brandLogoInput}
                  onChange={(e) => setBrandLogoInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Submit Button */}
              <div style={{ display: 'flex', gap: '12px', paddingTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    flex: 1,
                    padding: '14px',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: 700,
                    background: '#F1F5F9',
                    border: '1px solid #E2E8F0',
                    color: '#475569',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={verifying}
                  className="btn-primary"
                  style={{
                    flex: 2,
                    padding: '14px',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: 800,
                    background: 'linear-gradient(135deg, #1E40AF 0%, #2563EB 100%)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    cursor: verifying ? 'not-allowed' : 'pointer',
                    opacity: verifying ? 0.7 : 1
                  }}
                >
                  <GlobeIcon size={18} color="#FFFFFF" />
                  <span>{verifying ? 'Verifying DNS & Activating SSL...' : 'Verify DNS & Connect Domain'}</span>
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
