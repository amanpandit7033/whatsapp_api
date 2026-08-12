import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CheckCircleIcon,
  XCircleIcon,
  CopyIcon,
  DownloadIcon,
  SendIcon,
  CheckIcon,
  SearchIcon,
  RefreshIcon
} from '../components/Icons';
import { copyToClipboard } from '../utils/clipboard';

interface FilterItem {
  id: string;
  number: string;
  exists: boolean;
  jid: string | null;
  createdAt: string;
}

interface BatchInfo {
  id: string;
  name: string;
  instanceId: string;
  totalCount: number;
  validCount: number;
  invalidCount: number;
  status: string; // 'processing', 'completed', 'failed'
  createdAt: string;
}

export const NumberFilterBatch = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [batch, setBatch] = useState<BatchInfo | null>(null);
  const [items, setItems] = useState<FilterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'valid' | 'invalid'>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [copiedValid, setCopiedValid] = useState(false);
  const [exporting, setExporting] = useState(false);

  const pollIntervalRef = useRef<any>(null);

  useEffect(() => {
    fetchBatchDetails();
  }, [id, page, limit, statusFilter, search]);

  // Background live polling if batch is still processing
  useEffect(() => {
    if (batch && batch.status === 'processing') {
      if (!pollIntervalRef.current) {
        pollIntervalRef.current = setInterval(() => {
          fetchBatchDetails(false);
        }, 2500);
      }
    } else {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [batch?.status, id, page, limit, statusFilter, search]);

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

      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/filter/batches/${id}?${query}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      if (res.status === 401) {
        navigate('/login');
        return;
      }

      const data = await res.json();
      if (data.batch) {
        setBatch(data.batch);
        setItems(data.items || []);
        setTotalItems(data.totalItems || 0);
        setTotalPages(data.totalPages || 1);
      }
    } catch (e) {
      console.error('Failed to fetch batch items', e);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Export full list from server
  const handleExport = async (type: 'all' | 'valid' | 'invalid') => {
    if (!id || !batch) return;
    setExporting(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/filter/batches/${id}/export?status=${type}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      const exportItems: FilterItem[] = data.items || [];

      let csv = 'Phone Number,Status,WhatsApp JID,Checked At\n';
      exportItems.forEach((i) => {
        csv += `+${i.number},${i.exists ? 'Active WhatsApp' : 'Non-WhatsApp'},${i.jid || ''},"${new Date(i.createdAt).toLocaleString()}"\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${batch.name.replace(/\s+/g, '_')}_${type}_numbers.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Failed to export batch');
    } finally {
      setExporting(false);
    }
  };

  // Copy all valid numbers in batch
  const handleCopyValid = async () => {
    if (!id) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/filter/batches/${id}/export?status=valid`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      const validNumbers = (data.items || []).map((i: FilterItem) => i.number).join('\n');
      if (validNumbers) {
        await copyToClipboard(validNumbers);
        setCopiedValid(true);
        setTimeout(() => setCopiedValid(false), 2000);
      }
    } catch (e) {
      alert('Failed to copy numbers');
    }
  };

  // Send valid numbers to Broadcast Hub
  const handleSendToBroadcast = async () => {
    if (!id) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/filter/batches/${id}/export?status=valid`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      const validNumbers = (data.items || []).map((i: FilterItem) => i.number).join('\n');
      navigate('/broadcast', { state: { prefilledNumbers: validNumbers } });
    } catch (e) {
      alert('Failed to forward numbers to broadcast');
    }
  };

  if (!batch && loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: '#64748B' }}>
        <div style={{ width: '28px', height: '28px', border: '3px solid #DBEAFE', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <span>Loading batch details...</span>
      </div>
    );
  }

  if (!batch && !loading) {
    return (
      <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
        <h3 style={{ margin: '0 0 10px', color: '#0F172A' }}>Batch Not Found</h3>
        <p style={{ color: '#64748B', marginBottom: '20px' }}>This filter batch may have been deleted or does not exist.</p>
        <button onClick={() => navigate('/filter')} className="btn-primary" style={{ padding: '10px 20px', borderRadius: '10px' }}>
          Back to Number Filter
        </button>
      </div>
    );
  }

  const processedCount = (batch?.validCount || 0) + (batch?.invalidCount || 0);
  const totalCount = batch?.totalCount || 1;
  const progressPercent = Math.min(100, Math.round((processedCount / totalCount) * 100));
  const validRatio = processedCount > 0 ? Math.round(((batch?.validCount || 0) / processedCount) * 100) : 0;
  const isProcessing = batch?.status === 'processing';

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top Breadcrumb & Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <button
            onClick={() => navigate('/filter')}
            style={{
              background: 'none',
              border: 'none',
              color: '#2563EB',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: 0,
              marginBottom: '6px'
            }}
          >
            ← Back to Filter Hub
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
              {batch?.name}
            </h2>
            {isProcessing ? (
              <span className="badge badge-warning" style={{ fontSize: '11px', fontWeight: 800, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#D97706', animation: 'pulse 1.2s infinite' }} />
                Filtering in Background ({progressPercent}%)
              </span>
            ) : (
              <span className="badge badge-success" style={{ fontSize: '11px', fontWeight: 800, padding: '4px 10px' }}>
                ✓ Completed
              </span>
            )}
          </div>
          <span style={{ fontSize: '12px', color: '#64748B', marginTop: '4px', display: 'block' }}>
            Instance: <code style={{ color: '#2563EB', fontWeight: 700 }}>{batch?.instanceId}</code> • Created: {new Date(batch?.createdAt || '').toLocaleString()}
          </span>
        </div>

        {/* Global Action: Send to Broadcast Hub */}
        {batch && batch.validCount > 0 && (
          <button
            onClick={handleSendToBroadcast}
            style={{
              background: 'linear-gradient(135deg, #1E40AF 0%, #2563EB 100%)',
              border: 'none',
              color: '#FFFFFF',
              borderRadius: '12px',
              padding: '10px 20px',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 15px rgba(37, 99, 235, 0.3)'
            }}
          >
            <SendIcon size={16} color="#FFFFFF" /> Forward {batch.validCount.toLocaleString()} Valid to Broadcast Hub
          </button>
        )}
      </div>

      {/* Live Asynchronous Processing Banner */}
      {isProcessing && (
        <div style={{ background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)', border: '1px solid #BFDBFE', borderRadius: '16px', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#1E40AF', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ⚡ Background Verification Active: {processedCount.toLocaleString()} of {totalCount.toLocaleString()} verified
            </span>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#2563EB', fontFamily: 'var(--font-mono)' }}>
              {progressPercent}%
            </span>
          </div>
          <div style={{ height: '8px', background: 'rgba(255,255,255,0.7)', borderRadius: '9999px', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'linear-gradient(90deg, #2563EB, #059669)', width: `${progressPercent}%`, transition: 'width 0.4s ease' }} />
          </div>
          <span style={{ fontSize: '11.5px', color: '#3B82F6', fontWeight: 500 }}>
            All numbers are already stored in your database. You can safely navigate away, refresh, or view verified results in real-time.
          </span>
        </div>
      )}

      {/* KPI Stats Row */}
      <div className="stats-grid">
        {/* Total Processed */}
        <div className="card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748B' }}>Total Numbers</span>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <RefreshIcon size={16} color="#2563EB" />
            </div>
          </div>
          <div>
            <span style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
              {batch?.totalCount.toLocaleString()}
            </span>
            <span style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px', display: 'block' }}>Stored in database</span>
          </div>
        </div>

        {/* Valid WhatsApp */}
        <div className="card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748B' }}>Active WhatsApp</span>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircleIcon size={16} color="#059669" />
            </div>
          </div>
          <div>
            <span style={{ fontSize: '24px', fontWeight: 800, color: '#059669', letterSpacing: '-0.02em' }}>
              {batch?.validCount.toLocaleString()}
            </span>
            <span style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px', display: 'block' }}>Registered accounts</span>
          </div>
        </div>

        {/* Non-WhatsApp */}
        <div className="card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748B' }}>Non-WhatsApp</span>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <XCircleIcon size={16} color="#DC2626" />
            </div>
          </div>
          <div>
            <span style={{ fontSize: '24px', fontWeight: 800, color: '#DC2626', letterSpacing: '-0.02em' }}>
              {batch?.invalidCount.toLocaleString()}
            </span>
            <span style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px', display: 'block' }}>Inactive / Unregistered</span>
          </div>
        </div>

        {/* Quality SLA */}
        <div className="card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748B' }}>Accuracy SLA</span>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckIcon size={16} color="#D97706" />
            </div>
          </div>
          <div>
            <span style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
              {validRatio}%
            </span>
            <div style={{ height: '5px', background: '#F1F5F9', borderRadius: '9999px', marginTop: '8px', overflow: 'hidden' }}>
              <div style={{ height: '100%', background: '#059669', width: `${validRatio}%`, transition: 'width 0.3s' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Filter Table Card */}
      <div className="card" style={{ padding: '24px 0' }}>
        
        {/* Filter Tabs & Search Strip */}
        <div style={{ padding: '0 24px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          
          {/* Status Tabs */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { key: 'all', label: `All Numbers (${batch?.totalCount.toLocaleString()})` },
              { key: 'valid', label: `🟢 Active WhatsApp (${batch?.validCount.toLocaleString()})` },
              { key: 'invalid', label: `🔴 Non-WhatsApp (${batch?.invalidCount.toLocaleString()})` }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => {
                  setStatusFilter(key as any);
                  setPage(1);
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  border: statusFilter === key ? 'none' : '1px solid #E2E8F0',
                  background: statusFilter === key ? '#2563EB' : '#FFFFFF',
                  color: statusFilter === key ? '#FFFFFF' : '#64748B',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Export & Copy Action Group */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {batch && batch.validCount > 0 && (
              <>
                <button
                  onClick={handleCopyValid}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '10px',
                    padding: '8px 14px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#0F172A',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {copiedValid ? <CheckIcon size={14} color="#059669" /> : <CopyIcon size={14} color="#64748B" />}
                  {copiedValid ? 'Copied WhatsApp Numbers!' : 'Copy Active Numbers'}
                </button>

                <button
                  onClick={() => handleExport('valid')}
                  disabled={exporting}
                  style={{
                    background: '#D1FAE5',
                    border: '1px solid #A7F3D0',
                    borderRadius: '10px',
                    padding: '8px 14px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#065F46',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <DownloadIcon size={14} color="#065F46" /> Export Valid CSV
                </button>
              </>
            )}

            {batch && batch.invalidCount > 0 && (
              <button
                onClick={() => handleExport('invalid')}
                disabled={exporting}
                style={{
                  background: '#FEE2E2',
                  border: '1px solid #FECACA',
                  borderRadius: '10px',
                  padding: '8px 14px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#991B1B',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <DownloadIcon size={14} color="#991B1B" /> Export Inactive CSV
              </button>
            )}

            <button
              onClick={() => handleExport('all')}
              disabled={exporting}
              style={{
                background: '#EFF6FF',
                border: '1px solid #DBEAFE',
                borderRadius: '10px',
                padding: '8px 14px',
                fontSize: '12px',
                fontWeight: 700,
                color: '#2563EB',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <DownloadIcon size={14} color="#2563EB" /> Export All CSV
            </button>
          </div>

        </div>

        {/* Search & Rows Per Page Controls */}
        <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
          <div style={{ position: 'relative', width: '280px' }}>
            <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }}>
              <SearchIcon size={15} />
            </div>
            <input
              type="text"
              placeholder="Search phone number in batch..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#64748B', fontWeight: 600 }}>
            <span>Rows per page:</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                color: '#0F172A',
                fontWeight: 700,
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={250}>250</option>
            </select>
          </div>
        </div>

        {/* Paginated Numbers Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                <th style={{ padding: '12px 24px', fontSize: '11px', fontWeight: 800, color: '#64748B', width: '60px' }}>#</th>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 800, color: '#64748B' }}>PHONE NUMBER</th>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 800, color: '#64748B' }}>WHATSAPP JID</th>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 800, color: '#64748B' }}>VERIFIED AT</th>
                <th style={{ padding: '12px 24px', fontSize: '11px', fontWeight: 800, color: '#64748B', textAlign: 'right' }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                    <div style={{ width: '22px', height: '22px', border: '2px solid #DBEAFE', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 8px' }} />
                    <span>Loading numbers...</span>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>
                    No phone numbers found matching your criteria.
                  </td>
                </tr>
              ) : (
                items.map((item, index) => {
                  const globalIdx = (page - 1) * limit + index + 1;
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '14px 24px', fontSize: '12px', fontWeight: 700, color: '#94A3B8' }}>
                        {globalIdx.toString().padStart(2, '0')}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '13.5px', fontWeight: 700, color: '#0F172A', fontFamily: 'var(--font-mono)' }}>
                        +{item.number}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '12.5px', color: '#64748B', fontFamily: 'var(--font-mono)' }}>
                        {item.jid || '—'}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '12px', color: '#64748B' }}>
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td style={{ padding: '14px 24px', textAlign: 'right' }}>
                        <span className={`badge ${item.exists ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '11.5px', padding: '5px 12px' }}>
                          {item.exists ? '✓ Active WhatsApp' : '✕ Non-WhatsApp'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderTop: '1px solid #E2E8F0', background: '#FFFFFF' }}>
          <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>
            Showing {totalItems === 0 ? 0 : (page - 1) * limit + 1} to {Math.min(page * limit, totalItems)} of {totalItems.toLocaleString()} numbers
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                background: page <= 1 ? '#F8FAFC' : '#FFFFFF',
                color: page <= 1 ? '#94A3B8' : '#0F172A',
                fontSize: '12px',
                fontWeight: 700,
                cursor: page <= 1 ? 'not-allowed' : 'pointer'
              }}
            >
              Previous
            </button>

            <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', padding: '0 8px' }}>
              Page {page} of {totalPages}
            </span>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                background: page >= totalPages ? '#F8FAFC' : '#FFFFFF',
                color: page >= totalPages ? '#94A3B8' : '#0F172A',
                fontSize: '12px',
                fontWeight: 700,
                cursor: page >= totalPages ? 'not-allowed' : 'pointer'
              }}
            >
              Next
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
