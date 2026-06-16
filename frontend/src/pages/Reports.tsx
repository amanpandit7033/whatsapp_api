import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DownloadIcon,
  SendIcon,
  ListIcon,
  CheckCircleIcon,
  EyeIcon,
  CaretLeftIcon,
  CaretRightIcon,
  XIcon,
  FileIcon,
  SparklesIcon,
  ChecksIcon,
  WarningCircleIcon,
  TrashIcon
} from '../components/Icons';

const S: Record<string, React.CSSProperties> = {
  label: { display: 'block', fontSize: '11px', fontWeight: 700, color: '#94a3b8', marginBottom: '7px', textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
};

const parseMessageContent = (messageStr: string) => {
  const text = messageStr || '';
  
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === 'object') {
      return {
        isJson: true,
        type: parsed.type || 'text',
        text: parsed.message || parsed.body || '',
        mediaUrl: parsed.url || '',
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
    // Treat as legacy plain text log
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
  const [page, setPage] = useState(1);
  const [searchNumber, setSearchNumber] = useState('');
  const [searchMessage, setSearchMessage] = useState('');
  const [searchUsername, setSearchUsername] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const navigate = useNavigate();
  const isAdmin = localStorage.getItem('isAdmin') === 'true';
  const limit = 10;

  useEffect(() => { fetchReports(); }, [page, searchNumber, searchMessage, searchUsername, startDate, endDate]);

  const fetchReports = async () => {
    const query = new URLSearchParams({ page: page.toString(), limit: limit.toString(), searchNumber, searchMessage, searchUsername, startDate, endDate });
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/reports?${query}`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
    if (res.status === 401) { navigate('/login'); return; }
    const data = await res.json();
    setReports(data.reports || []);
    setTotalCount(data.totalCount || 0);
  };

  const handleExport = () => {
    const query = new URLSearchParams({ searchNumber, searchMessage, searchUsername, startDate, endDate });
    fetch(`${import.meta.env.VITE_API_URL}/api/reports/export?${query}`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
      .then(r => r.blob()).then(blob => {
        const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'reports.xlsx' });
        document.body.appendChild(a); a.click(); a.remove();
      }).catch(() => alert('Failed to export'));
  };

  const handleClearReports = async () => {
    const isFiltered = searchNumber || searchMessage || searchUsername || startDate || endDate;
    const confirmMsg = isFiltered 
      ? "Are you sure you want to permanently delete the reports MATCHING YOUR CURRENT FILTERS? This action cannot be undone."
      : "Are you sure you want to permanently delete ALL reports? This action cannot be undone.";
      
    if (!window.confirm(confirmMsg)) return;
    
    try {
      const query = new URLSearchParams({ searchNumber, searchMessage, searchUsername, startDate, endDate });
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
  const sentCount = reports.filter(r => r.status === 'sent').length;
  const failedCount = reports.filter(r => r.status === 'failed' || r.status === 'Non-Whatsapp').length;
  return (
    <div className="animate-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>Message Reports</h2>
          <p style={{ color: '#64748B', fontSize: '14px', margin: 0, fontWeight: 500 }}>View and export logs of all sent messages.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {isAdmin && (
            <button onClick={handleClearReports} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#FEE2E2', color: '#EF4444', border: 'none', padding: '0 16px', borderRadius: '8px', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>
              <TrashIcon size={16} color="#EF4444" /> Delete All Reports
            </button>
          )}
          <button onClick={handleExport} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <DownloadIcon size={16} /> Export Excel
          </button>
        </div>
      </div>

      {/* Stat strip */}
      <div className="stats-grid">
        {[
          { label: 'Total Messages', val: totalCount, icon: SendIcon, color: '#7C3AED', bg: '#F3E8FF' },
          { label: 'On This Page', val: reports.length, icon: ListIcon, color: '#3B82F6', bg: '#DBEAFE' },
          { label: 'Sent', val: sentCount, icon: CheckCircleIcon, color: '#10B981', bg: '#D1FAE5' },
          { label: 'Failed', val: failedCount, icon: WarningCircleIcon, color: '#EF4444', bg: '#FEE2E2' },
        ].map(({ label, val, icon: IconComponent, color, bg }) => (
          <div key={label} className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '24px 28px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
               <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 <IconComponent size={16} color={color} />
               </div>
            </div>
            <div>
              <p style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>{label}</p>
              <p style={{ fontSize: '13px', fontWeight: 500, color: '#64748B', margin: '2px 0 0' }}>{val} records</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters & Table Card */}
      <div className="card" style={{ padding: '24px 0' }}>
        <div className="reports-filters-grid">
          {[
            { label: 'Recipient Number', ph: 'e.g. 911234567890', val: searchNumber, set: setSearchNumber },
            ...(isAdmin ? [{ label: 'Owner (Admin)', ph: 'Username...', val: searchUsername, set: setSearchUsername }] : []),
            { label: 'Message Content', ph: 'Keywords...', val: searchMessage, set: setSearchMessage },
            { label: 'Start Date', ph: '', val: startDate, set: setStartDate, type: 'date' },
            { label: 'End Date', ph: '', val: endDate, set: setEndDate, type: 'date' },
          ].map(({ label, ph, val, set, type = 'text' }) => (
            <div key={label}>
              <label style={S.label}>{label}</label>
              <input type={type} placeholder={ph} value={val} onChange={e => { set(e.target.value); setPage(1); }} className="rounded-input" />
            </div>
          ))}
        </div>

        <div style={{ overflowX: 'auto' }} className="custom-scrollbar">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0' }}>
                <th style={{ padding: '16px 32px', fontSize: '13px', fontWeight: 600, color: '#64748B', width: '60px' }}>#</th>
                <th style={{ padding: '16px 12px', fontSize: '13px', fontWeight: 600, color: '#64748B' }}>Time</th>
                {isAdmin && <th style={{ padding: '16px 12px', fontSize: '13px', fontWeight: 600, color: '#64748B' }}>Owner</th>}
                <th style={{ padding: '16px 12px', fontSize: '13px', fontWeight: 600, color: '#64748B' }}>Sender</th>
                <th style={{ padding: '16px 12px', fontSize: '13px', fontWeight: 600, color: '#64748B' }}>Recipient</th>
                <th style={{ padding: '16px 12px', fontSize: '13px', fontWeight: 600, color: '#64748B', width: '100px', textAlign: 'center' }}>Preview</th>
                <th style={{ padding: '16px 32px', fontSize: '13px', fontWeight: 600, color: '#64748B', textAlign: 'right' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} style={{ padding: '40px', textAlign: 'center', color: '#94A3B8', fontSize: '14px', fontWeight: 500 }}>
                    No messages found.
                  </td>
                </tr>
              ) : reports.map((r, i) => (
                <tr key={r.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '16px 32px', fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>
                    {((page - 1) * limit + i + 1).toString().padStart(2, '0')}
                  </td>
                  <td style={{ padding: '16px 12px', fontSize: '14px', color: '#64748B', fontWeight: 500, whiteSpace: 'nowrap' }}>
                    {new Date(r.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  {isAdmin && (
                    <td style={{ padding: '16px 12px', fontSize: '14px', fontWeight: 500, color: '#0F172A' }}>
                      {r.user?.username || '—'}
                    </td>
                  )}
                  <td style={{ padding: '16px 12px', fontSize: '14px', fontWeight: 500, color: '#0F172A' }}>
                    {r.instance?.phoneNumber ? `+${r.instance.phoneNumber}` : 'Unknown'}
                  </td>
                  <td style={{ padding: '16px 12px', fontSize: '14px', fontWeight: 500, color: '#0F172A' }}>
                    +{r.toNumber}
                  </td>
                  <td style={{ padding: '16px 12px', width: '100px', textAlign: 'center' }}>
                    <button 
                      onClick={() => setSelectedReport(r)} 
                      className="btn-preview-icon"
                      title="Preview Message"
                      style={{ margin: '0 auto', display: 'inline-flex' }}
                    >
                      <EyeIcon size={16} />
                    </button>
                  </td>
                  <td style={{ padding: '16px 32px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                      <span className={`status-dot ${r.status === 'sent' ? 'active' : 'suspended'}`}></span>
                      <span style={{ fontSize: '13px', fontWeight: 500, color: r.status === 'sent' ? 'var(--success-color)' : 'var(--danger-color)', textTransform: 'capitalize' }}>
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
        return (
          <div className="modal-overlay" onClick={() => setSelectedReport(null)}>
            <div className="modal-card" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="modal-title">Message Details & Preview</h3>
                <button className="modal-close-btn" onClick={() => setSelectedReport(null)}>
                  <XIcon size={18} />
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
                      <span style={{ fontSize: '13px', fontWeight: 600, color: selectedReport.status === 'sent' ? 'var(--success-color)' : 'var(--danger-color)', textTransform: 'capitalize' }}>
                        {selectedReport.status}
                      </span>
                    </div>
                  </div>
                </div>

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
                            <FileIcon size={20} color="#7C3AED" style={{ flexShrink: 0 }} />
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
                              <SparklesIcon size={14} color="#7C3AED" />
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
          </div>
        );
      })()}
    </div>
  );
};
