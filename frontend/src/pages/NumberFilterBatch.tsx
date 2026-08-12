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
  RefreshIcon,
  DeviceIcon,
  CalendarIcon,
  FilterIcon
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
  const [copiedNumberId, setCopiedNumberId] = useState<string | null>(null);
  const [copiedJidId, setCopiedJidId] = useState<string | null>(null);
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

  // Single Number Copy
  const handleCopySingle = async (num: string, itemId: string) => {
    const ok = await copyToClipboard(num);
    if (ok) {
      setCopiedNumberId(itemId);
      setTimeout(() => setCopiedNumberId(null), 1500);
    }
  };

  // Single JID Copy
  const handleCopyJid = async (jid: string, itemId: string) => {
    const ok = await copyToClipboard(jid);
    if (ok) {
      setCopiedJidId(itemId);
      setTimeout(() => setCopiedJidId(null), 1500);
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
      <div style={{ padding: '80px 24px', textAlign: 'center', color: '#64748B' }}>
        <div style={{ width: '32px', height: '32px', border: '3px solid #DBEAFE', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <span style={{ fontSize: '14px', fontWeight: 600 }}>Loading batch verification results...</span>
      </div>
    );
  }

  if (!batch && !loading) {
    return (
      <div className="card animate-in" style={{ padding: '48px', textAlign: 'center', maxWidth: '520px', margin: '40px auto' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <XCircleIcon size={24} color="#DC2626" />
        </div>
        <h3 style={{ margin: '0 0 8px', color: '#0F172A', fontSize: '18px', fontWeight: 800 }}>Batch Not Found</h3>
        <p style={{ color: '#64748B', fontSize: '14px', margin: '0 0 24px' }}>This filter batch may have been deleted or does not exist.</p>
        <button onClick={() => navigate('/filter')} className="btn-primary" style={{ padding: '10px 24px', borderRadius: '12px', fontSize: '13.5px', fontWeight: 700 }}>
          ← Return to Number Filter Hub
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
      
      {/* Top Header Card */}
      <div className="card" style={{ padding: '24px 28px', background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)', border: '1px solid #E2E8F0' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
          
          {/* Left: Breadcrumbs, Title, and Meta Tags */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            
            {/* Breadcrumb Pill */}
            <button
              onClick={() => navigate('/filter')}
              style={{
                alignSelf: 'flex-start',
                background: '#EFF6FF',
                border: '1px solid #DBEAFE',
                borderRadius: '8px',
                padding: '6px 12px',
                color: '#2563EB',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s'
              }}
            >
              <span>←</span>
              <span>Back to Filter Hub</span>
            </button>

            {/* Batch Title & Status Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
                {batch?.name}
              </h1>

              {isProcessing ? (
                <span className="badge badge-warning" style={{ fontSize: '11.5px', fontWeight: 800, padding: '4px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <RefreshIcon size={13} color="#D97706" style={{ animation: 'spin 1.5s linear infinite' }} />
                  <span>Verifying in Background ({progressPercent}%)</span>
                </span>
              ) : (
                <span className="badge badge-success" style={{ fontSize: '11.5px', fontWeight: 800, padding: '4px 12px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <CheckCircleIcon size={14} color="#15803D" />
                  <span>Completed</span>
                </span>
              )}
            </div>

            {/* Metadata Tags Strip */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginTop: '2px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#475569', background: '#FFFFFF', padding: '4px 10px', borderRadius: '8px', border: '1px solid #CBD5E1' }}>
                <DeviceIcon size={14} color="#2563EB" />
                <span>Instance: <strong style={{ color: '#0F172A', fontFamily: 'var(--font-mono)' }}>{batch?.instanceId}</strong></span>
              </div>

              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#475569', background: '#FFFFFF', padding: '4px 10px', borderRadius: '8px', border: '1px solid #CBD5E1' }}>
                <CalendarIcon size={14} color="#64748B" />
                <span>Created: {new Date(batch?.createdAt || '').toLocaleString()}</span>
              </div>
            </div>

          </div>

          {/* Right: Global Forward Action */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => fetchBatchDetails(true)}
              style={{
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '12px',
                padding: '10px 16px',
                fontSize: '13px',
                fontWeight: 700,
                color: '#475569',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
              }}
            >
              <RefreshIcon size={14} color="#475569" /> Refresh
            </button>

            {batch && batch.validCount > 0 && (
              <button
                onClick={handleSendToBroadcast}
                className="btn-primary"
                style={{
                  background: 'linear-gradient(135deg, #1E40AF 0%, #2563EB 100%)',
                  border: 'none',
                  color: '#FFFFFF',
                  borderRadius: '12px',
                  padding: '10px 20px',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 15px rgba(37, 99, 235, 0.3)'
                }}
              >
                <SendIcon size={16} color="#FFFFFF" /> Forward {batch.validCount.toLocaleString()} Valid to Broadcast Hub
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Live Asynchronous Processing Banner */}
      {isProcessing && (
        <div style={{ background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)', border: '1px solid #BFDBFE', borderRadius: '16px', padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#1E40AF', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <RefreshIcon size={15} color="#1E40AF" style={{ animation: 'spin 1.5s linear infinite' }} />
              <span>Background Verification Active: {processedCount.toLocaleString()} of {totalCount.toLocaleString()} verified</span>
            </span>
            <span style={{ fontSize: '14px', fontWeight: 800, color: '#2563EB', fontFamily: 'var(--font-mono)' }}>
              {progressPercent}%
            </span>
          </div>
          <div style={{ height: '8px', background: 'rgba(255,255,255,0.7)', borderRadius: '9999px', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'linear-gradient(90deg, #2563EB, #059669)', width: `${progressPercent}%`, transition: 'width 0.4s ease' }} />
          </div>
          <span style={{ fontSize: '12px', color: '#3B82F6', fontWeight: 500 }}>
            All numbers are permanently stored in your database. You can safely navigate away or explore other pages while this batch completes.
          </span>
        </div>
      )}

      {/* KPI Stats Row */}
      <div className="stats-grid">
        
        {/* Total Stored */}
        <div className="card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#64748B' }}>Total Numbers</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FilterIcon size={16} color="#2563EB" />
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
            <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#64748B' }}>Active WhatsApp</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircleIcon size={16} color="#059669" />
            </div>
          </div>
          <div>
            <span style={{ fontSize: '24px', fontWeight: 800, color: '#059669', letterSpacing: '-0.02em' }}>
              {batch?.validCount.toLocaleString()}
            </span>
            <span style={{ fontSize: '12px', color: '#059669', fontWeight: 600, marginTop: '4px', display: 'block' }}>
              {validRatio}% Deliverable rate
            </span>
          </div>
        </div>

        {/* Non-WhatsApp */}
        <div className="card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#64748B' }}>Non-WhatsApp</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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

        {/* Accuracy SLA */}
        <div className="card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#64748B' }}>Accuracy SLA</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckIcon size={16} color="#D97706" />
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
                {validRatio}%
              </span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: validRatio >= 75 ? '#16A34A' : '#D97706' }}>
                {validRatio >= 75 ? 'High Quality' : 'Moderate'}
              </span>
            </div>
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
              { key: 'all', label: `All Numbers (${batch?.totalCount.toLocaleString()})`, icon: null },
              { key: 'valid', label: `Active WhatsApp (${batch?.validCount.toLocaleString()})`, icon: <CheckCircleIcon size={13} color={statusFilter === 'valid' ? '#FFFFFF' : '#059669'} /> },
              { key: 'invalid', label: `Non-WhatsApp (${batch?.invalidCount.toLocaleString()})`, icon: <XCircleIcon size={13} color={statusFilter === 'invalid' ? '#FFFFFF' : '#DC2626'} /> }
            ].map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => {
                  setStatusFilter(key as any);
                  setPage(1);
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  border: statusFilter === key ? 'none' : '1px solid #CBD5E1',
                  background: statusFilter === key ? '#2563EB' : '#FFFFFF',
                  color: statusFilter === key ? '#FFFFFF' : '#475569',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: statusFilter === key ? '0 4px 12px rgba(37, 99, 235, 0.25)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                {icon}
                <span>{label}</span>
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
                    background: copiedValid ? '#D1FAE5' : '#FFFFFF',
                    border: `1px solid ${copiedValid ? '#BBF7D0' : '#CBD5E1'}`,
                    borderRadius: '10px',
                    padding: '8px 14px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    color: copiedValid ? '#15803D' : '#0F172A',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s'
                  }}
                >
                  {copiedValid ? <CheckIcon size={14} color="#15803D" /> : <CopyIcon size={14} color="#64748B" />}
                  <span>{copiedValid ? 'Copied Valid List!' : 'Copy Active Numbers'}</span>
                </button>

                <button
                  onClick={() => handleExport('valid')}
                  disabled={exporting}
                  style={{
                    background: '#D1FAE5',
                    border: '1px solid #A7F3D0',
                    borderRadius: '10px',
                    padding: '8px 14px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    color: '#065F46',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <DownloadIcon size={14} color="#065F46" />
                  <span>Export Active CSV</span>
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
                  fontSize: '12.5px',
                  fontWeight: 700,
                  color: '#991B1B',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <DownloadIcon size={14} color="#991B1B" />
                <span>Export Inactive CSV</span>
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
                fontSize: '12.5px',
                fontWeight: 700,
                color: '#2563EB',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <DownloadIcon size={14} color="#2563EB" />
              <span>Export Full CSV</span>
            </button>
          </div>

        </div>

        {/* Search & Rows Per Page Controls */}
        <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
          <div style={{ position: 'relative', width: '300px' }}>
            <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }}>
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
                padding: '9px 12px 9px 36px',
                borderRadius: '10px',
                border: '1.5px solid #CBD5E1',
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
                padding: '7px 12px',
                borderRadius: '8px',
                border: '1.5px solid #CBD5E1',
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
              <tr style={{ background: '#F8FAFC', borderBottom: '1.5px solid #E2E8F0' }}>
                <th style={{ padding: '12px 24px', fontSize: '11px', fontWeight: 800, color: '#64748B', width: '60px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>#</th>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>PHONE NUMBER</th>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>WHATSAPP JID</th>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>VERIFIED AT</th>
                <th style={{ padding: '12px 24px', fontSize: '11px', fontWeight: 800, color: '#64748B', textAlign: 'right', textTransform: 'uppercase', letterSpacing: '0.04em' }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: '48px 16px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                    <div style={{ width: '24px', height: '24px', border: '2px solid #DBEAFE', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 10px' }} />
                    <span>Loading numbers...</span>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '48px 16px', textAlign: 'center', color: '#94A3B8', fontSize: '13.5px' }}>
                    No phone numbers found matching your criteria.
                  </td>
                </tr>
              ) : (
                items.map((item, index) => {
                  const globalIdx = (page - 1) * limit + index + 1;
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s' }}>
                      <td style={{ padding: '14px 24px', fontSize: '12px', fontWeight: 700, color: '#94A3B8' }}>
                        {globalIdx.toString().padStart(2, '0')}
                      </td>

                      {/* Phone Number with Copy Button */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A', fontFamily: 'var(--font-mono)' }}>
                            +{item.number}
                          </span>
                          <button
                            onClick={() => handleCopySingle(item.number, item.id)}
                            title="Copy Phone Number"
                            style={{
                              background: copiedNumberId === item.id ? '#D1FAE5' : '#F1F5F9',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '3px 6px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              color: copiedNumberId === item.id ? '#059669' : '#64748B'
                            }}
                          >
                            {copiedNumberId === item.id ? <CheckIcon size={12} color="#059669" /> : <CopyIcon size={12} />}
                          </button>
                        </div>
                      </td>

                      {/* WhatsApp JID with Copy Button */}
                      <td style={{ padding: '14px 16px' }}>
                        {item.jid ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                            <code style={{ fontSize: '12px', color: '#475569', fontFamily: 'var(--font-mono)' }}>
                              {item.jid}
                            </code>
                            <button
                              onClick={() => handleCopyJid(item.jid!, item.id)}
                              title="Copy WhatsApp JID"
                              style={{
                                background: copiedJidId === item.id ? '#D1FAE5' : '#F1F5F9',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '3px 6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                color: copiedJidId === item.id ? '#059669' : '#64748B'
                              }}
                            >
                              {copiedJidId === item.id ? <CheckIcon size={12} color="#059669" /> : <CopyIcon size={12} />}
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: '#CBD5E1', fontSize: '12px' }}>—</span>
                        )}
                      </td>

                      {/* Timestamp */}
                      <td style={{ padding: '14px 16px', fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>

                      {/* Status Badge */}
                      <td style={{ padding: '14px 24px', textAlign: 'right' }}>
                        {item.exists ? (
                          <span className="badge badge-success" style={{ fontSize: '11.5px', padding: '5px 12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircleIcon size={13} color="#15803D" /> Active WhatsApp
                          </span>
                        ) : (
                          <span className="badge badge-danger" style={{ fontSize: '11.5px', padding: '5px 12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <XCircleIcon size={13} color="#DC2626" /> Non-WhatsApp
                          </span>
                        )}
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
