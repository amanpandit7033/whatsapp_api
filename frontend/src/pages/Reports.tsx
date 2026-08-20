import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  CaretLeftIcon,
  CaretRightIcon,
  XIcon,
  ChecksIcon,
  WarningCircleIcon
} from '../components/Icons';
import {
  GlassDownloadIcon,
  GlassEyeIcon,
  GlassFileIcon,
  GlassSparklesIcon,
  GlassTrashIcon,
  GlassSendIcon,
  GlassCheckCircleIcon,
  GlassWarningIcon,
  GlassCancelIcon,
  GlassSearchIcon,
  GlassRefreshIcon,
  GlassCalendarIcon,
  GlassUserIcon,
  GlassPhoneIcon,
  GlassStarSparkleIcon
} from '../components/GlassIcons';

const S: Record<string, React.CSSProperties> = {
  label: { display: 'block', fontSize: '11px', fontWeight: 700, color: '#94a3b8', marginBottom: '7px', textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
};

const parseMessageContent = (messageStr: string) => {
  const text = messageStr || '';
  
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === 'object' && parsed.type) {
      return {
        isJson: true,
        type: parsed.type,
        text: parsed.text || '',
        mediaUrl: parsed.mediaUrl || '',
        filename: parsed.filename || '',
        headerType: parsed.headerType || 'none',
        headerText: parsed.headerText || '',
        headerImageUrl: parsed.headerImageUrl || '',
        footer: parsed.footer || '',
        buttons: parsed.buttons || [],
        usedFallback: parsed.usedFallback || false
      };
    }
  } catch (e) {
    // not json, fallback to legacy parser below
  }

  let legacyText = text;
  let isInteractive = false;
  let isMedia = false;
  let mediaUrl = '';
  
  if (legacyText.startsWith('[Interactive]')) {
    isInteractive = true;
    legacyText = legacyText.replace('[Interactive]', '').trim();
  } else if (legacyText.startsWith('[Interactive API]')) {
    isInteractive = true;
    legacyText = legacyText.replace('[Interactive API]', '').trim();
  } else if (legacyText.startsWith('[Media]')) {
    isMedia = true;
    mediaUrl = legacyText.replace('[Media]', '').trim();
    legacyText = '';
  } else {
    const mediaUrlMatch = legacyText.match(/\[Media URL:\s*([^\]]+)\]/);
    if (mediaUrlMatch) {
      isMedia = true;
      mediaUrl = mediaUrlMatch[1].trim();
      legacyText = legacyText.replace(/\[Media URL:\s*[^\]]+\]/, '').trim();
    }
  }

  return {
    isJson: false,
    type: isInteractive ? 'interactive' : isMedia ? 'media' : 'text',
    text: legacyText,
    mediaUrl,
    filename: mediaUrl.split('/').pop() || 'file',
    headerType: 'none',
    headerText: '',
    headerImageUrl: '',
    footer: '',
    buttons: [],
    usedFallback: false
  };
};

