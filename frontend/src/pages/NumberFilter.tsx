import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  FilterIcon,
  CheckCircleIcon,
  XCircleIcon,
  DownloadIcon,
  UploadIcon,
  WarningIcon,
  TrashIcon,
  EyeIcon,
  RefreshIcon,
  XIcon
} from '../components/Icons';

interface FilterBatch {
  id: string;
  name: string;
  instanceId: string;
  totalCount: number;
  validCount: number;
  invalidCount: number;
  status: string;
  createdAt: string;
}

export const NumberFilter = () => {
  const navigate = useNavigate();
  const [instances, setInstances] = useState<any[]>([]);
  const [selectedInstance, setSelectedInstance] = useState('');
  const [batchName, setBatchName] = useState('');
  const [rawInput, setRawInput] = useState('');
  const [delayMs, setDelayMs] = useState(100);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Saved Batches state
  const [batches, setBatches] = useState<FilterBatch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [batchPage, setBatchPage] = useState(1);
  const [batchTotalPages, setBatchTotalPages] = useState(1);
  const [batchTotalCount, setBatchTotalCount] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchInstances();
    fetchBatches();
  }, [batchPage]);

  const fetchInstances = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/instances`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }
      const data = await res.json();
      const connected = (data.instances || []).filter((i: any) => i.status === 'connected');
      setInstances(connected);
      if (connected.length > 0 && !selectedInstance) {
        setSelectedInstance(connected[0].id);
      }
    } catch (e) {
      console.error('Failed to load instances', e);
    }
  };

  const fetchBatches = async () => {
    setLoadingBatches(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/filter/batches?page=${batchPage}&limit=10`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.status === 401) return;
      const data = await res.json();
      if (data.batches) {
        setBatches(data.batches);
        setBatchTotalPages(data.totalPages || 1);
        setBatchTotalCount(data.totalCount || 0);
      }
    } catch (e) {
      console.error('Failed to load batches', e);
    } finally {
      setLoadingBatches(false);
    }
  };

  // Handle File Upload (TXT / CSV)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        const extracted = content
          .split(/[\r\n,;]+/)
          .map((n) => n.replace(/\D/g, '').trim())
          .filter((n) => n.length >= 7);

        const unique = Array.from(new Set(extracted));
        if (unique.length > 0) {
          setRawInput((prev) => (prev ? prev + '\n' + unique.join('\n') : unique.join('\n')));
        }
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Start Batch Validation
  const handleCreateBatch = async () => {
    setErrorMsg(null);

    if (!selectedInstance) {
      setErrorMsg('Please select a connected WhatsApp instance.');
      return;
    }

    const numbers = rawInput
      .split(/[\r\n,;]+/)
      .map((n) => n.replace(/\D/g, '').trim())
      .filter((n) => n.length >= 7);

    const uniqueNumbers = Array.from(new Set(numbers));

    if (uniqueNumbers.length === 0) {
      setErrorMsg('Please enter or upload at least one valid phone number.');
      return;
    }

    if (uniqueNumbers.length > 10000) {
      setErrorMsg('Please limit verification to a maximum of 10,000 numbers per batch.');
      return;
    }

    setIsProcessing(true);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/filter/batches/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          instanceId: selectedInstance,
          name: batchName.trim() || undefined,
          numbers: uniqueNumbers,
          delayMs
        })
      });

      if (res.status === 401) {
        navigate('/login');
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to process numbers filter batch');
      } else {
        setRawInput('');
        setBatchName('');
        setIsCreateModalOpen(false);
        fetchBatches();
        // Redirect directly to the dedicated batch details page
        if (data.batchId) {
          navigate(`/filter/batch/${data.batchId}`);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Server error while checking numbers');
    } finally {
      setIsProcessing(false);
    }
  };

  // Delete a batch
  const handleDeleteBatch = async (batchId: string) => {
    if (!confirm('Are you sure you want to delete this filter batch and all its numbers?')) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/filter/batches/${batchId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        fetchBatches();
      }
    } catch (e) {
      alert('Failed to delete batch');
    }
  };

  // Export batch
  const handleExportBatch = async (b: FilterBatch) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/filter/batches/${b.id}/export?status=all`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      const exportItems = data.items || [];

      let csv = 'Phone Number,Status,WhatsApp JID\n';
      exportItems.forEach((i: any) => {
        csv += `+${i.number},${i.exists ? 'Active WhatsApp' : 'Non-WhatsApp'},${i.jid || ''}\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${b.name.replace(/\s+/g, '_')}_numbers.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Failed to export batch');
    }
  };

  // Total stats from all batches
  const totalVerifiedAcrossBatches = batches.reduce((acc, b) => acc + b.totalCount, 0);
  const totalValidAcrossBatches = batches.reduce((acc, b) => acc + b.validCount, 0);
  const totalInvalidAcrossBatches = batches.reduce((acc, b) => acc + b.invalidCount, 0);

  const inputNumberCount = rawInput
    .split(/[\r\n,;]+/)
    .map((n) => n.replace(/\D/g, '').trim())
    .filter((n) => n.length >= 7).length;

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Page Header Bar with Action Button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
            WhatsApp Number Filter & Batch Validator
          </h2>
          <p style={{ color: '#64748B', fontSize: '14px', margin: 0, fontWeight: 500 }}>
            Filter thousands of phone numbers into categorized batches, view paginated results, and export clean campaign lists.
          </p>
        </div>

        {/* Primary Action: Open Create Batch Modal */}
        <button
          onClick={() => {
            setErrorMsg(null);
            setIsCreateModalOpen(true);
          }}
          style={{
            background: 'linear-gradient(135deg, #1E40AF 0%, #2563EB 100%)',
            border: 'none',
            color: '#FFFFFF',
            borderRadius: '12px',
            padding: '12px 20px',
            fontSize: '13.5px',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 15px rgba(37, 99, 235, 0.3)',
            transition: 'all 0.2s ease'
          }}
        >
          <FilterIcon size={16} color="#FFFFFF" /> Create New Filter Batch
        </button>
      </div>

      {/* KPI Stats Row */}
      <div className="stats-grid">
        {/* Total Filter Batches */}
        <div className="card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748B' }}>Total Batches</span>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FilterIcon size={16} color="#2563EB" />
            </div>
          </div>
          <div>
            <span style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
              {batchTotalCount.toLocaleString()}
            </span>
            <span style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px', display: 'block' }}>Saved filter runs</span>
          </div>
        </div>

        {/* Total Numbers Checked */}
        <div className="card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748B' }}>Numbers Scanned</span>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <RefreshIcon size={16} color="#2563EB" />
            </div>
          </div>
          <div>
            <span style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
              {totalVerifiedAcrossBatches.toLocaleString()}
            </span>
            <span style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px', display: 'block' }}>Current page volume</span>
          </div>
        </div>

        {/* Active WhatsApp */}
        <div className="card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748B' }}>Active WhatsApp</span>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircleIcon size={16} color="#059669" />
            </div>
          </div>
          <div>
            <span style={{ fontSize: '24px', fontWeight: 800, color: '#059669', letterSpacing: '-0.02em' }}>
              {totalValidAcrossBatches.toLocaleString()}
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
              {totalInvalidAcrossBatches.toLocaleString()}
            </span>
            <span style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px', display: 'block' }}>Inactive numbers</span>
          </div>
        </div>
      </div>

      {/* Full-Width Saved Batches Table Card */}
      <div className="card" style={{ padding: '24px 0' }}>
        
        {/* Table Header Strip */}
        <div style={{ padding: '0 24px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
              Saved Filter Batches ({batchTotalCount})
            </h3>
            <span style={{ fontSize: '12px', color: '#64748B' }}>
              Click <strong>View Details</strong> to browse all numbers in a dedicated paginated view.
            </span>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={fetchBatches}
              style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 700,
                color: '#475569',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <RefreshIcon size={13} color="#475569" /> Refresh
            </button>
          </div>
        </div>

        {/* Batches Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                <th style={{ padding: '12px 24px', fontSize: '11px', fontWeight: 800, color: '#64748B' }}>BATCH NAME & DATE</th>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 800, color: '#64748B', textAlign: 'center' }}>TOTAL</th>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 800, color: '#64748B', textAlign: 'center' }}>🟢 WHATSAPP</th>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 800, color: '#64748B', textAlign: 'center' }}>🔴 NON-WA</th>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 800, color: '#64748B', textAlign: 'center' }}>STATUS</th>
                <th style={{ padding: '12px 24px', fontSize: '11px', fontWeight: 800, color: '#64748B', textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loadingBatches ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                    <div style={{ width: '22px', height: '22px', border: '2px solid #DBEAFE', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 8px' }} />
                    <span>Loading batches...</span>
                  </td>
                </tr>
              ) : batches.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '50px 24px', textAlign: 'center' }}>
                    <div style={{ maxWidth: '380px', margin: '0 auto' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                        <FilterIcon size={24} color="#2563EB" />
                      </div>
                      <h4 style={{ margin: '0 0 6px', color: '#0F172A', fontSize: '15px', fontWeight: 800 }}>No Filter Batches Yet</h4>
                      <p style={{ margin: '0 0 16px', color: '#64748B', fontSize: '13px' }}>
                        Click the button below to upload or paste numbers and start your first verification batch.
                      </p>
                      <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="btn-primary"
                        style={{ padding: '8px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: 700 }}
                      >
                        + Create First Filter Batch
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                batches.map((b) => (
                  <tr key={b.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '14px 24px' }}>
                      <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '14px' }}>{b.name}</div>
                      <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
                        {new Date(b.createdAt).toLocaleDateString()} • {new Date(b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Inst: <code style={{ color: '#2563EB', fontWeight: 700 }}>{b.instanceId}</code>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 800, color: '#0F172A', fontSize: '13px' }}>
                      {b.totalCount.toLocaleString()}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <span className="badge badge-success" style={{ fontSize: '11.5px', fontWeight: 800 }}>
                        {b.validCount.toLocaleString()}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <span className="badge badge-danger" style={{ fontSize: '11.5px', fontWeight: 800 }}>
                        {b.invalidCount.toLocaleString()}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <span className={`badge ${b.status === 'processing' ? 'badge-warning' : 'badge-info'}`} style={{ fontSize: '11px', fontWeight: 700 }}>
                        {b.status === 'processing' ? '⚡ Processing' : '✓ Completed'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 24px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px' }}>
                        {/* View Dedicated Page Button */}
                        <button
                          onClick={() => navigate(`/filter/batch/${b.id}`)}
                          style={{
                            background: '#EFF6FF',
                            border: '1px solid #DBEAFE',
                            borderRadius: '8px',
                            padding: '6px 12px',
                            color: '#2563EB',
                            fontSize: '12px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <EyeIcon size={13} color="#2563EB" /> View Details
                        </button>

                        {/* Export CSV Button */}
                        <button
                          onClick={() => handleExportBatch(b)}
                          title="Export CSV"
                          style={{
                            background: '#F8FAFC',
                            border: '1px solid #E2E8F0',
                            borderRadius: '8px',
                            padding: '6px 10px',
                            color: '#475569',
                            fontSize: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          <DownloadIcon size={13} color="#475569" />
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDeleteBatch(b.id)}
                          title="Delete Batch"
                          style={{
                            background: '#FEF2F2',
                            border: '1px solid #FEE2E2',
                            borderRadius: '8px',
                            padding: '6px 10px',
                            color: '#DC2626',
                            fontSize: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          <TrashIcon size={13} color="#DC2626" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {batchTotalPages > 1 && (
          <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #E2E8F0' }}>
            <span style={{ fontSize: '12px', color: '#64748B' }}>
              Page {batchPage} of {batchTotalPages} ({batchTotalCount} total batches)
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() => setBatchPage((p) => Math.max(1, p - 1))}
                disabled={batchPage <= 1}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  background: batchPage <= 1 ? '#F8FAFC' : '#FFFFFF',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: batchPage <= 1 ? 'not-allowed' : 'pointer'
                }}
              >
                Previous
              </button>
              <button
                onClick={() => setBatchPage((p) => Math.min(batchTotalPages, p + 1))}
                disabled={batchPage >= batchTotalPages}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  background: batchPage >= batchTotalPages ? '#F8FAFC' : '#FFFFFF',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: batchPage >= batchTotalPages ? 'not-allowed' : 'pointer'
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}

      </div>

      {/* CREATE BATCH MODAL DIALOG (CENTERED WITH BLUR BACKGROUND) */}
      {isCreateModalOpen && createPortal(
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '24px',
            overflowY: 'auto'
          }}
          onClick={() => !isProcessing && setIsCreateModalOpen(false)}
        >
          <div
            className="card animate-in"
            style={{
              width: '100%',
              maxWidth: '600px',
              position: 'relative',
              borderRadius: '24px',
              padding: '32px',
              boxShadow: '0 25px 50px -12px rgba(37, 99, 235, 0.25), 0 0 0 1px rgba(226, 232, 240, 0.8)',
              background: '#FFFFFF',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => !isProcessing && setIsCreateModalOpen(false)}
              disabled={isProcessing}
              style={{
                position: 'absolute',
                top: '24px',
                right: '24px',
                background: '#F1F5F9',
                border: 'none',
                borderRadius: '12px',
                width: '36px',
                height: '36px',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748B',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#E2E8F0'; e.currentTarget.style.color = '#0F172A'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.color = '#64748B'; }}
            >
              <XIcon size={18} color="currentColor" />
            </button>

            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(37, 99, 235, 0.12)' }}>
                <FilterIcon size={24} color="#2563EB" />
              </div>
              <div>
                <h3 style={{ fontWeight: 800, fontSize: '20px', color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
                  Create New Filter Batch
                </h3>
                <p style={{ fontSize: '13px', color: '#64748B', margin: '3px 0 0', fontWeight: 500 }}>
                  Upload or paste numbers to verify WhatsApp presence in the background.
                </p>
              </div>
            </div>

            {/* Form Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              
              {/* Batch Name */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#64748B', marginBottom: '6px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  Batch Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Leads August 2026, Campaign 1"
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                  className="rounded-input"
                  style={{ height: '44px', borderRadius: '10px', fontSize: '13.5px' }}
                  disabled={isProcessing}
                />
              </div>

              {/* Select WhatsApp Instance */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#64748B', marginBottom: '6px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  Select WhatsApp Instance
                </label>
                {instances.length === 0 ? (
                  <div style={{ padding: '12px', background: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: '10px', color: '#DC2626', fontSize: '12px', fontWeight: 600 }}>
                    ⚠️ No connected instances found. Connect an instance in the <strong>Instances</strong> page first.
                  </div>
                ) : (
                  <select
                    value={selectedInstance}
                    onChange={(e) => setSelectedInstance(e.target.value)}
                    className="rounded-input"
                    style={{ height: '44px', cursor: 'pointer', background: '#FFFFFF', fontWeight: 600, fontSize: '13px', borderRadius: '10px' }}
                    disabled={isProcessing}
                  >
                    {instances.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.id} {inst.phoneNumber ? `(+${inst.phoneNumber})` : ''} - Connected
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Numbers List */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ margin: 0, fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    Numbers List {inputNumberCount > 0 && `(${inputNumberCount.toLocaleString()} numbers detected)`}
                  </label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept=".txt,.csv"
                      style={{ display: 'none' }}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isProcessing}
                      style={{
                        background: '#EFF6FF',
                        border: '1px solid #DBEAFE',
                        borderRadius: '8px',
                        padding: '4px 8px',
                        color: '#2563EB',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <UploadIcon size={12} color="#2563EB" /> Upload TXT/CSV
                    </button>
                    {rawInput && (
                      <button
                        onClick={() => setRawInput('')}
                        disabled={isProcessing}
                        style={{
                          background: '#FEE2E2',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '4px 8px',
                          color: '#DC2626',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                <textarea
                  rows={8}
                  placeholder={"919876543210\n919123456789\n14155552671\n..."}
                  value={rawInput}
                  onChange={(e) => setRawInput(e.target.value)}
                  disabled={isProcessing}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    fontSize: '13px',
                    fontFamily: 'var(--font-mono)',
                    color: '#0F172A',
                    outline: 'none',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                    lineHeight: '1.5'
                  }}
                />
                <span style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px', display: 'block' }}>
                  Numbers are cleaned and deduplicated automatically. All numbers are saved into the database instantly.
                </span>
              </div>

              {/* Rate-Limit Safe Delay */}
              <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#475569' }}>Rate-Limit Safe Delay</span>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#2563EB', fontFamily: 'var(--font-mono)' }}>{delayMs}ms / number</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="500"
                  step="50"
                  value={delayMs}
                  onChange={(e) => setDelayMs(Number(e.target.value))}
                  disabled={isProcessing}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
              </div>

              {errorMsg && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: '10px', padding: '10px 14px', color: '#DC2626', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <WarningIcon size={14} color="#DC2626" /> {errorMsg}
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={isProcessing}
                  style={{
                    flex: 1,
                    padding: '14px',
                    fontSize: '14px',
                    fontWeight: 700,
                    borderRadius: '12px',
                    background: '#F1F5F9',
                    border: '1px solid #E2E8F0',
                    color: '#64748B',
                    cursor: isProcessing ? 'not-allowed' : 'pointer'
                  }}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleCreateBatch}
                  disabled={instances.length === 0 || !rawInput.trim() || isProcessing}
                  className="btn-primary"
                  style={{
                    flex: 2,
                    padding: '14px',
                    fontSize: '14px',
                    fontWeight: 800,
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    background: isProcessing || instances.length === 0 || !rawInput.trim() ? '#CBD5E1' : '#2563EB',
                    cursor: isProcessing || instances.length === 0 || !rawInput.trim() ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isProcessing ? (
                    <>
                      <div style={{ width: '16px', height: '16px', border: '2px solid #FFFFFF', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                      Creating Batch...
                    </>
                  ) : (
                    <>
                      <FilterIcon size={16} color="#FFFFFF" /> Filter & Create Batch
                    </>
                  )}
                </button>
              </div>

            </div>

          </div>
        </div>,
        document.body
      )}

    </div>
  );
};
