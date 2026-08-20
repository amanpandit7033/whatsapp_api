import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GlassSendIcon,
  GlassPlusIcon,
  GlassEyeIcon,
  GlassRefreshIcon,
  GlassCancelIcon,
  GlassTagIcon,
  GlassSearchIcon,
  GlassBatchIcon,
  GlassCallIcon,
  GlassStarSparkleIcon,
  GlassCheckCircleIcon
} from '../components/GlassIcons';

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

export const Broadcast = () => {
  const navigate = useNavigate();

  const [campaigns, setCampaigns] = useState<IBroadcastCampaign[]>([]);
  const [campaignTotal, setCampaignTotal] = useState(0);
  const [globalRecipients, setGlobalRecipients] = useState(0);
  const [globalSent, setGlobalSent] = useState(0);
  const [globalFailed, setGlobalFailed] = useState(0);
  const [campaignPage, setCampaignPage] = useState(1);
  const [campaignSearch, setCampaignSearch] = useState('');
  const [campaignLoading, setCampaignLoading] = useState(false);

  useEffect(() => {
    fetchCampaigns(true);
  }, [campaignPage, campaignSearch]);

  // Auto-refresh when any batch is currently dispatching
  useEffect(() => {
    const hasRunning = campaigns.some(c => c.status === 'running');
    if (!hasRunning) return;
    const timer = setInterval(() => {
      fetchCampaigns(false);
    }, 3000);
    return () => clearInterval(timer);
  }, [campaigns, campaignPage, campaignSearch]);

  const fetchCampaigns = async (showLoading = true) => {
    if (showLoading) setCampaignLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/broadcast/campaigns?page=${campaignPage}&limit=10&search=${encodeURIComponent(campaignSearch)}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data.campaigns || []);
        setCampaignTotal(data.totalCount || 0);
        setGlobalRecipients(data.totalRecipients || 0);
        setGlobalSent(data.totalSent || 0);
        setGlobalFailed(data.totalFailed || 0);
      }
    } catch (err) {
      console.error('Failed to fetch campaigns:', err);
    } finally {
      if (showLoading) setCampaignLoading(false);
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this campaign batch and its number logs?')) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/broadcast/campaigns/${campaignId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        fetchCampaigns();
      }
    } catch (err) {
      alert('Failed to delete campaign batch');
    }
  };

  const totalBatches = campaignTotal;
  const totalBroadcastSent = globalSent;
  const totalBroadcastFailed = globalFailed;
  const totalBroadcastRecipients = globalRecipients;
  const overallSuccessRate = totalBroadcastRecipients > 0 
    ? ((totalBroadcastSent / totalBroadcastRecipients) * 100).toFixed(1) 
    : '100.0';

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '60px' }}>
      
      {/* ─────────────────────────────────────────────────────────────
          PAGE HEADER WITH TOP-RIGHT 'NEW BROADCAST' BUTTON
          ───────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 900, color: '#0F172A', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
            Broadcast Batches
          </h2>
          <p style={{ color: '#64748B', fontSize: '13.5px', margin: 0, fontWeight: 500 }}>
            Manage multi-SIM broadcast batches, monitor delivery logs, and track recipient reach.
          </p>
        </div>

        {/* Top-Right Primary Action Button */}
        <div>
          <button
            onClick={() => navigate('/broadcast/new')}
            className="btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '11px 22px',
              borderRadius: '12px',
              fontSize: '13.5px',
              fontWeight: 800,
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <GlassPlusIcon size={18} />
            <span>New Broadcast</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          KPI STATS ROW
          ───────────────────────────────────────────────────────────── */}
      <div className="stats-grid">
        <div className="card" style={{ padding: '20px 24px', borderRadius: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748B' }}>Total Campaigns</span>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <GlassBatchIcon size={20} />
            </div>
          </div>
          <p style={{ fontSize: '26px', fontWeight: 900, color: '#0F172A', margin: 0 }}>{totalBatches}</p>
          <span style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px', display: 'block' }}>Saved Broadcast Batches</span>
        </div>

        <div className="card" style={{ padding: '20px 24px', borderRadius: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748B' }}>Total Numbers</span>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <GlassCallIcon size={20} />
            </div>
          </div>
          <p style={{ fontSize: '26px', fontWeight: 900, color: '#059669', margin: 0 }}>{totalBroadcastRecipients.toLocaleString()}</p>
          <span style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px', display: 'block' }}>Total Broadcast Recipients</span>
        </div>

        <div className="card" style={{ padding: '20px 24px', borderRadius: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748B' }}>Delivered Messages</span>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <GlassCheckCircleIcon size={20} />
            </div>
          </div>
          <p style={{ fontSize: '26px', fontWeight: 900, color: '#2563EB', margin: 0 }}>{totalBroadcastSent.toLocaleString()}</p>
          <span style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px', display: 'block' }}>Successfully Delivered</span>
        </div>

        <div className="card" style={{ padding: '20px 24px', borderRadius: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748B' }}>Success Rate</span>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <GlassStarSparkleIcon size={20} />
            </div>
          </div>
          <p style={{ fontSize: '26px', fontWeight: 900, color: '#D97706', margin: 0 }}>{overallSuccessRate}%</p>
          <span style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px', display: 'block' }}>{totalBroadcastFailed} Failed Messages</span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          CAMPAIGN BATCHES TABLE CARD
          ───────────────────────────────────────────────────────────── */}
      <div className="card" style={{ padding: '24px 0', borderRadius: '16px' }}>
        
        {/* Header & Search Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px 20px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>All Campaign Batches</h3>
            <p style={{ color: '#64748B', fontSize: '13px', margin: 0, fontWeight: 500 }}>Click the View button on any batch to inspect detailed number delivery reports.</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ position: 'relative', width: '260px' }}>
              <GlassSearchIcon size={18} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                type="text"
                placeholder="Search campaign name..."
                value={campaignSearch}
                onChange={e => { setCampaignSearch(e.target.value); setCampaignPage(1); }}
                className="rounded-input"
                style={{ paddingRight: '38px', height: '40px', borderRadius: '10px' }}
              />
            </div>
            <button
              onClick={fetchCampaigns}
              className="btn-outline"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: 700 }}
              title="Refresh campaigns"
            >
              <GlassRefreshIcon size={16} /> Refresh
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0' }}>
                <th style={{ padding: '14px 24px', fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em', textTransform: 'uppercase' }}>CAMPAIGN BATCH</th>
                <th style={{ padding: '14px 16px', fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em', textTransform: 'uppercase' }}>TYPE</th>
                <th style={{ padding: '14px 16px', fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em', textTransform: 'uppercase' }}>NUMBERS</th>
                <th style={{ padding: '14px 16px', fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em', textTransform: 'uppercase' }}>DELIVERY STATS</th>
                <th style={{ padding: '14px 16px', fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em', textTransform: 'uppercase' }}>STATUS</th>
                <th style={{ padding: '14px 16px', fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em', textTransform: 'uppercase' }}>DATE & TIME</th>
                <th style={{ padding: '14px 24px', fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em', textTransform: 'uppercase', textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((camp) => {
                const rate = camp.totalCount > 0 ? ((camp.sentCount / camp.totalCount) * 100).toFixed(0) : '0';
                return (
                  <tr 
                    key={camp.id}
                    style={{ borderBottom: '1px solid #F1F5F9' }}
                  >
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <GlassBatchIcon size={18} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontWeight: 800, fontSize: '14px', color: '#0F172A', margin: 0 }}>{camp.name}</p>
                          {camp.poolName ? (
                            <span style={{ fontSize: '11px', color: '#2563EB', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                              <GlassTagIcon size={12} /> {camp.poolName}
                            </span>
                          ) : camp.instanceId ? (
                            <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, display: 'block', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                              SIM: {camp.instanceId}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '16px 16px' }}>
                      <span style={{
                        padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 800, textTransform: 'capitalize',
                        background: camp.messageType === 'interactive' ? '#F5F3FF' : '#EFF6FF',
                        color: camp.messageType === 'interactive' ? '#7C3AED' : '#2563EB'
                      }}>
                        {camp.messageType}
                      </span>
                    </td>

                    <td style={{ padding: '16px 16px', fontWeight: 800, fontSize: '14px', color: '#0F172A' }}>
                      {camp.totalCount.toLocaleString()}
                    </td>

                    <td style={{ padding: '16px 16px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 800, color: '#059669' }}>{camp.sentCount} sent</span>
                          {camp.failedCount > 0 && <span style={{ fontSize: '12px', fontWeight: 800, color: '#DC2626' }}>· {camp.failedCount} failed</span>}
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', marginLeft: 'auto' }}>{rate}%</span>
                        </div>
                        <div style={{ width: '130px', height: '6px', background: '#E2E8F0', borderRadius: '9999px', overflow: 'hidden' }}>
                          <div style={{ width: `${rate}%`, height: '100%', background: '#059669', borderRadius: '9999px' }} />
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '16px 16px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 800,
                        background: camp.status === 'completed' ? '#D1FAE5' : camp.status === 'running' ? '#EFF6FF' : '#FEE2E2',
                        color: camp.status === 'completed' ? '#065F46' : camp.status === 'running' ? '#1D4ED8' : '#991B1B'
                      }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: camp.status === 'completed' ? '#059669' : camp.status === 'running' ? '#2563EB' : '#DC2626' }} />
                        {camp.status === 'completed' ? 'Completed' : camp.status === 'running' ? 'Running' : 'Failed'}
                      </span>
                    </td>

                    <td style={{ padding: '16px 16px', fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
                      {new Date(camp.createdAt).toLocaleDateString()} {new Date(camp.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>

                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                        <button
                          onClick={() => navigate(`/broadcast/batch/${camp.id}`)}
                          title="View all numbers in this batch"
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                            background: '#EFF6FF', border: '1px solid #DBEAFE', borderRadius: '8px',
                            padding: '6px 12px', fontSize: '12px', fontWeight: 800, color: '#2563EB',
                            cursor: 'pointer'
                          }}
                        >
                          <GlassEyeIcon size={14} /> <span>View</span>
                        </button>
                        <button
                          onClick={() => handleDeleteCampaign(camp.id)}
                          title="Delete campaign"
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            background: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: '8px',
                            padding: '6px 10px', fontSize: '12px', fontWeight: 700, color: '#DC2626',
                            cursor: 'pointer'
                          }}
                        >
                          <GlassCancelIcon size={14} /> <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {campaigns.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: '48px 24px', textAlign: 'center', color: '#94A3B8', fontWeight: 500 }}>
                    {campaignLoading ? 'Loading campaigns...' : 'No broadcast campaign batches recorded yet. Click "New Broadcast" above to launch your first campaign.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {Math.ceil(campaignTotal / 10) > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px 0', borderTop: '1px solid #F1F5F9' }}>
            <button
              disabled={campaignPage === 1}
              onClick={() => setCampaignPage(p => Math.max(1, p - 1))}
              className="btn-outline"
              style={{ padding: '6px 14px', fontSize: '12px', fontWeight: 700 }}
            >
              ← Prev
            </button>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748B' }}>
              Page {campaignPage} of {Math.ceil(campaignTotal / 10)}
            </span>
            <button
              disabled={campaignPage >= Math.ceil(campaignTotal / 10)}
              onClick={() => setCampaignPage(p => p + 1)}
              className="btn-outline"
              style={{ padding: '6px 14px', fontSize: '12px', fontWeight: 700 }}
            >
              Next →
            </button>
          </div>
        )}
      </div>

    </div>
  );
};