export const Reports = () => {
  const [reports, setReports] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [globalSentCount, setGlobalSentCount] = useState(0);
  const [globalFailedCount, setGlobalFailedCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Draft Filter Inputs State
  const [searchNumber, setSearchNumber] = useState('');
  const [searchMessage, setSearchMessage] = useState('');
  const [searchUsername, setSearchUsername] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Active Applied Filters
  const [appliedFilters, setAppliedFilters] = useState({
    searchNumber: '',
    searchMessage: '',
    searchUsername: '',
    startDate: '',
    endDate: ''
  });

  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const navigate = useNavigate();
  const isAdmin = localStorage.getItem('isAdmin') === 'true';
  const limit = 10;

  useEffect(() => {
    fetchReports();
  }, [page, appliedFilters]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        searchNumber: appliedFilters.searchNumber,
        searchMessage: appliedFilters.searchMessage,
        searchUsername: appliedFilters.searchUsername,
        startDate: appliedFilters.startDate,
        endDate: appliedFilters.endDate
      });
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/reports?${query}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.status === 401) { navigate('/login'); return; }
      const data = await res.json();
      setReports(data.reports || []);
      setTotalCount(data.totalCount || 0);
      setGlobalSentCount(data.sentCount || 0);
      setGlobalFailedCount(data.failedCount || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilter = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setPage(1);
    setAppliedFilters({
      searchNumber,
      searchMessage,
      searchUsername,
      startDate,
      endDate
    });
  };

  const handleResetFilters = () => {
    setSearchNumber('');
    setSearchMessage('');
    setSearchUsername('');
    setStartDate('');
    setEndDate('');
    setPage(1);
    setAppliedFilters({
      searchNumber: '',
      searchMessage: '',
      searchUsername: '',
      startDate: '',
      endDate: ''
    });
  };

  const hasActiveFilters = Boolean(
    appliedFilters.searchNumber ||
    appliedFilters.searchMessage ||
    appliedFilters.searchUsername ||
    appliedFilters.startDate ||
    appliedFilters.endDate
  );

  const handleExport = () => {
    const query = new URLSearchParams({
      searchNumber: appliedFilters.searchNumber,
      searchMessage: appliedFilters.searchMessage,
      searchUsername: appliedFilters.searchUsername,
      startDate: appliedFilters.startDate,
      endDate: appliedFilters.endDate
    }).toString();

    fetch(`${import.meta.env.VITE_API_URL}/api/reports/export?${query}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Export failed');
        return res.blob();
      })
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `whatsapp_reports_${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch(err => alert('Failed to export reports: ' + err.message));
  };

  const handleClearReports = async () => {
    if (!window.confirm('Are you sure you want to delete all reports matching your current filter? This cannot be undone.')) return;
    try {
      const query = new URLSearchParams({
        searchNumber: appliedFilters.searchNumber,
        searchMessage: appliedFilters.searchMessage,
        searchUsername: appliedFilters.searchUsername,
        startDate: appliedFilters.startDate,
        endDate: appliedFilters.endDate
      }).toString();
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/reports/clear?${query}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        setPage(1);
        fetchReports();
      } else {
        alert('Failed to clear reports');
      }
    } catch (e) {
      alert('Error clearing reports');
    }
  };

  const totalPages = Math.ceil(totalCount / limit) || 1;
  const deliverySla = totalCount > 0 ? ((globalSentCount / totalCount) * 100).toFixed(1) + '%' : '100.0%';

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px', letterSpacing: '-0.02em' }}>Message Reports</h2>
          <p style={{ color: '#64748B', fontSize: '14px', margin: 0, fontWeight: 500 }}>View and export logs of all sent messages.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {isAdmin && (
            <button onClick={handleClearReports} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#FEE2E2', color: '#DC2626', border: '1px solid #FCA5A5', padding: '0 16px', borderRadius: '10px', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>
              <GlassTrashIcon size={16} /> Delete All Reports
            </button>
          )}
          <button 
            onClick={handleExport} 
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '8px',
              background: '#0F172A',
              color: '#FFFFFF',
              border: 'none',
              padding: '10px 18px',
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '13.5px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.25)',
              transition: 'all 0.2s ease'
            }}
          >
            <GlassDownloadIcon size={16} /> Export Excel
          </button>
        </div>
      </div>

      {/* Stat strip (Shopeers Style) */}
      <div className="stats-grid">
        {[
          { label: 'Total Messages', val: totalCount.toLocaleString(), sub: 'All filtered logs', badge: 'Total', bg: '#EFF6FF', color: '#2563EB', icon: GlassSendIcon },
          { label: 'Delivered SLA', val: deliverySla, sub: 'Success rate', badge: 'High SLA', bg: '#EFF6FF', color: '#2563EB', icon: GlassStarSparkleIcon },
          { label: 'Sent', val: globalSentCount.toLocaleString(), sub: 'Successfully delivered', badge: 'Success', bg: '#D1FAE5', color: '#059669', icon: GlassCheckCircleIcon },
          { label: 'Failed', val: globalFailedCount.toLocaleString(), sub: 'Undelivered / Non-WA', badge: 'Alert', bg: '#FEE2E2', color: '#DC2626', icon: GlassWarningIcon },
        ].map(({ label, val, sub, badge, bg, icon: IconComp }) => (
          <div key={label} className="card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748B' }}>{label}</span>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IconComp size={20} />
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                <span style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>{val}</span>
                <span className={`badge ${badge === 'Alert' ? 'badge-danger' : 'badge-success'}`}>▲ {badge}</span>
              </div>
              <span style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px', display: 'block' }}>{sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Filters & Table Card (Shopeers SaaS Redesigned Style) */}
      <div className="card" style={{ padding: '24px 0' }}>
        
        {/* Redesigned Sleek Filter Controls Bar */}
        <div style={{ padding: '0 28px 24px', marginBottom: '20px', borderBottom: '1px solid #F1F5F9' }}>
          <form
            onSubmit={handleApplyFilter}
            style={{
              background: '#F8FAFC',
              borderRadius: '18px',
              padding: '20px 22px',
              border: '1px solid #E2E8F0',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            {/* Input Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '14px'
              }}
            >
              {/* Recipient Number */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em', marginBottom: '6px' }}>
                  RECIPIENT NUMBER
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{ position: 'absolute', left: '12px', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                    <GlassPhoneIcon size={16} />
                  </span>
                  <input 
                    type="text" 
                    placeholder="e.g. 911234567890" 
                    value={searchNumber} 
                    onChange={e => setSearchNumber(e.target.value)} 
                    style={{
                      width: '100%',
                      height: '42px',
                      borderRadius: '12px',
                      fontSize: '13px',
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

              {/* Owner (Admin only) */}
              {isAdmin && (
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em', marginBottom: '6px' }}>
                    OWNER (ADMIN)
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <span style={{ position: 'absolute', left: '12px', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                      <GlassUserIcon size={16} />
                    </span>
                    <input 
                      type="text" 
                      placeholder="Username..." 
                      value={searchUsername} 
                      onChange={e => setSearchUsername(e.target.value)} 
                      style={{
                        width: '100%',
                        height: '42px',
                        borderRadius: '12px',
                        fontSize: '13px',
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
              )}

              {/* Message Content */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em', marginBottom: '6px' }}>
                  MESSAGE CONTENT
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{ position: 'absolute', left: '12px', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                    <GlassFileIcon size={16} />
                  </span>
                  <input 
                    type="text" 
                    placeholder="Keywords in message..." 
                    value={searchMessage} 
                    onChange={e => setSearchMessage(e.target.value)} 
                    style={{
                      width: '100%',
                      height: '42px',
                      borderRadius: '12px',
                      fontSize: '13px',
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

              {/* Start Date */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em', marginBottom: '6px' }}>
                  START DATE
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{ position: 'absolute', left: '12px', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                    <GlassCalendarIcon size={16} />
                  </span>
                  <input 
                    type="date" 
                    value={startDate} 
                    onChange={e => setStartDate(e.target.value)} 
                    onClick={(e) => e.currentTarget.showPicker?.()}
                    style={{
                      width: '100%',
                      height: '42px',
                      borderRadius: '12px',
                      fontSize: '13px',
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

              {/* End Date */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em', marginBottom: '6px' }}>
                  END DATE
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{ position: 'absolute', left: '12px', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                    <GlassCalendarIcon size={16} />
                  </span>
                  <input 
                    type="date" 
                    value={endDate} 
                    onChange={e => setEndDate(e.target.value)} 
                    onClick={(e) => e.currentTarget.showPicker?.()}
                    style={{
                      width: '100%',
                      height: '42px',
                      borderRadius: '12px',
                      fontSize: '13px',
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
            </div>

            {/* Action Buttons Row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', borderTop: '1px solid #E2E8F0', paddingTop: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#64748B', fontWeight: 600 }}>
                {hasActiveFilters && (
                  <span style={{ background: '#EFF6FF', color: '#2563EB', padding: '3px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 800 }}>
                    Filters Active
                  </span>
                )}
                <span>Press Enter or click Show to filter records</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {/* Reset Button */}
                <button
                  type="button"
                  onClick={handleResetFilters}
                  disabled={loading}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '10px',
                    background: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    color: '#475569',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.color = '#0F172A'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.color = '#475569'; }}
                >
                  <GlassRefreshIcon size={16} />
                  <span>Reset</span>
                </button>

                {/* Show Report Filter Button */}
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '9px 22px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                    border: 'none',
                    color: '#FFFFFF',
                    fontSize: '13.5px',
                    fontWeight: 800,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.28)',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => { if (!loading) e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={(e) => { if (!loading) e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <GlassSearchIcon size={16} />
                  <span>{loading ? 'Filtering...' : 'Show Report'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>

        <div style={{ overflowX: 'auto' }} className="custom-scrollbar">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0' }}>
                <th style={{ padding: '14px 28px', fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em', textTransform: 'uppercase', width: '60px' }}>#</th>
                <th style={{ padding: '14px 16px', fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Time</th>
                {isAdmin && <th style={{ padding: '14px 16px', fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Owner</th>}
                <th style={{ padding: '14px 16px', fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Sender</th>
                <th style={{ padding: '14px 16px', fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Recipient</th>
                <th style={{ padding: '14px 16px', fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em', textTransform: 'uppercase', width: '100px', textAlign: 'center' }}>Preview</th>
                <th style={{ padding: '14px 28px', fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em', textTransform: 'uppercase', textAlign: 'right' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} style={{ padding: '48px', textAlign: 'center', color: '#94A3B8', fontSize: '14px', fontWeight: 500 }}>
                    No messages found matching your criteria.
                  </td>
                </tr>
              ) : reports.map((r, i) => (
                <tr key={r.id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s ease' }}>
                  <td style={{ padding: '16px 28px', fontSize: '13px', fontWeight: 700, color: '#64748B' }}>
                    {((page - 1) * limit + i + 1).toString().padStart(2, '0')}
                  </td>
                  <td style={{ padding: '16px 16px', fontSize: '13px', color: '#64748B', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {new Date(r.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  {isAdmin && (
                    <td style={{ padding: '16px 16px', fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
                      {r.user?.username || '—'}
                    </td>
                  )}
                  <td style={{ padding: '16px 16px', fontSize: '14px', fontWeight: 700, color: '#0F172A', fontFamily: 'var(--font-mono)' }}>
                    {r.instance?.phoneNumber ? `+${r.instance.phoneNumber}` : 'Unknown'}
                  </td>
                  <td style={{ padding: '16px 16px', fontSize: '14px', fontWeight: 700, color: '#0F172A', fontFamily: 'var(--font-mono)' }}>
                    +{r.toNumber}
                  </td>
                  <td style={{ padding: '16px 16px', width: '100px', textAlign: 'center' }}>
                    <button 
                      onClick={() => setSelectedReport(r)} 
                      style={{ 
                        background: '#EFF6FF', border: '1px solid #DBEAFE', cursor: 'pointer', 
                        width: '34px', height: '34px', borderRadius: '10px', display: 'inline-flex', 
                        alignItems: 'center', justifyContent: 'center', margin: '0 auto', transition: 'all 0.2s ease',
                        boxShadow: '0 2px 6px rgba(37, 99, 235, 0.08)'
                      }}
                      title="Preview Message Content"
                    >
                      <GlassEyeIcon size={18} />
                    </button>
                  </td>
                  <td style={{ padding: '16px 28px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: r.status === 'sent' ? '#D1FAE5' : '#FEE2E2', padding: '4px 12px', borderRadius: '9999px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: r.status === 'sent' ? '#059669' : '#DC2626' }}></span>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: r.status === 'sent' ? '#059669' : '#DC2626', textTransform: 'capitalize' }}>
                        {r.status}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination mock (matching Dashboard) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 32px 0' }}>
          <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 500 }}>
            Showing 
            <select style={{ border: '1px solid #E2E8F0', borderRadius: '4px', margin: '0 8px', padding: '2px 4px', outline: 'none' }} value={page} onChange={e => setPage(Number(e.target.value))}>
              {Array.from({ length: totalPages }).map((_, i) => (
                <option key={i + 1} value={i + 1}>{(i + 1).toString().padStart(2, '0')}</option>
              ))}
            </select>
            of {totalCount} Results
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ background: 'none', border: 'none', color: page === 1 ? '#CBD5E1' : '#94A3B8', cursor: page === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center' }}>
              <CaretLeftIcon size={18} />
            </button>
            <span style={{ background: 'var(--accent-color)', color: '#FFFFFF', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', fontSize: '13px', fontWeight: 600 }}>{page.toString().padStart(2, '0')}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={{ background: 'none', border: 'none', color: page >= totalPages ? '#CBD5E1' : '#94A3B8', cursor: page >= totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center' }}>
              <CaretRightIcon size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Overlay */}
      {selectedReport && (() => {
        const parsed = parseMessageContent(selectedReport.message);
        return createPortal(
          <div className="modal-overlay" onClick={() => setSelectedReport(null)}>
            <div className="modal-card" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="modal-title">Message Details & Preview</h3>
                <button 
                  onClick={() => setSelectedReport(null)}
                  title="Close modal"
                  style={{
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
              </div>
              <div className="modal-body">
                {/* Details Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', borderBottom: '1px solid #E2E8F0', paddingBottom: '16px' }}>
                  <div>
                    <span style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Recipient</span>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>+{selectedReport.toNumber}</span>
                  </div>
                  <div>
                    <span style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Sender Instance</span>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>{selectedReport.instance?.phoneNumber ? `+${selectedReport.instance.phoneNumber}` : 'Unknown'} ({selectedReport.instanceId})</span>
                  </div>
                  <div>
                    <span style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Sent Time</span>
                    <span style={{ fontSize: '14px', fontWeight: 500, color: '#64748B' }}>{new Date(selectedReport.createdAt).toLocaleString()}</span>
                  </div>
                  <div>
                    <span style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Status</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                      <span className={`status-dot ${selectedReport.status === 'sent' ? 'active' : 'suspended'}`}></span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: selectedReport.status === 'sent' ? '#059669' : '#DC2626', textTransform: 'capitalize' }}>
                        {selectedReport.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Delivery Warning if Not Sent */}
                {selectedReport.status !== 'sent' && (
                  <div style={{ background: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: '10px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12.5px', color: '#B91C1C' }}>
                    <GlassWarningIcon size={18} />
                    <span><strong>Delivery Failed:</strong> The recipient number (+{selectedReport.toNumber}) is not registered on WhatsApp or could not receive this message.</span>
                  </div>
                )}

                {/* Simulated WhatsApp Preview */}
                <div>
                  <span style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Simulated WhatsApp Preview</span>
                  <div className="wa-preview-container">
                    <div style={{ maxWidth: '280px', marginLeft: 'auto', width: '100%' }}>
                      <div style={{ 
                        background: 'white', 
                        borderRadius: '8px 2px 8px 8px', 
                        boxShadow: '0 1px 2px rgba(0,0,0,0.15)', 
                        overflow: 'hidden'
                      }}>
                        {/* Header Image (if interactive and has header image) */}
                        {parsed.type === 'interactive' && parsed.headerType === 'image' && parsed.headerImageUrl && (
                          <img src={parsed.headerImageUrl} alt="header" style={{ width: '100%', height: '120px', objectFit: 'cover', display: 'block' }} />
                        )}

                        {/* Header Text (if interactive and has header text) */}
                        {parsed.type === 'interactive' && parsed.headerType === 'text' && parsed.headerText && (
                          <div style={{ background: '#f0f4f8', padding: '10px 12px', borderBottom: '1px solid #e2e8f0' }}>
                            <p style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a', margin: 0 }}>{parsed.headerText}</p>
                          </div>
                        )}

                        {/* Media Box (if media message) */}
                        {parsed.type === 'media' && parsed.mediaUrl && (
                          <div className="wa-media-box" style={{ margin: '8px 8px 4px', background: '#f0f4f8' }}>
                            <GlassFileIcon size={20} style={{ flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {parsed.filename || parsed.mediaUrl.split('/').pop()}
                              </p>
                              <a href={parsed.mediaUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '10px', color: '#4F46E5', textDecoration: 'none', fontWeight: 500 }}>
                                Open Attachment
                              </a>
                            </div>
                          </div>
                        )}

                        {/* Bubble Body Content */}
                        <div style={{ padding: '10px 12px' }}>
                          {parsed.type === 'interactive' && !parsed.isJson && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#4B5563', fontSize: '12px', marginBottom: '6px', fontWeight: 600 }}>
                              <GlassSparklesIcon size={16} />
                              <span>Interactive Payload Message</span>
                            </div>
                          )}

                          <p style={{ margin: 0, fontSize: '14px', color: '#1a1a1a', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.5 }}>
                            {parsed.text || (parsed.type === 'media' ? '' : <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>Empty message</span>)}
                          </p>
                          
                          {parsed.type === 'interactive' && parsed.footer && (
                            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '6px 0 0', fontStyle: 'italic' }}>{parsed.footer}</p>
                          )}
                          
                          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                            <span style={{ fontSize: '10px', color: '#64748B' }}>
                              {new Date(selectedReport.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {selectedReport.status === 'sent' ? (
                              <ChecksIcon size={14} color="#53bdeb" />
                            ) : (
                              <WarningCircleIcon size={14} color="var(--danger-color)" />
                            )}
                          </div>
                        </div>

                        {/* Buttons (if interactive and has buttons) */}
                        {parsed.type === 'interactive' && parsed.buttons && parsed.buttons.length > 0 && (
                          <div style={{ borderTop: '1px solid #e2e8f0' }}>
                            {parsed.buttons.map((btn: any, idx: number) => (
                              <div key={idx} style={{
                                padding: '10px 12px', 
                                borderBottom: idx < parsed.buttons.length - 1 ? '1px solid #f1f5f9' : 'none',
                                textAlign: 'center', 
                                color: btn.type === 'quick_reply' ? '#00a884' : '#0066cc', 
                                fontWeight: 700, 
                                fontSize: '13px',
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                gap: '6px',
                                background: '#fafafa',
                                cursor: 'default'
                              }}>
                                {btn.type === 'cta_url' ? '🔗' : btn.type === 'cta_call' ? '📞' : '💬'} {btn.label || 'Button'}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        );
      })()}
    </div>
  );
};
