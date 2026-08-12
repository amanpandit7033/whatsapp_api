import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { copyToClipboard } from '../utils/clipboard';
import { getBaseApiUrl } from '../utils/apiUrl';
import { 
  DeviceIcon, 
  SendIcon, 
  ChartIcon, 
  KeyIcon,
  CheckCircleIcon,
  CalendarIcon,
  PlusIcon,
  EyeIcon,
} from '../components/Icons';

export const Dashboard = () => {
  const [instances, setInstances] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [totalMessages, setTotalMessages] = useState(0);
  const [weeklyStats, setWeeklyStats] = useState<{ day: string; count: number }[]>([]);
  const [messageTypes, setMessageTypes] = useState({ text: 0, media: 0, interactive: 0 });
  const [deliverySla, setDeliverySla] = useState({ sent: 0, failed: 0, successRate: 100 });
  const [apiKey, setApiKey] = useState('Loading...');
  const [userData, setUserData] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      // Fetch Instances
      const instRes = await fetch(`${import.meta.env.VITE_API_URL}/api/instances`, { headers });
      if (instRes.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }
      const instData = await instRes.json();
      const filteredInst = (instData.instances || []).filter((i: any) => i.status !== 'initializing');
      setInstances(filteredInst);

      // Fetch latest 5 message reports
      const reportsRes = await fetch(`${import.meta.env.VITE_API_URL}/api/reports?limit=5`, { headers });
      const reportsData = await reportsRes.json();
      setReports(reportsData.reports || []);
      setTotalMessages(reportsData.totalCount || 0);

      // Fetch stats
      const statsRes = await fetch(`${import.meta.env.VITE_API_URL}/api/reports/stats`, { headers });
      const statsData = await statsRes.json();
      setWeeklyStats(statsData.stats || []);
      if (statsData.messageTypes) setMessageTypes(statsData.messageTypes);
      if (statsData.deliverySla) setDeliverySla(statsData.deliverySla);

      // Fetch API Key
      const meRes = await fetch(`${import.meta.env.VITE_API_URL}/api/me`, { headers });
      const meData = await meRes.json();
      setApiKey(meData.apiKey || '');
      setUserData(meData);
      if (meData.permissions) {
        localStorage.setItem('permissions', meData.permissions);
      }

    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
  };

  const copyApiKey = async () => {
    const success = await copyToClipboard(apiKey);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const copyApiUrl = async (instanceId: string) => {
    const baseUrl = getBaseApiUrl();
    const url = `${baseUrl}/api/send?number=91XXXXXXXXXX&type=text&message=Hello&instance_id=${instanceId}&access_token=${apiKey}`;
    const success = await copyToClipboard(url);
    if (success) {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  const regenerateToken = async () => {
    if (!confirm('Regenerate your access token? Your existing API integrations using the old token will stop working.')) return;
    setRegenerating(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/me/regenerate-token`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (data.apiKey) setApiKey(data.apiKey);
    } catch { alert('Failed to regenerate token'); }
    setRegenerating(false);
  };

  const activeCount = instances.filter(i => i.status === 'connected').length;
  const successRate = deliverySla.successRate;
  const slaRate = deliverySla.successRate;
  const maxChartCount = Math.max(...weeklyStats.map(d => d.count), 1);
  const peakDayObj = weeklyStats.reduce((max, curr) => curr.count > max.count ? curr : max, { day: 'Mon', count: 0 });

  const arcTotal = 204.2;
  const arcOffset = arcTotal * (1 - Math.min(100, Math.max(0, slaRate)) / 100);

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 1. Top 4 Metric Stat Cards (Shopeers Style) */}
      <div className="stats-grid">
        {/* Card 1: Linked Devices */}
        <div className="card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748B' }}>Linked Devices</span>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DeviceIcon size={16} color="#2563EB" />
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
              <span style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
                {activeCount} / {instances.length}
              </span>
              <span className="badge badge-success">▲ Connected</span>
            </div>
            <span style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px', display: 'block' }}>vs. {instances.length} total registered</span>
          </div>
        </div>

        {/* Card 2: Total Deliveries */}
        <div className="card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748B' }}>Total Messages</span>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <SendIcon size={16} color="#2563EB" />
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
              <span style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
                {totalMessages.toLocaleString()}
              </span>
              <span className="badge badge-success">▲ Real-time</span>
            </div>
            <span style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px', display: 'block' }}>All-time total dispatches</span>
          </div>
        </div>

        {/* Card 3: Success Rate */}
        <div className="card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748B' }}>Delivery Rate</span>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircleIcon size={16} color="#059669" />
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
              <span style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
                {successRate}%
              </span>
              <span className="badge badge-success">▲ Reliable</span>
            </div>
            <span style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px', display: 'block' }}>Live delivery SLA</span>
          </div>
        </div>

        {/* Card 4: Monthly Quota */}
        <div className="card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748B' }}>Monthly Quota</span>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CalendarIcon size={16} color="#D97706" />
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
              <span style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
                {userData ? userData.messagesSentThisMonth : 0}
              </span>
              <span className="badge badge-info">/ {userData ? userData.messageLimit : 1000}</span>
            </div>
            {userData && (
              <div style={{ height: '6px', background: '#F1F5F9', borderRadius: '9999px', marginTop: '8px', width: '100%', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: '9999px', background: '#2563EB', width: `${Math.min(100, (userData.messagesSentThisMonth / userData.messageLimit) * 100)}%`, transition: 'width 0.5s' }} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Middle Grid Section */}
      <div className="dashboard-grid">
        
        {/* Left Hand Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Bottom Products / Deliveries Table (Shopeers Style) */}
          <div className="card" style={{ padding: '24px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px 16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>Recent Deliveries Log</h3>
              <button onClick={() => navigate('/reports')} className="btn-outline" style={{ padding: '6px 12px', fontSize: '12px' }}>View All</button>
            </div>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0' }}>
                    <th style={{ padding: '12px 24px', fontSize: '12px', fontWeight: 700, color: '#64748B' }}>LOG ID</th>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#64748B' }}>RECIPIENT</th>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#64748B' }}>TYPE</th>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#64748B' }}>STATUS</th>
                    <th style={{ padding: '12px 24px', fontSize: '12px', fontWeight: 700, color: '#64748B', textAlign: 'right' }}>TIME</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>
                        No delivery records yet.
                      </td>
                    </tr>
                  ) : reports.map((r, i) => (
                    <tr key={r.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '14px 24px', fontSize: '13px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#64748B' }}>
                        #{r.id ? r.id.substring(0, 6) : `8300${i+1}`}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                        +{r.toNumber}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '13px', color: '#64748B', fontWeight: 500 }}>
                        {r.message?.includes('"type":"media"') ? 'Media Attachment' : r.message?.includes('"type":"interactive"') ? 'Interactive CTA' : 'Text Message'}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span className={`badge ${r.status === 'sent' ? 'badge-success' : 'badge-danger'}`}>
                          {r.status === 'sent' ? '✓ SENT' : '✕ FAILED'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 24px', textAlign: 'right', fontSize: '13px', color: '#64748B', fontWeight: 500 }}>
                        {new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Right Hand Column (Widgets & Peak Activity & SLA) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Most Active Days Bar Chart (Real Database Numbers) */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>Peak Activity Day</h3>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#2563EB' }}>
                {peakDayObj.count > 0 ? `${peakDayObj.day} (${peakDayObj.count} logs)` : 'No activity yet'}
              </span>
            </div>

            {/* Vertical Bar Chart (Real Activity Data) */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '140px', paddingTop: '20px' }}>
              {weeklyStats.length === 0 ? (
                <div style={{ width: '100%', textAlign: 'center', color: '#94A3B8', fontSize: '12px' }}>No weekly stats</div>
              ) : weeklyStats.map((item) => {
                const isPeak = item.count === peakDayObj.count && item.count > 0;
                const barHeight = item.count > 0 ? Math.max(16, Math.round((item.count / maxChartCount) * 110)) : 10;
                return (
                  <div key={item.day} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flex: 1 }}>
                    <div
                      title={`${item.day}: ${item.count} logs`}
                      style={{
                        width: '24px',
                        height: `${barHeight}px`,
                        borderRadius: '8px',
                        background: isPeak ? 'linear-gradient(180deg, #3B82F6 0%, #2563EB 100%)' : item.count > 0 ? '#93C5FD' : '#E2E8F0',
                        boxShadow: isPeak ? '0 4px 12px rgba(37, 99, 235, 0.4)' : 'none',
                        transition: 'all 0.3s ease',
                      }}
                    />
                    <span style={{ fontSize: '11px', fontWeight: isPeak ? 800 : 600, color: isPeak ? '#2563EB' : '#94A3B8' }}>{item.day}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
