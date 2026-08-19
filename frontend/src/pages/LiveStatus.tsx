import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  GlassShieldIcon,
  GlassUserIcon,
  GlassUsersIcon,
  GlassUserPlusIcon,
  GlassSearchIcon,
  GlassRefreshIcon,
  GlassDownloadIcon,
  GlassCalendarIcon
} from '../components/GlassIcons';
import { SearchableSelect } from '../components/SearchableSelect';

const getTodayStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const LiveStatus = () => {
  const navigate = useNavigate();
  const isAdmin = localStorage.getItem('isAdmin') === 'true';
  const isReseller = localStorage.getItem('isReseller') === 'true' || localStorage.getItem('role') === 'reseller';

  // Date Filter States (Direct From and To dates)
  const [startDate, setStartDate] = useState<string>(getTodayStr());
  const [endDate, setEndDate] = useState<string>(getTodayStr());

  // Filter States
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [resellerFilter, setResellerFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  // Live Usage Response Data
  const [liveData, setLiveData] = useState<{
    totals: any;
    resellers: any[];
    users?: any[];
    clients?: any[];
    dailyTrend?: Array<{ date: string; total: number; delivered: number; failed: number }>;
    range: string;
    startDate: string;
    endDate: string;
  } | null>(null);

  const [loading, setLoading] = useState(true);

  // Fetch initial report on mount
  useEffect(() => {
    fetchLiveStats();
  }, []);

  const fetchLiveStats = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const endpoint = isAdmin ? '/api/admin/live-usage' : '/api/reseller/live-usage';
      const params = new URLSearchParams({
        range: 'custom',
        startDate: startDate || getTodayStr(),
        endDate: endDate || startDate || getTodayStr(),
        search: search.trim(),
        role: roleFilter,
        resellerId: resellerFilter
      });

      const res = await fetch(`${import.meta.env.VITE_API_URL}${endpoint}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      if (res.status === 401 || res.status === 403) {
        navigate('/login');
        return;
      }

      const data = await res.json();
      setLiveData(data);
    } catch (e) {
      console.error('Failed to fetch live stats:', e);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  const rawUsers = liveData?.users || liveData?.clients || [];
  const usersList = [...rawUsers].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Export Daily Statistics as CSV
  const handleExportCSV = () => {
    if (!usersList.length) return;
    const headers = ['Username', 'Role', 'Belonging / Reseller', 'Total Sent', 'Delivered (Sent)', 'Failed', 'SLA Rate', 'Month Sent', 'Month Limit', 'Created At'];
    const rows = usersList.map((u: any) => [
      `"${u.username}"`,
      `"${u.role}"`,
      `"${u.resellerName || 'Direct'}"`,
      u.totalSent,
      u.deliveredCount,
      u.failedCount,
      `"${u.successRate}"`,
      u.messagesSentThisMonth,
      u.messageLimit,
      `"${new Date(u.createdAt).toLocaleDateString()}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `daily_usage_report_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSetToday = () => {
    const today = getTodayStr();
    setStartDate(today);
    setEndDate(today);
  };

  const handleSetYesterday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const yest = d.toISOString().split('T')[0];
    setStartDate(yest);
    setEndDate(yest);
  };

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
            Daily Usage & Live Status Reports
          </h2>
          <p style={{ color: '#64748B', fontSize: '14px', margin: 0, fontWeight: 500 }}>
            Query independent daily traffic records, delivery SLA, failed messages, and parent reseller belongings.
          </p>
        </div>

        {/* Header Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* 1-Click Refresh Button */}
          <button
            onClick={() => fetchLiveStats()}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '10px',
              border: '1px solid #CBD5E1',
              background: '#FFFFFF',
              color: '#0F172A',
              fontSize: '13px',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
            }}
          >
            <GlassRefreshIcon
              size={16}
              style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }}
            />
            <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCSV}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '10px',
              border: 'none',
              background: '#0F172A',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(15,23,42,0.2)'
            }}
          >
            <GlassDownloadIcon size={16} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Date Filter & Toolbar Card */}
      <div
        className="card"
        style={{
          padding: '20px 24px',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          background: '#FFFFFF',
          boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
        }}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchLiveStats();
          }}
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
              gap: '14px',
              alignItems: 'flex-end'
            }}
          >
            {/* From Date */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em', marginBottom: '6px', textTransform: 'uppercase' }}>
                From Date
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
                  required
                />
              </div>
            </div>

            {/* To Date */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em', marginBottom: '6px', textTransform: 'uppercase' }}>
                To Date
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
                  required
                />
              </div>
            </div>

            {/* Role Filter (Admin Only) */}
            {isAdmin && (
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Role
                </label>
                <SearchableSelect
                  value={roleFilter}
                  onChange={(val) => setRoleFilter(val)}
                  placeholder="All Roles"
                  searchPlaceholder="Filter role..."
                  options={[
                    { value: 'all', label: 'All Roles' },
                    { value: 'user', label: 'Clients Only', badge: 'Client', badgeColor: { bg: '#EFF6FF', text: '#2563EB' } },
                    { value: 'reseller', label: 'Resellers Only', badge: 'Reseller', badgeColor: { bg: '#FEF3C7', text: '#B45309' } },
                    { value: 'admin', label: 'Admins Only', badge: 'Admin', badgeColor: { bg: '#F3E8FF', text: '#7C3AED' } },
                  ]}
                />
              </div>
            )}

            {/* Belonging Filter (Admin Only) */}
            {isAdmin && (
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Belonging
                </label>
                <SearchableSelect
                  value={resellerFilter}
                  onChange={(val) => setResellerFilter(val)}
                  placeholder="All User Belongings"
                  searchPlaceholder="Search belonging / reseller..."
                  options={[
                    { value: 'all', label: 'All User Belongings' },
                    { value: 'direct', label: 'Direct / Admin Accounts', badge: 'Direct' },
                    ...(liveData?.resellers?.map((r: any) => ({
                      value: r.id,
                      label: r.username,
                      badge: 'Reseller',
                      badgeColor: { bg: '#FEF3C7', text: '#B45309' }
                    })) || [])
                  ]}
                />
              </div>
            )}

            {/* Search Username */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em', marginBottom: '6px', textTransform: 'uppercase' }}>
                Search Username
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <span style={{ position: 'absolute', left: '12px', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                  <GlassUserIcon size={16} />
                </span>
                <input
                  type="text"
                  placeholder="Filter username..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
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
          </div>

          {/* Action & Preset Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', borderTop: '1px solid #E2E8F0', paddingTop: '14px' }}>
            {/* Quick Date Presets & Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'inline-flex', background: '#FFFFFF', padding: '3px', borderRadius: '10px', border: '1px solid #CBD5E1', gap: '3px' }}>
                <button
                  type="button"
                  onClick={handleSetToday}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    background: startDate === getTodayStr() && endDate === getTodayStr() ? '#EFF6FF' : 'transparent',
                    color: startDate === getTodayStr() && endDate === getTodayStr() ? '#2563EB' : '#64748B',
                    fontWeight: startDate === getTodayStr() && endDate === getTodayStr() ? 800 : 600,
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={handleSetYesterday}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#FFFFFF',
                    color: '#64748B',
                    fontWeight: 600,
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.color = '#0F172A'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.color = '#64748B'; }}
                >
                  Yesterday
                </button>
              </div>

              <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
                Press Enter or click Show Report to update stats
              </span>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                onClick={() => {
                  setStartDate(getTodayStr());
                  setEndDate(getTodayStr());
                  setRoleFilter('all');
                  setResellerFilter('all');
                  setSearch('');
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.color = '#0F172A'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.color = '#475569'; }}
              >
                <GlassRefreshIcon size={16} />
                <span>Reset</span>
              </button>

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
                <span>{loading ? 'Generating Report...' : 'Show Report'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Daily Historical Trend Timeline (if multiple dates in range) */}
      {liveData?.dailyTrend && liveData.dailyTrend.length > 1 && (
        <div className="card" style={{ padding: '20px 24px', borderRadius: '18px', border: '1px solid #E2E8F0', background: '#FFFFFF' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                Daily Traffic Distribution ({liveData.dailyTrend.length} Days)
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: '#64748B' }}>
                Stored historical daily delivery trends over selected timeframe.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12px', fontWeight: 700 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#16A34A' }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: '#16A34A' }} /> Delivered
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#DC2626' }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: '#DC2626' }} /> Failed
              </div>
            </div>
          </div>

          {/* Simple Clean Responsive Bar Graph */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', height: '140px', paddingTop: '10px', overflowX: 'auto' }}>
            {(() => {
              const maxVal = Math.max(...liveData.dailyTrend.map(d => d.total), 1);
              return liveData.dailyTrend.map(d => {
                const totalPct = Math.round((d.total / maxVal) * 100);
                const delPct = d.total > 0 ? (d.delivered / d.total) * 100 : 100;
                return (
                  <div key={d.date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: '42px', height: '100%', justifyContent: 'flex-end' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#0F172A', marginBottom: '4px' }}>
                      {d.total.toLocaleString()}
                    </div>
                    <div style={{ width: '100%', maxWidth: '32px', height: `${Math.max(6, totalPct)}%`, background: '#DC2626', borderRadius: '6px 6px 0 0', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                      <div style={{ width: '100%', height: `${delPct}%`, background: '#16A34A' }} />
                    </div>
                    <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748B', marginTop: '6px', whiteSpace: 'nowrap' }}>
                      {d.date.slice(5)}
                    </span>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* Main Live User Usage Table */}
      <div className="card" style={{ padding: 0, borderRadius: '18px', overflow: 'hidden', border: '1px solid #E2E8F0', background: '#FFFFFF' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
              Daily Usage Statistics ({usersList.length} Active {usersList.length === 1 ? 'Account' : 'Accounts'} With Traffic)
            </h3>
            <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#64748B', fontWeight: 500 }}>
              Showing only users who sent messages in the selected date range.
            </p>
          </div>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#059669', background: '#DCFCE7', padding: '4px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }} /> Live DB Sync
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                <th style={{ padding: '14px 20px', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>USER ACCOUNT</th>
                {isAdmin && <th style={{ padding: '14px 14px', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>ROLE</th>}
                <th style={{ padding: '14px 14px', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>BELONGING</th>
                <th style={{ padding: '14px 14px', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>PERIOD TOTAL</th>
                <th style={{ padding: '14px 14px', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>DELIVERED</th>
                <th style={{ padding: '14px 14px', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>FAILED</th>
                <th style={{ padding: '14px 14px', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>SLA RATE</th>
                <th style={{ padding: '14px 20px', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>MONTHLY USAGE</th>
              </tr>
            </thead>
            <tbody>
              {usersList.map((u: any) => {
                const isUserReseller = u.role === 'reseller' || u.isReseller;
                const monthlyUsagePct = Math.min(100, Math.round((u.messagesSentThisMonth / (u.messageLimit || 1)) * 100));
                return (
                  <tr key={u.id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s ease' }}>
                    {/* User Account */}
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{ fontWeight: 800, fontSize: '14px', color: '#0F172A' }}>{u.username}</span>
                    </td>

                    {/* Role */}
                    {isAdmin && (
                      <td style={{ padding: '14px 14px' }}>
                        {u.isAdmin ? (
                          <span style={{ background: '#F3E8FF', color: '#7C3AED', padding: '3px 9px', borderRadius: '6px', fontSize: '11px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <GlassShieldIcon size={13} /> Admin
                          </span>
                        ) : isUserReseller ? (
                          <span style={{ background: '#FEF3C7', color: '#B45309', padding: '3px 9px', borderRadius: '6px', fontSize: '11px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <GlassUserPlusIcon size={13} /> Reseller
                          </span>
                        ) : (
                          <span style={{ background: '#EFF6FF', color: '#2563EB', padding: '3px 9px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <GlassUserIcon size={13} /> Client
                          </span>
                        )}
                      </td>
                    )}

                    {/* Belonging / Reseller */}
                    <td style={{ padding: '14px 14px' }}>
                      <span style={{
                        fontSize: '11.5px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: u.resellerId ? '#FEF3C7' : '#F1F5F9',
                        color: u.resellerId ? '#B45309' : '#475569'
                      }}>
                        {u.resellerId ? `${u.resellerName}` : (u.isAdmin ? 'System Admin' : 'Direct / Admin')}
                      </span>
                    </td>

                    {/* Period Total */}
                    <td style={{ padding: '14px 14px' }}>
                      <span style={{ fontWeight: 800, color: '#0F172A', fontSize: '14px', fontFamily: 'var(--font-mono)' }}>
                        {u.totalSent.toLocaleString()}
                      </span>
                    </td>

                    {/* Delivered */}
                    <td style={{ padding: '14px 14px' }}>
                      <span style={{ fontWeight: 800, color: '#15803D', fontSize: '14px', fontFamily: 'var(--font-mono)' }}>
                        {u.deliveredCount.toLocaleString()}
                      </span>
                    </td>

                    {/* Failed */}
                    <td style={{ padding: '14px 14px' }}>
                      <span style={{ fontWeight: 800, color: u.failedCount > 0 ? '#DC2626' : '#94A3B8', fontSize: '14px', fontFamily: 'var(--font-mono)' }}>
                        {u.failedCount.toLocaleString()}
                      </span>
                    </td>

                    {/* SLA Rate */}
                    <td style={{ padding: '14px 14px' }}>
                      <span style={{
                        fontSize: '11.5px',
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: parseFloat(u.successRate) >= 95 ? '#DCFCE7' : (parseFloat(u.successRate) >= 80 ? '#FEF3C7' : '#FEE2E2'),
                        color: parseFloat(u.successRate) >= 95 ? '#15803D' : (parseFloat(u.successRate) >= 80 ? '#B45309' : '#DC2626')
                      }}>
                        {u.successRate}
                      </span>
                    </td>

                    {/* Monthly Usage */}
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>
                        {u.messagesSentThisMonth.toLocaleString()} / {u.messageLimit.toLocaleString()}
                      </div>
                      <div style={{ width: '90px', height: '5px', borderRadius: '4px', background: '#E2E8F0', overflow: 'hidden' }}>
                        <div style={{ width: `${monthlyUsagePct}%`, height: '100%', background: monthlyUsagePct >= 90 ? '#EF4444' : '#2563EB' }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
              {usersList.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 8 : 7} style={{ padding: '48px', textAlign: 'center', color: '#94A3B8', fontWeight: 600 }}>
                    {loading ? 'Loading daily usage records from database...' : 'No usage records found for selected date range.'}
                  </td>
                </tr>
              )}
            </tbody>

            {/* Bottom Total Summary Footer Row */}
            {usersList.length > 0 && (
              <tfoot>
                <tr style={{ background: '#F8FAFC', borderTop: '2px solid #CBD5E1' }}>
                  <td style={{ padding: '16px 20px', fontWeight: 900, fontSize: '13px', color: '#0F172A' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ background: '#0F172A', color: '#FFFFFF', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800 }}>TOTAL</span>
                      <span>{usersList.length} Accounts</span>
                    </div>
                  </td>
                  {isAdmin && (
                    <td style={{ padding: '16px 14px', fontWeight: 800, fontSize: '12px', color: '#64748B' }}>
                      —
                    </td>
                  )}
                  <td style={{ padding: '16px 14px', fontWeight: 800, fontSize: '12px', color: '#64748B' }}>
                    —
                  </td>
                  <td style={{ padding: '16px 14px' }}>
                    <span style={{ fontWeight: 900, color: '#0F172A', fontSize: '15px', fontFamily: 'var(--font-mono)' }}>
                      {liveData?.totals?.grandTotal?.toLocaleString() || 0}
                    </span>
                  </td>
                  <td style={{ padding: '16px 14px' }}>
                    <span style={{ fontWeight: 900, color: '#15803D', fontSize: '15px', fontFamily: 'var(--font-mono)' }}>
                      {liveData?.totals?.grandDelivered?.toLocaleString() || 0}
                    </span>
                  </td>
                  <td style={{ padding: '16px 14px' }}>
                    <span style={{ fontWeight: 900, color: (liveData?.totals?.grandFailed || 0) > 0 ? '#DC2626' : '#94A3B8', fontSize: '15px', fontFamily: 'var(--font-mono)' }}>
                      {liveData?.totals?.grandFailed?.toLocaleString() || 0}
                    </span>
                  </td>
                  <td style={{ padding: '16px 14px' }}>
                    <span style={{
                      fontSize: '12px',
                      fontWeight: 900,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: '#DCFCE7',
                      color: '#15803D'
                    }}>
                      {liveData?.totals?.overallSuccessRate || '100%'}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 800, color: '#64748B' }}>
                    —
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

    </div>
  );
};
