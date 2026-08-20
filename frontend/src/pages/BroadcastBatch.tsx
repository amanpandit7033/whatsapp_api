import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  GlassBatchIcon,
  GlassCheckCircleIcon,
  GlassCancelIcon,
  GlassPaperclipIcon,
  GlassFolderIcon,
  GlassSearchIcon,
  GlassRefreshIcon,
  GlassUsersIcon,
  GlassTagIcon,
  GlassStarSparkleIcon,
  GlassCopyIcon,
  GlassChatIcon,
  GlassInstanceIcon,
  GlassBackIcon,
  GlassCloudDownloadIcon,
  GlassPendingIcon
} from '../components/GlassIcons';
import { copyToClipboard } from '../utils/clipboard';

interface IBroadcastItem {
  id: string;
  number: string;
  status: string; // 'sent', 'failed'
  error?: string | null;
  sentAt?: string | null;
  createdAt: string;
}

interface IBroadcastCampaign {
  id: string;
  name: string;
  instanceId?: string;
  poolName?: string;
  messageType: string;
  messageText?: string;
  mediaUrl?: string;
  totalCount: number;
  sentCount: number;
  failedCount: number;
  status: string;
  createdAt: string;
}

export const BroadcastBatch = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [campaign, setCampaign] = useState<IBroadcastCampaign | null>(null);
  const [items, setItems] = useState<IBroadcastItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'sent' | 'pending' | 'failed'>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [copiedNotification, setCopiedNotification] = useState('');
  const [copiedNumberId, setCopiedNumberId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchBatchDetails();
  }, [id, page, limit, statusFilter, search]);

  // Auto-refresh when campaign is actively running
  useEffect(() => {
    if (campaign?.status !== 'running') return;
    const timer = setInterval(() => {
      fetchBatchDetails(false);
    }, 2500);
    return () => clearInterval(timer);
  }, [campaign?.status, id, page, limit, statusFilter, search]);

  const fetchBatchDetails = async (showLoading = true) => {
    if (!id) return;
    if (showLoading) setLoading(true);
    try {
      const query = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        status: statusFilter,
        search
      });

      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/broadcast/campaigns/${id}?${query}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (res.ok) {
        setCampaign(data.campaign);
        setItems(data.items || []);
        setTotalItems(data.totalItems || 0);
        setTotalPages(data.totalPages || 1);
      }
    } catch (e) {
      console.error('Failed to fetch campaign batch details:', e);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleCopyNumbers = async (status: 'all' | 'sent' | 'pending' | 'failed') => {
    if (!id) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/broadcast/campaigns/${id}/export?status=${status}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      const exportItems: IBroadcastItem[] = data.items || [];
      const numbers = exportItems.map(i => i.number.trim()).filter(Boolean);
      if (numbers.length === 0) {
        alert('No numbers found to copy');
        return;
      }
      await copyToClipboard(numbers.join('\n'));
      setCopiedNotification(`Copied ${numbers.length} numbers to clipboard!`);
      setTimeout(() => setCopiedNotification(''), 3500);
    } catch {
      alert('Failed to copy numbers');
    }
  };

  const handleExportCsv = async () => {
    if (!id) return;
    setExporting(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/broadcast/campaigns/${id}/export?status=${statusFilter}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      const exportItems: IBroadcastItem[] = data.items || [];

      if (exportItems.length === 0) {
        alert('No records available to export');
        return;
      }

      // Build well-organized CSV with proper headers, quotes, and timestamps
      const headers = ['Sr No.', 'Phone Number', 'Status', 'Error / Remarks', 'Timestamp'];
      const rows = exportItems.map((item, idx) => {
        const srNo = idx + 1;
        const phone = `+${item.number.replace(/^\+/, '')}`;
        const statusLabel = (item.status === 'sent' || item.status === 'success') ? 'Delivered' : item.status === 'pending' ? 'Pending' : 'Failed';
        const errorRemark = (item.error || ((item.status === 'sent' || item.status === 'success') ? 'Success' : item.status === 'pending' ? 'Queued' : '-')).replace(/"/g, '""');
        const timestamp = item.sentAt || item.createdAt ? new Date(item.sentAt || item.createdAt).toLocaleString() : '-';

        return `"${srNo}","${phone}","${statusLabel}","${errorRemark}","${timestamp}"`;
      });

      const csvContent = [headers.map(h => `"${h}"`).join(','), ...rows].join('\r\n');
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cleanName = (campaign?.name || 'Campaign').replace(/[^a-zA-Z0-9_-]/g, '_');
      a.download = `${cleanName}_${statusFilter}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Failed to export CSV');
    } finally {
      setExporting(false);
    }
  };

  const copySingleNumber = async (num: string, itemId: string) => {
    await copyToClipboard(num);
    setCopiedNumberId(itemId);
    setTimeout(() => setCopiedNumberId(null), 2000);
  };

  const rate = campaign && campaign.totalCount > 0 ? ((campaign.sentCount / campaign.totalCount) * 100).toFixed(1) : '0.0';
  const pendingCount = campaign ? Math.max(0, campaign.totalCount - (campaign.sentCount + campaign.failedCount)) : 0;

  return (
    <div style={{ paddingBottom: '60px' }}>
      
      {/* ─────────────────────────────────────────────────────────────
          PAGE HEADER WITH ACTIONS
          ───────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: 46, height: 46, borderRadius: 14, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GlassBatchIcon size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
                {campaign?.name || 'Campaign Batch Details'}
              </h2>
              {campaign?.status && (
                <span style={{
                  padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800, textTransform: 'capitalize',
                  background: campaign.status === 'completed' ? '#D1FAE5' : campaign.status === 'running' ? '#EFF6FF' : '#FEE2E2',
                  color: campaign.status === 'completed' ? '#065F46' : campaign.status === 'running' ? '#1D4ED8' : '#991B1B'
                }}>
                  {campaign.status}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px', fontSize: '12px', color: '#64748B' }}>
              <span>Created {campaign ? new Date(campaign.createdAt).toLocaleDateString() : '...'}</span>
              {campaign?.poolName && (
                <>
                  <span>•</span>
                  <span style={{ color: '#2563EB', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    <GlassTagIcon size={12} /> {campaign.poolName}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Global Batch Action Buttons (Right-aligned) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={handleExportCsv}
            disabled={exporting}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 18px',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: 800,
              color: '#FFFFFF',
              background: '#0F172A',
              border: 'none',
              cursor: exporting ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 8px rgba(15, 23, 42, 0.25)',
              transition: 'all 0.15s ease',
              opacity: exporting ? 0.7 : 1
            }}
            title="Export CSV spreadsheet"
          >
            <GlassCloudDownloadIcon size={18} />
            <span>{exporting ? 'Exporting…' : 'Export CSV'}</span>
          </button>

          <button
            onClick={() => fetchBatchDetails(true)}
            className="btn-outline"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: 700 }}
            title="Refresh list"
          >
            <GlassRefreshIcon size={16} /> Refresh
          </button>

          <button
            onClick={() => navigate('/broadcast')}
            className="btn-outline"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 16px',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: 800,
              color: '#1E293B',
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              transition: 'all 0.15s ease'
            }}
            title="Back to Broadcast Batches"
          >
            <GlassBackIcon size={18} />
            <span>Back</span>
          </button>
        </div>
      </div>

      {/* Notification banner */}
      {copiedNotification && (
        <div style={{ padding: '10px 18px', background: '#D1FAE5', color: '#065F46', fontSize: '13px', fontWeight: 700, borderRadius: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 6px rgba(5,150,105,0.1)' }}>
          <GlassCheckCircleIcon size={16} /> {copiedNotification}
        </div>
      )}

      {/* KPI Stats Strip */}
      {campaign && (
        <div className="stats-grid" style={{ marginBottom: '24px' }}>
          <div className="card" style={{ padding: '20px 24px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748B' }}>Total Recipients</span>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <GlassUsersIcon size={20} />
              </div>
            </div>
            <p style={{ fontSize: '26px', fontWeight: 900, color: '#0F172A', margin: 0 }}>{campaign.totalCount.toLocaleString()}</p>
            <span style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px', display: 'block' }}>All Target Numbers</span>
          </div>

          <div className="card" style={{ padding: '20px 24px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748B' }}>Successfully Sent</span>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <GlassCheckCircleIcon size={20} />
              </div>
            </div>
            <p style={{ fontSize: '26px', fontWeight: 900, color: '#059669', margin: 0 }}>{campaign.sentCount.toLocaleString()}</p>
            <span style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px', display: 'block' }}>Delivered to WhatsApp</span>
          </div>

          <div className="card" style={{ padding: '20px 24px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748B' }}>Pending Queue</span>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <GlassPendingIcon size={20} />
              </div>
            </div>
            <p style={{ fontSize: '26px', fontWeight: 900, color: '#D97706', margin: 0 }}>{pendingCount.toLocaleString()}</p>
            <span style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px', display: 'block' }}>Awaiting Dispatch</span>
          </div>

          <div className="card" style={{ padding: '20px 24px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748B' }}>Failed Transmissions</span>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <GlassCancelIcon size={20} />
              </div>
            </div>
            <p style={{ fontSize: '26px', fontWeight: 900, color: '#DC2626', margin: 0 }}>{campaign.failedCount.toLocaleString()}</p>
            <span style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px', display: 'block' }}>Invalid or Network errors</span>
          </div>
        </div>
      )}

      {/* Main Numbers Table Card */}
      <div className="card" style={{ padding: '24px 0', borderRadius: '16px' }}>
        
        {/* Filter Strip & Search Bar */}
        <div style={{ padding: '0 24px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', borderBottom: '1px solid #F1F5F9' }}>
          
          {/* Status Tabs */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {(['all', 'sent', 'pending', 'failed'] as const).map(st => {
              const isActive = statusFilter === st;
              const count = st === 'all' ? campaign?.totalCount : st === 'sent' ? campaign?.sentCount : st === 'pending' ? pendingCount : campaign?.failedCount;
              const label = st === 'all' ? `All Numbers (${count ?? 0})` : st === 'sent' ? `Delivered (${count ?? 0})` : st === 'pending' ? `Pending (${count ?? 0})` : `Failed (${count ?? 0})`;
              return (
                <button
                  key={st}
                  onClick={() => { setStatusFilter(st); setPage(1); }}
                  style={{
                    padding: '8px 16px', borderRadius: '10px', fontSize: '12.5px', fontWeight: 800,
                    border: isActive ? '1.5px solid #2563EB' : '1px solid #E2E8F0',
                    background: isActive ? '#EFF6FF' : '#FFFFFF',
                    color: isActive ? '#2563EB' : '#64748B',
                    cursor: 'pointer', transition: 'all 0.15s ease'
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Search Input & Limit Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ position: 'relative', width: '240px' }}>
              <GlassSearchIcon size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                type="text"
                placeholder="Search phone number..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="rounded-input"
                style={{ paddingRight: '36px', height: '38px', borderRadius: '10px', fontSize: '13px' }}
              />
            </div>

            <select
              value={limit}
              onChange={e => { setLimit(Number(e.target.value)); setPage(1); }}
              style={{
                height: '38px',
                padding: '0 12px',
                borderRadius: '10px',
                border: '1px solid #E2E8F0',
                background: '#FFFFFF',
                fontSize: '12.5px',
                fontWeight: 700,
                color: '#475569',
                cursor: 'pointer'
              }}
            >
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                <th style={{ padding: '14px 24px', fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em', textTransform: 'uppercase', width: '60px' }}>#</th>
                <th style={{ padding: '14px 20px', fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em', textTransform: 'uppercase' }}>RECIPIENT NUMBER</th>
                <th style={{ padding: '14px 20px', fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em', textTransform: 'uppercase' }}>DELIVERY STATUS</th>
                <th style={{ padding: '14px 20px', fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em', textTransform: 'uppercase' }}>ERROR LOG</th>
                <th style={{ padding: '14px 20px', fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em', textTransform: 'uppercase' }}>TIMESTAMP</th>
                <th style={{ padding: '14px 24px', fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em', textTransform: 'uppercase', textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: '#94A3B8' }}>
                    <div style={{ width: '28px', height: '28px', border: '3px solid #E2E8F0', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '13.5px' }}>Loading numbers in this batch…</p>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: '#94A3B8' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                      <GlassSearchIcon size={24} />
                    </div>
                    <h4 style={{ margin: '0 0 4px', color: '#0F172A', fontSize: '15px', fontWeight: 800 }}>No Numbers Found</h4>
                    <p style={{ margin: 0, fontSize: '13px' }}>Try switching the status filter or clearing your search term.</p>
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => {
                  const globalIdx = (page - 1) * limit + idx + 1;
                  const isDelivered = item.status === 'sent' || item.status === 'success';
                  const isPending = item.status === 'pending';

                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid #F1F5F9' }} className="hover-row">
                      <td style={{ padding: '16px 24px', fontSize: '12px', fontWeight: 700, color: '#94A3B8' }}>
                        {globalIdx}
                      </td>

                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A', fontFamily: 'var(--font-mono)' }}>
                            +{item.number}
                          </span>
                        </div>
                      </td>

                      <td style={{ padding: '16px 20px' }}>
                        {isDelivered ? (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 9px', borderRadius: '8px', fontSize: '11px', fontWeight: 800,
                            background: '#D1FAE5', color: '#065F46'
                          }}>
                            <GlassCheckCircleIcon size={13} />
                            <span>Delivered</span>
                          </span>
                        ) : isPending ? (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 9px', borderRadius: '8px', fontSize: '11px', fontWeight: 800,
                            background: '#FEF3C7', color: '#92400E'
                          }}>
                            <GlassPendingIcon size={13} />
                            <span>Pending</span>
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 9px', borderRadius: '8px', fontSize: '11px', fontWeight: 800,
                            background: '#FEE2E2', color: '#991B1B'
                          }}>
                            <GlassCancelIcon size={13} />
                            <span>Failed</span>
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '16px 20px', fontSize: '12px', color: item.error ? '#DC2626' : isPending ? '#D97706' : '#94A3B8', fontWeight: item.error ? 700 : 500 }}>
                        {item.error || (isPending ? 'Queued for dispatch' : 'None')}
                      </td>

                      <td style={{ padding: '16px 20px', fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>

                      <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                        <button
                          onClick={() => copySingleNumber(item.number, item.id)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: copiedNumberId === item.id ? '#D1FAE5' : '#F8FAFC',
                            border: `1px solid ${copiedNumberId === item.id ? '#A7F3D0' : '#E2E8F0'}`,
                            borderRadius: '8px',
                            padding: '4px 10px',
                            fontSize: '11px',
                            fontWeight: 800,
                            color: copiedNumberId === item.id ? '#065F46' : '#475569',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                          title="Copy phone number"
                        >
                          <GlassCopyIcon size={12} />
                          <span>{copiedNumberId === item.id ? 'Copied' : 'Copy'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Strip */}
        {totalPages > 1 && (
          <div style={{ padding: '18px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', borderTop: '1px solid #F1F5F9' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748B' }}>
              Showing {items.length > 0 ? (page - 1) * limit + 1 : 0} - {Math.min(page * limit, totalItems)} of {totalItems.toLocaleString()} numbers
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="btn-outline"
                style={{ padding: '6px 14px', fontSize: '12px', fontWeight: 700, borderRadius: '8px' }}
              >
                ← Previous
              </button>
              
              <div style={{ display: 'flex', gap: '4px' }}>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum = i + 1;
                  if (totalPages > 5) {
                    if (page > 3) pageNum = page - 2 + i;
                    if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                  }
                  const isCurrent = pageNum === page;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        border: isCurrent ? '1.5px solid #2563EB' : '1px solid #E2E8F0',
                        background: isCurrent ? '#EFF6FF' : '#FFFFFF',
                        color: isCurrent ? '#2563EB' : '#64748B',
                        fontSize: '12px',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="btn-outline"
                style={{ padding: '6px 14px', fontSize: '12px', fontWeight: 700, borderRadius: '8px' }}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
