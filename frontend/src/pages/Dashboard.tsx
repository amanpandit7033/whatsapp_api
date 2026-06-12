import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  DeviceIcon, 
  PlusIcon, 
  SendIcon, 
  ChartIcon, 
  KeyIcon 
} from '../components/Icons';

export const Dashboard = () => {
  const [instances, setInstances] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [totalMessages, setTotalMessages] = useState(0);
  const [weeklyStats, setWeeklyStats] = useState<any[]>([]);
  const [apiKey, setApiKey] = useState('Loading...');
  const [userData, setUserData] = useState<any>(null);
  const [copied, setCopied] = useState(false);
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

  const copyApiKey = () => {
    navigator.clipboard.writeText(apiKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const activeCount = instances.filter(i => i.status === 'connected').length;
  const sentCount = reports.filter(r => r.status === 'sent').length;
  // Calculate success rate on the current page logs or statically
  const successRate = reports.length 
    ? Math.round((reports.filter(r => r.status === 'sent').length / reports.length) * 100) 
    : 100;

  const maxChartCount = Math.max(...weeklyStats.map(d => d.count), 1);

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Welcome Banner */}
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>Overview Dashboard</h2>
        <p style={{ color: '#64748B', fontSize: '14px', margin: 0, fontWeight: 500 }}>
          Real-time delivery statistics and developer shortcuts for your WhatsApp API server.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {/* Linked Devices */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '24px 28px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="var(--accent-color)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
              <line x1="12" y1="18" x2="12.01" y2="18" />
            </svg>
          </div>
          <div>
            <p style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Linked Devices</p>
            <p style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent-color)', margin: '4px 0 0' }}>
              {activeCount} / {instances.length} Connected
            </p>
          </div>
        </div>

        {/* Total Deliveries */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '24px 28px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </div>
          <div>
            <p style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Total Messages</p>
            <p style={{ fontSize: '18px', fontWeight: 800, color: '#2563EB', margin: '4px 0 0' }}>
              {totalMessages} Sent Logs
            </p>
          </div>
        </div>

        {/* Success Rate */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '24px 28px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div>
            <p style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Delivery Rate</p>
            <p style={{ fontSize: '18px', fontWeight: 800, color: '#059669', margin: '4px 0 0' }}>
              {successRate}% Success
            </p>
          </div>
        </div>

        {/* Monthly Limit */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '24px 28px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Monthly Limit</p>
            <p style={{ fontSize: '18px', fontWeight: 800, color: '#EF4444', margin: '4px 0 0' }}>
              {userData ? `${userData.messagesSentThisMonth} / ${userData.messageLimit}` : '...'}
            </p>
            {userData && (
              <div style={{ height: '4px', background: '#F1F5F9', borderRadius: '9999px', marginTop: '6px', width: '100%', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: '9999px', background: (userData.messagesSentThisMonth / userData.messageLimit) > 0.9 ? '#EF4444' : '#F87171', width: `${Math.min(100, (userData.messagesSentThisMonth / userData.messageLimit) * 100)}%`, transition: 'width 0.5s' }} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Splits Panel */}
      <div className="api-doc-grid" style={{ alignItems: 'flex-start' }}>
        {/* Left Hand side: Metrics Visualizations & Logs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          
          {/* SVG Weekly chart */}
          <div className="card">
            <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>Weekly Delivery Volume</h3>
            <div style={{ position: 'relative', height: '170px', width: '100%', display: 'flex', alignItems: 'flex-end' }}>
              {weeklyStats.length === 0 ? (
                <div style={{ width: '100%', textAlign: 'center', color: '#94A3B8', fontSize: '13px', fontWeight: 500, paddingBottom: '20px' }}>
                  No delivery stats available.
                </div>
              ) : (
                <svg width="100%" height="100%" viewBox="0 0 500 160" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8B5CF6" />
                      <stop offset="100%" stopColor="#C4B5FD" />
                    </linearGradient>
                  </defs>
                  
                  {/* Horizontal Grid Lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
                    <line 
                      key={i} 
                      x1="0" 
                      y1={130 - ratio * 110} 
                      x2="500" 
                      y2={130 - ratio * 110} 
                      stroke="#F1F5F9" 
                      strokeWidth="1" 
                    />
                  ))}

                  {/* Bars */}
                  {weeklyStats.map((item, idx) => {
                    const barWidth = 32;
                    const x = idx * (500 / Math.max(weeklyStats.length, 1)) + (500 / Math.max(weeklyStats.length, 1)) / 2 - barWidth / 2;
                    const barHeight = Math.max((item.count / maxChartCount) * 110, 8);
                    const y = 130 - barHeight;
                    
                    return (
                      <g key={item.day + idx}>
                        {/* Bar Value Count */}
                        <text 
                          x={x + barWidth / 2} 
                          y={y - 8} 
                          textAnchor="middle" 
                          fill="#64748B" 
                          fontSize="11" 
                          fontWeight="700"
                        >
                          {item.count}
                        </text>
                        
                        {/* Rounded Bar */}
                        <rect 
                          x={x} 
                          y={y} 
                          width={barWidth} 
                          height={barHeight} 
                          rx="6" 
                          ry="6" 
                          fill="url(#barGradient)" 
                          style={{ transition: 'all 0.5s ease' }}
                        />

                        {/* X Axis Label */}
                        <text 
                          x={x + barWidth / 2} 
                          y="152" 
                          textAnchor="middle" 
                          fill="#94A3B8" 
                          fontSize="11" 
                          fontWeight="700"
                        >
                          {item.day}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              )}
            </div>
          </div>

          {/* Recent Activity Logs */}
          <div className="card" style={{ padding: '24px 0' }}>
            <h3 style={{ margin: '0 0 16px 24px', fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>Recent Deliveries</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0' }}>
                    <th style={{ padding: '12px 24px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Time</th>
                    <th style={{ padding: '12px 12px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Recipient</th>
                    <th style={{ padding: '12px 24px', fontSize: '12px', fontWeight: 600, color: '#64748B', textAlign: 'right' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ padding: '24px', textAlign: 'center', color: '#94A3B8', fontSize: '13px', fontWeight: 500 }}>
                        No recent delivery logs.
                      </td>
                    </tr>
                  ) : reports.map(r => (
                    <tr key={r.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px 24px', fontSize: '13px', color: '#64748B', fontWeight: 500 }}>
                        {new Date(r.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ padding: '12px 12px', fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                        +{r.toNumber}
                      </td>
                      <td style={{ padding: '12px 24px', textAlign: 'right' }}>
                        <span style={{ 
                          fontSize: '11px', 
                          fontWeight: 700, 
                          color: r.status === 'sent' ? 'var(--success-color)' : 'var(--danger-color)',
                          textTransform: 'uppercase'
                        }}>{r.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Hand side: Quick Actions & Integration Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          
          {/* Quick Actions Panel */}
          <div className="card">
            <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>Quick Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button onClick={() => navigate('/instances')} className="btn-primary" style={{ width: '100%', justifyContent: 'flex-start', background: '#F8FAFC', color: '#0F172A', border: '1px solid #E2E8F0', display: 'inline-flex', alignItems: 'center', gap: '12px' }}>
                <DeviceIcon size={18} color="var(--accent-color)" /> Manage Linked Numbers
              </button>
              <button onClick={() => navigate('/scan')} className="btn-primary" style={{ width: '100%', justifyContent: 'flex-start', background: '#F8FAFC', color: '#0F172A', border: '1px solid #E2E8F0', display: 'inline-flex', alignItems: 'center', gap: '12px' }}>
                <PlusIcon size={18} color="var(--success-color)" /> Register New Device
              </button>
              <button onClick={() => navigate('/broadcast')} className="btn-primary" style={{ width: '100%', justifyContent: 'flex-start', background: '#F8FAFC', color: '#0F172A', border: '1px solid #E2E8F0', display: 'inline-flex', alignItems: 'center', gap: '12px' }}>
                <SendIcon size={18} color="#2563EB" /> Create Bulk Broadcast
              </button>
              <button onClick={() => navigate('/reports')} className="btn-primary" style={{ width: '100%', justifyContent: 'flex-start', background: '#F8FAFC', color: '#0F172A', border: '1px solid #E2E8F0', display: 'inline-flex', alignItems: 'center', gap: '12px' }}>
                <ChartIcon size={18} color="#F59E0B" /> Check Full Log History
              </button>
            </div>
          </div>

          {/* Integration Credentials Box */}
          <div className="card" style={{ background: '#0F172A', border: 'none', color: '#FFFFFF' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <KeyIcon size={22} color="#FBBF24" />
              <div>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700 }}>Integration Credentials</h4>
                <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#94A3B8' }}>Base URL: {import.meta.env.VITE_API_URL}</p>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.08)', padding: '10px 14px', borderRadius: '8px' }}>
              <code style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#FBBF24', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {apiKey}
              </code>
              <button onClick={copyApiKey} style={{
                background: copied ? '#10B981' : 'rgba(255,255,255,0.15)', border: 'none', color: 'white',
                padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: '4px', transition: 'all 0.2s'
              }}>
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            
            <p style={{ margin: '14px 0 0', fontSize: '11px', color: '#64748B', fontWeight: 500, textAlign: 'center' }}>
              View full details under <span onClick={() => navigate('/docs')} style={{ color: 'var(--accent-color)', cursor: 'pointer', textDecoration: 'underline' }}>API Docs</span>
            </p>
          </div>

        </div>
      </div>

    </div>
  );
};
