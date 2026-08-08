import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  PlusIcon, 
  SearchIcon, 
  ExportIcon, 
  TrashIcon, 
  CaretLeftIcon, 
  CaretRightIcon,
  EyeIcon,
  LogoutIcon,
  XIcon,
  RefreshIcon,
  DeviceIcon,
  CheckCircleIcon,
  ChartIcon,
  WarningIcon,
} from '../components/Icons';
import {
  Glass3DDeviceIcon,
  Glass3DShieldIcon,
  Glass3DChartIcon,
  Glass3DCalendarIcon,
} from '../components/Glass3DIcons';

export const Instances = () => {
  const [instances, setInstances] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const itemsPerPage = 10;
  const navigate = useNavigate();

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm
    });
  };

  useEffect(() => {
    fetchInstances();
  }, []);

  const fetchInstances = async () => {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/instances`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    if (res.status === 401) {
      localStorage.removeItem('token');
      navigate('/login');
      return;
    }
    const data = await res.json();
    setInstances((data.instances || []).filter((inst: any) => inst.status !== 'initializing'));
  };

  const handleLogout = async (id: string) => {
    showConfirm(
      'Logout Instance?',
      'Are you sure you want to log out this WhatsApp session? Any outgoing messages from this instance will fail until you re-authenticate.',
      async () => {
        try {
          await fetch(`${import.meta.env.VITE_API_URL}/api/instances/${id}/logout`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          });
          fetchInstances();
        } catch { alert('Failed to logout'); }
      }
    );
  };

  const handleSync = async (id: string) => {
    setSyncingId(id);
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/instances/${id}/sync`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      fetchInstances();
    } catch {
      alert('Failed to sync');
    } finally {
      setSyncingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    showConfirm(
      'Delete Instance?',
      'Are you sure you want to delete this instance? This action is permanent and will remove all log data associated with this instance.',
      async () => {
        try {
          await fetch(`${import.meta.env.VITE_API_URL}/api/instances/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          });
          fetchInstances();
        } catch { alert('Failed to delete'); }
      }
    );
  };

  const handleExportCSV = () => {
    if (instances.length === 0) return alert('No instances to export');
    const headers = ['#', 'Instance ID', 'Phone Number', 'Status'];
    const rows = instances.map((inst, idx) => [
      (idx + 1).toString(),
      inst.id,
      inst.phoneNumber ? `+${inst.phoneNumber}` : '-',
      inst.status
    ]);
    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'instances_list.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activeCount = instances.filter(i => i.status === 'connected').length;
  const connectionRate = instances.length ? Math.round((activeCount / instances.length) * 100) : 0;

  // Filter & Paginate
  const filteredInstances = instances.filter((inst: any) => {
    const q = searchQuery.toLowerCase();
    return inst.id.toLowerCase().includes(q) || (inst.phoneNumber && inst.phoneNumber.toLowerCase().includes(q));
  });

  const totalCount = filteredInstances.length;
  const totalPages = Math.ceil(totalCount / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedInstances = filteredInstances.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px', letterSpacing: '-0.02em' }}>WhatsApp Instances</h2>
          <p style={{ color: '#64748B', fontSize: '14px', margin: 0, fontWeight: 500 }}>Create and link multiple WhatsApp numbers to use via API.</p>
        </div>
        <button onClick={() => navigate('/scan')} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <PlusIcon size={16} /> Add Instance
        </button>
      </div>
      
      {/* Stat Cards Row (Shopeers Style) */}
      <div className="stats-grid">
        {[
          { label: 'Total Instances', val: instances.length, sub: 'Registered', badge: 'Active', bg: '#EFF6FF', color: '#2563EB', icon: DeviceIcon },
          { label: 'Active Connections', val: activeCount, sub: 'Connected', badge: 'Online', bg: '#D1FAE5', color: '#059669', icon: CheckCircleIcon },
          { label: 'Connection Rate', val: `${connectionRate}%`, sub: 'Overall', badge: 'High SLA', bg: '#EFF6FF', color: '#2563EB', icon: ChartIcon },
          { label: 'Offline Instances', val: instances.length - activeCount, sub: 'Disconnected', badge: 'Attention', bg: '#FEE2E2', color: '#DC2626', icon: WarningIcon },
        ].map(({ label, val, sub, badge, bg, color, icon: IconComp }) => (
          <div key={label} className="card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748B' }}>{label}</span>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IconComp size={16} color={color} />
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                <span style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>{val}</span>
                <span className={`badge ${badge === 'Attention' ? 'badge-danger' : 'badge-success'}`}>▲ {badge}</span>
              </div>
              <span style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px', display: 'block' }}>{sub}</span>
            </div>
          </div>
        ))}
      </div>      {/* Instances Table Card (Shopeers Redesigned SaaS Style) */}
      <div className="card" style={{ padding: '24px 0' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', padding: '0 28px', marginBottom: '20px', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.01em' }}>Instances Directory</h3>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#2563EB', background: '#EFF6FF', padding: '3px 10px', borderRadius: '9999px' }}>
              {totalCount} Active
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: '220px' }}>
              <input
                type="text"
                placeholder="Search phone or ID..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="rounded-input"
                style={{ height: '38px', paddingLeft: '38px', paddingRight: '16px', fontSize: '13px', borderRadius: '10px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}
              />
              <SearchIcon size={16} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
            <button onClick={handleExportCSV} style={{ 
              background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '0 16px', height: '38px', 
              fontSize: '13px', fontWeight: 700, color: '#0F172A', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)', transition: 'all 0.2s ease'
            }}>
              <ExportIcon size={14} color="#2563EB" /> Export CSV
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0' }}>
                <th style={{ padding: '14px 28px', fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em', textTransform: 'uppercase', width: '60px' }}>#</th>
                <th style={{ padding: '14px 16px', fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Instance ID</th>
                <th style={{ padding: '14px 16px', fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Linked Phone</th>
                <th style={{ padding: '14px 16px', fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '14px 16px', fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Manage</th>
                <th style={{ padding: '14px 28px', fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em', textTransform: 'uppercase', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedInstances.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: '#94A3B8', fontSize: '14px', fontWeight: 500 }}>
                    No instances found.
                  </td>
                </tr>
              ) : paginatedInstances.map((inst, idx) => (
                <tr key={inst.id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s ease' }}>
                  <td style={{ padding: '16px 28px', fontSize: '13px', fontWeight: 700, color: '#64748B' }}>
                    {(startIndex + idx + 1).toString().padStart(2, '0')}
                  </td>
                  <td style={{ padding: '16px 16px', fontSize: '14px', fontWeight: 800, color: '#0F172A', fontFamily: 'var(--font-mono)' }}>
                    {inst.id}
                  </td>
                  <td style={{ padding: '16px 16px', fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                    {inst.phoneNumber ? `+${inst.phoneNumber}` : <span style={{ color: '#94A3B8', fontWeight: 500 }}>Not paired</span>}
                  </td>
                  <td style={{ padding: '16px 16px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: inst.status === 'connected' ? '#D1FAE5' : '#FEE2E2', padding: '4px 12px', borderRadius: '9999px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: inst.status === 'connected' ? '#059669' : '#DC2626' }}></span>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: inst.status === 'connected' ? '#059669' : '#DC2626', textTransform: 'capitalize' }}>
                        {inst.status}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '16px 16px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {inst.status !== 'connected' && (
                        <button
                          onClick={() => navigate(`/scan?id=${inst.id}`)}
                          style={{
                            background: '#EFF6FF',
                            border: 'none',
                            color: '#2563EB',
                            cursor: 'pointer',
                            width: '34px',
                            height: '34px',
                            borderRadius: '10px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s ease',
                            padding: '0'
                          }}
                          title="View / Scan QR Code"
                        >
                          <EyeIcon size={16} color="#2563EB" />
                        </button>
                      )}
                      <button
                        onClick={() => handleSync(inst.id)}
                        disabled={syncingId === inst.id}
                        style={{
                          background: '#EFF6FF',
                          border: 'none',
                          color: '#2563EB',
                          cursor: syncingId === inst.id ? 'not-allowed' : 'pointer',
                          width: '34px',
                          height: '34px',
                          borderRadius: '10px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s ease',
                          padding: '0',
                          opacity: syncingId === inst.id ? 0.5 : 1
                        }}
                        title="Sync Instance Status"
                      >
                        <RefreshIcon size={16} color="#2563EB" />
                      </button>
                      {inst.status === 'connected' && (
                        <button
                          onClick={() => handleLogout(inst.id)}
                          style={{
                            background: '#FEE2E2',
                            border: 'none',
                            color: '#DC2626',
                            cursor: 'pointer',
                            width: '34px',
                            height: '34px',
                            borderRadius: '10px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s ease',
                            padding: '0'
                          }}
                          title="Logout Session"
                        >
                          <LogoutIcon size={16} color="#DC2626" />
                        </button>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '16px 28px', textAlign: 'right' }}>
                    <button 
                      onClick={() => handleDelete(inst.id)}
                      style={{ 
                        background: '#FEF2F2', border: 'none', color: '#EF4444', cursor: 'pointer', 
                        width: '34px', height: '34px', borderRadius: '10px', display: 'inline-flex', 
                        alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease' 
                      }}
                      title="Delete Instance"
                    >
                      <TrashIcon size={16} color="#EF4444" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 24px 0' }}>
            <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 500 }}>
              Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, totalCount)} of {totalCount} Results
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} style={{ background: 'none', border: 'none', color: currentPage === 1 ? '#CBD5E1' : '#64748B', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center' }}>
                <CaretLeftIcon size={18} />
              </button>
              <span style={{ background: 'var(--accent-color)', color: '#FFFFFF', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', fontSize: '13px', fontWeight: 600 }}>{currentPage}</span>
              <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)} style={{ background: 'none', border: 'none', color: currentPage >= totalPages ? '#CBD5E1' : '#64748B', cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center' }}>
                <CaretRightIcon size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {confirmModal.isOpen && (
        <div className="modal-overlay" onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}>
          <div className="modal-card" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ padding: '16px 20px', background: '#FFFFFF', borderBottom: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  background: '#FEE2E2',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--danger-color)'
                }}>
                  <WarningCircleIcon size={20} />
                </div>
                <h3 className="modal-title" style={{ fontSize: '16px', fontWeight: 700 }}>
                  {confirmModal.title}
                </h3>
              </div>
              <button 
                className="modal-close-btn" 
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                style={{ width: '28px', height: '28px' }}
              >
                <XIcon size={16} />
              </button>
            </div>
            
            <div className="modal-body" style={{ padding: '0 20px 20px', gap: '16px' }}>
              <p style={{ fontSize: '14px', color: '#64748B', lineHeight: '1.5', margin: '0', fontWeight: 500 }}>
                {confirmModal.message}
              </p>
              
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  style={{
                    background: '#F1F5F9',
                    border: 'none',
                    color: '#475569',
                    padding: '10px 16px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    confirmModal.onConfirm();
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                  }}
                  style={{
                    background: 'var(--danger-color)',
                    border: 'none',
                    color: '#FFFFFF',
                    padding: '10px 16px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
