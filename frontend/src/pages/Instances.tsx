import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { 
  CaretLeftIcon, 
  CaretRightIcon,
  XIcon
} from '../components/Icons';
import { Pagination } from '../components/Pagination';
import {
  GlassInstanceIcon,
  GlassCheckCircleIcon,
  GlassActivityIcon,
  GlassAlertIcon,
  GlassSearchIcon,
  GlassDownloadIcon,
  GlassPlusIcon,
  GlassEyeIcon,
  GlassRefreshIcon,
  GlassLogoutIcon,
  GlassTrashIcon,
  GlassCancelIcon,
  GlassTagIcon,
  GlassUsersIcon,
  GlassQrCodeIcon
} from '../components/GlassIcons';

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

  const [activeTab, setActiveTab] = useState<'instances' | 'pools'>('instances');
  const [pools, setPools] = useState<any[]>([]);
  const [isPoolModalOpen, setIsPoolModalOpen] = useState(false);
  const [editingPool, setEditingPool] = useState<any | null>(null);
  const [poolName, setPoolName] = useState('');
  const [selectedPoolInstances, setSelectedPoolInstances] = useState<string[]>([]);
  const [poolSaving, setPoolSaving] = useState(false);
  const [copiedPoolSlug, setCopiedPoolSlug] = useState<string | null>(null);

  useEffect(() => {
    fetchInstances();
    fetchPools();
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
    const list = (data.instances || []).filter((inst: any) => inst.status !== 'initializing');
    list.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    setInstances(list);
  };

  const handleLogout = async (id: string) => {
    showConfirm(
      'Logout Instance?',
      'Are you sure you want to log out this WhatsApp session? Any outgoing messages from this instance will fail until you re-authenticate.',
      async () => {
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL}/api/instances/${id}/logout`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          });
          if (res.status === 401) {
            localStorage.removeItem('token');
            navigate('/login');
            return;
          }
          await fetchInstances();
        } catch (e) {
          console.error('Logout error:', e);
          alert('Failed to logout session');
        }
      }
    );
  };

  const handleSync = async (id: string) => {
    setSyncingId(id);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/instances/${id}/sync`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }
      await fetchInstances();
    } catch (e) {
      console.error('Sync error:', e);
      alert('Failed to sync instance');
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
          const res = await fetch(`${import.meta.env.VITE_API_URL}/api/instances/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          });
          if (res.status === 401) {
            localStorage.removeItem('token');
            navigate('/login');
            return;
          }
          await fetchInstances();
        } catch (e) {
          console.error('Delete error:', e);
          alert('Failed to delete instance');
        }
      }
    );
  };

  const fetchPools = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/pools`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPools(data.pools || []);
      }
    } catch (e) {
      console.error('Fetch pools error:', e);
    }
  };

  const openCreatePoolModal = () => {
    setEditingPool(null);
    setPoolName('');
    setSelectedPoolInstances([]);
    setIsPoolModalOpen(true);
  };

  const openEditPoolModal = (pool: any) => {
    setEditingPool(pool);
    setPoolName(pool.name);
    setSelectedPoolInstances(pool.instanceIds || []);
    setIsPoolModalOpen(true);
  };

  const handleSavePool = async () => {
    if (!poolName.trim()) return alert('Please enter a pool name');
    if (selectedPoolInstances.length === 0) return alert('Please select at least 1 instance for this pool');
    setPoolSaving(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/pools`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          id: editingPool?.id,
          name: poolName.trim(),
          instanceIds: selectedPoolInstances
        })
      });
      if (res.ok) {
        setIsPoolModalOpen(false);
        await fetchPools();
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to save pool');
      }
    } catch (e: any) {
      alert(e?.message || 'Network error');
    } finally {
      setPoolSaving(false);
    }
  };

  const handleDeletePool = (pool: any) => {
    showConfirm(
      `Delete Pool "${pool.name}"?`,
      'Are you sure you want to delete this pool? The underlying WhatsApp instances will not be deleted, but API calls targeting this pool will fail.',
      async () => {
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL}/api/pools/${pool.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          });
          if (res.ok) {
            await fetchPools();
          }
        } catch (e) {
          console.error('Delete pool error:', e);
        }
      }
    );
  };

  const copySlug = (slug: string) => {
    navigator.clipboard.writeText(slug);
    setCopiedPoolSlug(slug);
    setTimeout(() => setCopiedPoolSlug(null), 2000);
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
          <GlassPlusIcon size={18} /> Add Instance
        </button>
      </div>
      
      {/* Stat Cards Row (Glass Icon SaaS Style) */}
      <div className="stats-grid">
        {[
          { label: 'Total Instances', val: instances.length, sub: 'Registered', badge: 'Active', bg: '#EFF6FF', color: '#2563EB', icon: GlassInstanceIcon },
          { label: 'Active Connections', val: activeCount, sub: 'Connected', badge: 'Online', bg: '#ECFDF5', color: '#059669', icon: GlassCheckCircleIcon },
          { label: 'Connection Rate', val: `${connectionRate}%`, sub: 'Overall', badge: 'High SLA', bg: '#EFF6FF', color: '#2563EB', icon: GlassActivityIcon },
          { label: 'Offline Instances', val: instances.length - activeCount, sub: 'Disconnected', badge: 'Attention', bg: '#FEF2F2', color: '#DC2626', icon: GlassAlertIcon },
        ].map(({ label, val, sub, badge, bg, color, icon: IconComp }) => (
          <div key={label} className="card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRadius: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748B' }}>{label}</span>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IconComp size={22} />
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
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('instances')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '12px',
            border: activeTab === 'instances' ? '2px solid #2563EB' : '1px solid #E2E8F0',
            background: activeTab === 'instances' ? '#EFF6FF' : '#FFFFFF',
            color: activeTab === 'instances' ? '#1D4ED8' : '#64748B',
            fontWeight: 800, fontSize: '13.5px', cursor: 'pointer', transition: 'all 0.2s ease',
            boxShadow: activeTab === 'instances' ? '0 2px 8px rgba(37,99,235,0.1)' : 'none'
          }}
        >
          <GlassInstanceIcon size={18} />
          <span>Connected Instances</span>
          <span style={{ fontSize: '11px', fontWeight: 800, background: activeTab === 'instances' ? '#2563EB' : '#F1F5F9', color: activeTab === 'instances' ? '#FFFFFF' : '#64748B', padding: '2px 8px', borderRadius: '9999px' }}>
            {instances.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pools')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '12px',
            border: activeTab === 'pools' ? '2px solid #2563EB' : '1px solid #E2E8F0',
            background: activeTab === 'pools' ? '#EFF6FF' : '#FFFFFF',
            color: activeTab === 'pools' ? '#1D4ED8' : '#64748B',
            fontWeight: 800, fontSize: '13.5px', cursor: 'pointer', transition: 'all 0.2s ease',
            boxShadow: activeTab === 'pools' ? '0 2px 8px rgba(37,99,235,0.1)' : 'none'
          }}
        >
          <GlassActivityIcon size={18} />
          <span>Multi-SIM Pools & Load Balancer</span>
          <span style={{ fontSize: '11px', fontWeight: 800, background: activeTab === 'pools' ? '#2563EB' : '#F1F5F9', color: activeTab === 'pools' ? '#FFFFFF' : '#64748B', padding: '2px 8px', borderRadius: '9999px' }}>
            {pools.length}
          </span>
        </button>
      </div>

      {activeTab === 'instances' ? (
        /* Instances Table Card */
        <div className="card" style={{ padding: '24px 0', borderRadius: '16px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', padding: '0 28px', marginBottom: '20px', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.01em' }}>Instances Directory</h3>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#2563EB', background: '#EFF6FF', padding: '3px 10px', borderRadius: '9999px' }}>
                {totalCount} Active
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
              <div style={{ position: 'relative', width: '240px' }}>
                <input
                  type="text"
                  placeholder="Search phone or ID..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="rounded-input"
                  style={{ height: '40px', paddingLeft: '40px', paddingRight: '16px', fontSize: '13px', borderRadius: '10px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}
                />
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', display: 'flex', pointerEvents: 'none' }}>
                  <GlassSearchIcon size={18} />
                </span>
              </div>
              <button onClick={handleExportCSV} style={{ 
                background: '#0F172A', border: 'none', borderRadius: '10px', padding: '0 16px', height: '40px', 
                fontSize: '13px', fontWeight: 700, color: '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                boxShadow: '0 2px 8px rgba(15,23,42,0.2)', transition: 'all 0.2s ease'
              }}>
                <GlassDownloadIcon size={18} /> Export CSV
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '14px 28px', fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em', textTransform: 'uppercase', width: '60px' }}>#</th>
                  <th style={{ padding: '14px 16px', fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em', textTransform: 'uppercase', width: '64px', textAlign: 'center' }}>DP</th>
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
                    <td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: '#94A3B8', fontSize: '14px', fontWeight: 500 }}>
                      No instances found.
                    </td>
                  </tr>
                ) : paginatedInstances.map((inst, idx) => (
                  <tr key={inst.id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s ease' }}>
                    <td style={{ padding: '16px 28px', fontSize: '13px', fontWeight: 700, color: '#64748B' }}>
                      {(startIndex + idx + 1).toString().padStart(2, '0')}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      {inst.profilePicUrl ? (
                        <img
                          src={inst.profilePicUrl}
                          alt="DP"
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '2px solid #E2E8F0',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                            display: 'inline-block',
                            verticalAlign: 'middle'
                          }}
                          onError={(e: any) => {
                            e.currentTarget.style.display = 'none';
                            const next = e.currentTarget.nextElementSibling;
                            if (next) (next as HTMLElement).style.display = 'inline-flex';
                          }}
                        />
                      ) : null}
                      <div
                        style={{
                          display: inst.profilePicUrl ? 'none' : 'inline-flex',
                          width: '38px',
                          height: '38px',
                          borderRadius: '50%',
                          background: inst.status === 'connected' ? '#EFF6FF' : '#F1F5F9',
                          border: '1.5px solid #E2E8F0',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: inst.status === 'connected' ? '#2563EB' : '#94A3B8',
                          fontWeight: 800,
                          fontSize: '13px',
                          margin: '0 auto'
                        }}
                        title={inst.phoneNumber ? `+${inst.phoneNumber}` : 'No DP'}
                      >
                        {inst.phoneNumber ? (
                          <span style={{ fontSize: '11px', fontWeight: 800 }}>
                            {inst.phoneNumber.slice(-2)}
                          </span>
                        ) : (
                          <GlassUsersIcon size={16} />
                        )}
                      </div>
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
                              border: '1px solid #DBEAFE',
                              color: '#2563EB',
                              cursor: 'pointer',
                              width: '36px',
                              height: '36px',
                              borderRadius: '10px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s ease',
                              padding: '0'
                            }}
                            title="Scan QR Code & Connect"
                          >
                            <GlassQrCodeIcon size={18} />
                          </button>
                        )}
                        <button
                          onClick={() => handleSync(inst.id)}
                          disabled={syncingId === inst.id}
                          style={{
                            background: '#F8FAFC',
                            border: '1px solid #E2E8F0',
                            color: '#64748B',
                            cursor: syncingId === inst.id ? 'not-allowed' : 'pointer',
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s ease',
                            padding: '0'
                          }}
                          title="Sync Connection"
                        >
                          <span style={{ display: 'inline-block', animation: syncingId === inst.id ? 'spin 1s linear infinite' : 'none' }}>
                            <GlassRefreshIcon size={18} />
                          </span>
                        </button>
                        {inst.status === 'connected' && (
                          <button
                            onClick={() => handleLogout(inst.id)}
                            style={{
                              background: '#FEF2F2',
                              border: '1px solid #FEE2E2',
                              color: '#DC2626',
                              cursor: 'pointer',
                              width: '36px',
                              height: '36px',
                              borderRadius: '10px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s ease',
                              padding: '0'
                            }}
                            title="Logout Session"
                          >
                            <GlassLogoutIcon size={20} />
                          </button>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '16px 28px', textAlign: 'right' }}>
                      <button 
                        onClick={() => handleDelete(inst.id)}
                        style={{ 
                          background: '#FEF2F2', border: '1px solid #FEE2E2', color: '#EF4444', cursor: 'pointer', 
                          width: '36px', height: '36px', borderRadius: '10px', display: 'inline-flex', 
                          alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease' 
                        }}
                        title="Delete Instance"
                      >
                        <GlassTrashIcon size={20} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            limit={itemsPerPage}
            onPageChange={setCurrentPage}
            itemName="instances"
          />
        </div>
      ) : (
        /* Multi-SIM Pools & Load Balancers Grid */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0F172A' }}>Active Multi-SIM Pools</h3>
              <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#64748B' }}>
                Group specific numbers together (e.g. 3 for OTP, 2 for Support). Pass <code>pool="name"</code> in your API requests.
              </p>
            </div>
            <button 
              type="button" 
              onClick={openCreatePoolModal} 
              className="btn-primary" 
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontSize: '13px' }}
            >
              <GlassPlusIcon size={18} /> + Create New Pool
            </button>
          </div>

          {pools.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '48px 24px', borderRadius: '16px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: '#EFF6FF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                <GlassActivityIcon size={32} />
              </div>
              <h4 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>No SIM Pools Created Yet</h4>
              <p style={{ color: '#64748B', fontSize: '13.5px', maxWidth: '420px', margin: '0 auto 20px', lineHeight: 1.5 }}>
                Group 2 or more WhatsApp instances into an intelligent load balancer. When sending OTPs or messages, you simply pass the pool name!
              </p>
              <button 
                type="button" 
                onClick={openCreatePoolModal} 
                className="btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}
              >
                <GlassPlusIcon size={18} /> Create Your First Pool
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
              {pools.map(pool => (
                <div key={pool.id} className="card" style={{ padding: '20px', borderRadius: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px', border: '1px solid #E2E8F0' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#EFF6FF', border: '1px solid #DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <GlassTagIcon size={20} />
                        </div>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>{pool.name}</h4>
                          <span style={{ fontSize: '12px', color: '#64748B', fontFamily: 'var(--font-mono)' }}>pool="{pool.slug}"</span>
                        </div>
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: pool.connectedCount > 0 ? '#059669' : '#DC2626', background: pool.connectedCount > 0 ? '#D1FAE5' : '#FEE2E2', padding: '3px 8px', borderRadius: '9999px', flexShrink: 0 }}>
                        {pool.connectedCount} of {pool.totalCount} Online
                      </span>
                    </div>

                    {/* API Parameter snippet */}
                    <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', margin: '12px 0' }}>
                      <code style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: '#2563EB', wordBreak: 'break-all' }}>
                        "pool": "{pool.slug}"
                      </code>
                      <button
                        type="button"
                        onClick={() => copySlug(pool.slug)}
                        style={{ background: 'none', border: 'none', color: copiedPoolSlug === pool.slug ? '#059669' : '#64748B', cursor: 'pointer', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        {copiedPoolSlug === pool.slug ? 'Copied!' : 'Copy'}
                      </button>
                    </div>

                    {/* Member SIMs List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Included Numbers:</span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {(pool.members || []).map((m: any) => (
                          <span key={m.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 600, color: '#334155', background: '#F1F5F9', border: '1px solid #E2E8F0', padding: '3px 8px', borderRadius: '6px' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: m.status === 'connected' ? '#059669' : '#DC2626' }}></span>
                            {m.phoneNumber ? `+${m.phoneNumber}` : m.id}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Pool Actions */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '12px', borderTop: '1px solid #F1F5F9' }}>
                    <button
                      type="button"
                      onClick={() => openEditPoolModal(pool)}
                      style={{ fontSize: '12px', fontWeight: 700, padding: '6px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#475569', cursor: 'pointer' }}
                    >
                      Edit Pool
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePool(pool)}
                      style={{ fontSize: '12px', fontWeight: 700, padding: '6px 12px', borderRadius: '8px', border: '1px solid #FEE2E2', background: '#FEF2F2', color: '#DC2626', cursor: 'pointer' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create / Edit Pool Modal */}
      {isPoolModalOpen && createPortal(
        <div className="modal-overlay" onClick={() => setIsPoolModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: '#EFF6FF', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <GlassTagIcon size={20} />
                </div>
                <h3 className="modal-title" style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>
                  {editingPool ? 'Edit Instance Pool' : 'Create Multi-SIM Pool'}
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setIsPoolModalOpen(false)}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: '10px', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <GlassCancelIcon size={16} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  Pool Name (e.g. "Marketing", "OTP Gateway", "Support")
                </label>
                <input
                  type="text"
                  placeholder="e.g. Marketing & OTP"
                  value={poolName}
                  onChange={e => setPoolName(e.target.value)}
                  style={{ width: '100%', height: '40px', padding: '0 14px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '14px', outline: 'none' }}
                />
                {poolName.trim() && (
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748B' }}>
                    API identifier will be: <code style={{ color: '#2563EB', fontWeight: 700 }}>pool="{poolName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')}"</code>
                  </p>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>
                  Select Member WhatsApp Numbers ({selectedPoolInstances.length} selected):
                </label>
                
                {instances.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '16px', background: '#F8FAFC', borderRadius: '10px', border: '1px dashed #CBD5E1', color: '#94A3B8', fontSize: '13px' }}>
                    No instances registered.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                    {instances.map(inst => {
                      const isChecked = selectedPoolInstances.includes(inst.id);
                      return (
                        <label 
                          key={inst.id}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '10px 14px', borderRadius: '10px', cursor: 'pointer',
                            border: isChecked ? '1.5px solid #2563EB' : '1px solid #E2E8F0',
                            background: isChecked ? '#EFF6FF' : '#F8FAFC', transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setSelectedPoolInstances(selectedPoolInstances.filter(id => id !== inst.id));
                                } else {
                                  setSelectedPoolInstances([...selectedPoolInstances, inst.id]);
                                }
                              }}
                              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                            />
                            <div>
                              <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#0F172A', fontFamily: 'var(--font-mono)' }}>{inst.id}</p>
                              {inst.phoneNumber && <p style={{ margin: '1px 0 0', fontSize: '11.5px', color: '#64748B' }}>+{inst.phoneNumber}</p>}
                            </div>
                          </div>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: inst.status === 'connected' ? '#059669' : '#94A3B8' }}>
                            {inst.status === 'connected' ? 'Online' : 'Offline'}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsPoolModalOpen(false)}
                  style={{ padding: '10px 16px', borderRadius: '10px', border: '1px solid #CBD5E1', background: '#F8FAFC', color: '#475569', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSavePool}
                  disabled={poolSaving}
                  className="btn-primary"
                  style={{ padding: '10px 20px', fontSize: '13px' }}
                >
                  {poolSaving ? 'Saving...' : (editingPool ? 'Update Pool' : 'Save Pool')}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {confirmModal.isOpen && createPortal(
        <div className="modal-overlay" onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}>
          <div className="modal-card" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ padding: '16px 20px', background: '#FFFFFF', borderBottom: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  background: '#FEF2F2',
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <GlassAlertIcon size={22} />
                </div>
                <h3 className="modal-title" style={{ fontSize: '16px', fontWeight: 700 }}>
                  {confirmModal.title}
                </h3>
              </div>
              <button 
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
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
        </div>,
        document.body
      )}
    </div>
  );
};
