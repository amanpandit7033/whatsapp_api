import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  XIcon,
  CheckIcon
} from '../components/Icons';
import {
  GlassUsersGroupIcon,
  GlassSendIcon,
  GlassDownloadIcon,
  GlassCopyIcon,
  GlassCheckIcon,
  GlassSearchIcon,
  GlassRefreshIcon,
  GlassWarningIcon,
  GlassCheckCircleIcon,
  GlassPaperclipIcon,
  GlassShieldIcon,
  GlassFilterIcon,
  GlassCancelIcon,
  GlassInstanceIcon,
  GlassTouchHandIcon,
  GlassAdminIcon,
  GlassGlobeIcon
} from '../components/GlassIcons';
import { SearchableSelect } from '../components/SearchableSelect';
import { copyToClipboard } from '../utils/clipboard';

interface GroupItem {
  id: string; // e.g. 120363048999999999@g.us
  subject: string;
  owner?: string;
  creation?: number;
  desc?: string;
  participantsCount: number;
  isAdmin: boolean;
  isAnnounce?: boolean;
  isCommunity?: boolean;
}

interface MemberItem {
  id: string;
  number: string;
  admin: 'admin' | 'superadmin' | null;
  isMe: boolean;
}

export const Groups = () => {
  const navigate = useNavigate();
  const [instances, setInstances] = useState<any[]>([]);
  const [selectedInstance, setSelectedInstance] = useState('');
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'admin' | 'public'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Send Message Modal State
  const [sendingGroup, setSendingGroup] = useState<GroupItem | null>(null);
  const [msgMode, setMsgMode] = useState<'text' | 'media'>('text');
  const [messageText, setMessageText] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Members Modal State
  const [viewingMembersGroup, setViewingMembersGroup] = useState<GroupItem | null>(null);
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [copiedGroupJid, setCopiedGroupJid] = useState<string | null>(null);

  useEffect(() => {
    fetchInstances();
  }, []);

  useEffect(() => {
    if (selectedInstance) {
      fetchGroups(selectedInstance);
    } else {
      setGroups([]);
    }
  }, [selectedInstance]);

  const fetchInstances = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/instances`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.status === 401) {
        navigate('/login');
        return;
      }
      const data = await res.json();
      const connected = (data.instances || []).filter((i: any) => i.status === 'connected');
      setInstances(connected);
    } catch (e) {
      console.error('Failed to load instances', e);
    }
  };

  const fetchGroups = async (instId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/groups?instanceId=${instId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.status === 401) {
        navigate('/login');
        return;
      }
      const data = await res.json();
      setGroups(data.groups || []);
    } catch (e) {
      console.error('Failed to fetch groups', e);
    } finally {
      setLoading(false);
    }
  };

  // Open Members Modal & Fetch details
  const handleOpenMembers = async (group: GroupItem) => {
    setViewingMembersGroup(group);
    setMembers([]);
    setLoadingMembers(true);
    setMemberSearch('');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/groups/${encodeURIComponent(group.id)}/participants?instanceId=${selectedInstance}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (data.group && data.group.participants) {
        setMembers(data.group.participants);
      }
    } catch (e) {
      console.error('Failed to fetch group members', e);
    } finally {
      setLoadingMembers(false);
    }
  };

  // Handle Send Group Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sendingGroup || !selectedInstance) return;
    if (!messageText.trim() && !mediaUrl.trim()) {
      setSendError('Please enter a message or provide a media URL.');
      return;
    }

    setIsSending(true);
    setSendError(null);
    setSendSuccess(false);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/groups/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          instanceId: selectedInstance,
          groupJid: sendingGroup.id,
          message: messageText.trim(),
          mediaUrl: msgMode === 'media' ? mediaUrl.trim() : undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setSendError(data.error || 'Failed to send message to group');
      } else {
        setSendSuccess(true);
        setTimeout(() => {
          setSendingGroup(null);
          setMessageText('');
          setMediaUrl('');
          setSendSuccess(false);
        }, 1500);
      }
    } catch (err: any) {
      setSendError(err.message || 'Server error');
    } finally {
      setIsSending(false);
    }
  };

  // Copy Group JID
  const handleCopyJid = async (jid: string) => {
    const ok = await copyToClipboard(jid);
    if (ok) {
      setCopiedGroupJid(jid);
      setTimeout(() => setCopiedGroupJid(null), 2000);
    }
  };

  // Export Members as CSV
  const handleExportMembersCsv = () => {
    if (!viewingMembersGroup || members.length === 0) return;
    let csv = 'Phone Number,WhatsApp ID,Role\n';
    members.forEach((m) => {
      csv += `+${m.number},${m.id},${m.admin ? 'Admin (' + m.admin + ')' : 'Member'}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${viewingMembersGroup.subject.replace(/\s+/g, '_')}_members.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Forward Members to Broadcast Hub
  const handleForwardToBroadcast = () => {
    if (members.length === 0) return;
    const numbersList = members.map((m) => m.number).filter(Boolean).join('\n');
    navigate('/broadcast', { state: { prefilledNumbers: numbersList } });
  };

  // Stats
  const totalGroups = groups.length;
  const adminGroups = groups.filter((g) => g.isAdmin).length;
  const totalReach = groups.reduce((acc, g) => acc + (g.participantsCount || 0), 0);

  // Reset pagination when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterTab, selectedInstance]);

  // Filtered groups
  const filteredGroups = groups.filter((g) => {
    const matchesSearch = g.subject.toLowerCase().includes(search.toLowerCase()) || g.id.includes(search);
    const matchesTab = filterTab === 'all' ? true : filterTab === 'admin' ? g.isAdmin : !g.isAnnounce;
    return matchesSearch && matchesTab;
  });

  const totalPages = Math.max(1, Math.ceil(filteredGroups.length / itemsPerPage));
  const paginatedGroups = filteredGroups.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Filtered members in modal
  const filteredMembers = members.filter((m) => {
    return m.number.includes(memberSearch) || m.id.includes(memberSearch);
  });

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Page Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
            WhatsApp Groups Hub
          </h2>
          <p style={{ color: '#64748B', fontSize: '14px', margin: 0, fontWeight: 500 }}>
            Browse participating groups, send group announcements via API, and extract member lists for campaigns.
          </p>
        </div>

        {/* Instance Selector Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '280px' }}>
          {instances.length > 0 && (
            <SearchableSelect
              placeholder="-- Select WhatsApp Instance --"
              searchPlaceholder="Search instance or phone..."
              value={selectedInstance}
              onChange={(val) => setSelectedInstance(val)}
              options={instances.map((inst) => ({
                value: inst.id,
                label: inst.id,
                sublabel: inst.phoneNumber ? `+${inst.phoneNumber}` : undefined,
                badge: 'Connected',
                badgeColor: { bg: '#D1FAE5', text: '#059669' },
                icon: <GlassInstanceIcon size={16} />
              }))}
            />
          )}

          {selectedInstance && (
            <button
              onClick={() => fetchGroups(selectedInstance)}
              style={{
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '12px',
                padding: '10px 14px',
                fontSize: '13px',
                fontWeight: 700,
                color: '#0F172A',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
              }}
            >
              <GlassRefreshIcon size={16} /> Refresh
            </button>
          )}
        </div>
      </div>

      {/* When No Instance is Selected */}
      {!selectedInstance ? (
        <div className="card animate-in" style={{ padding: '64px 32px', textAlign: 'center' }}>
          <div style={{ maxWidth: '460px', margin: '0 auto' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <GlassUsersGroupIcon size={38} />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: '0 0 8px', letterSpacing: '-0.01em' }}>
              {instances.length === 0 ? 'No Connected WhatsApp Instances' : 'Select a WhatsApp Instance'}
            </h3>
            <p style={{ fontSize: '14px', color: '#64748B', lineHeight: 1.6, margin: '0 0 24px', fontWeight: 500 }}>
              {instances.length === 0 
                ? 'You do not have any connected WhatsApp instances. Please connect an instance first from the Instances page to manage groups.' 
                : 'Please choose an active WhatsApp instance from the dropdown selector above to load its participating groups, audience reach, and members.'}
            </p>
            {instances.length === 0 ? (
              <button
                onClick={() => navigate('/instances')}
                className="btn-primary"
                style={{ padding: '10px 22px', borderRadius: '12px', fontSize: '13px', fontWeight: 700 }}
              >
                Go to Instances Page
              </button>
            ) : (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '12px', background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#2563EB', fontSize: '13px', fontWeight: 700 }}>
                <GlassTouchHandIcon size={18} />
                <span>Select an instance above to view groups</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* KPI Stats Row */}
      <div className="stats-grid">
        {/* Total Groups Joined */}
        <div className="card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748B' }}>Total Groups</span>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <GlassUsersGroupIcon size={20} />
            </div>
          </div>
          <div>
            <span style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
              {totalGroups.toLocaleString()}
            </span>
            <span style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px', display: 'block' }}>Joined groups</span>
          </div>
        </div>

        {/* Admin Groups */}
        <div className="card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748B' }}>Admin Access</span>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <GlassShieldIcon size={20} />
            </div>
          </div>
          <div>
            <span style={{ fontSize: '24px', fontWeight: 800, color: '#D97706', letterSpacing: '-0.02em' }}>
              {adminGroups.toLocaleString()}
            </span>
            <span style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px', display: 'block' }}>Groups with admin rights</span>
          </div>
        </div>

        {/* Total Member Reach */}
        <div className="card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748B' }}>Total Audience Reach</span>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <GlassCheckCircleIcon size={20} />
            </div>
          </div>
          <div>
            <span style={{ fontSize: '24px', fontWeight: 800, color: '#059669', letterSpacing: '-0.02em' }}>
              {totalReach.toLocaleString()}
            </span>
            <span style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px', display: 'block' }}>Sum of all group members</span>
          </div>
        </div>
      </div>

      {/* Main Groups Card */}
      <div className="card" style={{ padding: '24px 0' }}>
        
        {/* Search & Filter Strip */}
        <div style={{ padding: '0 24px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          
          {/* Segmented Filter Tabs */}
          <div style={{ display: 'inline-flex', alignItems: 'center', background: '#F1F5F9', padding: '4px', borderRadius: '14px', gap: '4px', flexWrap: 'wrap' }}>
            {[
              { 
                key: 'all', 
                label: 'All Groups', 
                count: totalGroups, 
                icon: <GlassUsersGroupIcon size={16} /> 
              },
              { 
                key: 'admin', 
                label: 'Admin Groups', 
                count: adminGroups, 
                icon: <GlassAdminIcon size={16} /> 
              },
              { 
                key: 'public', 
                label: 'Open Posting', 
                count: groups.filter((g) => !g.isAnnounce).length, 
                icon: <GlassGlobeIcon size={16} /> 
              }
            ].map(({ key, label, count, icon }) => {
              const isActive = filterTab === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilterTab(key as any)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    borderRadius: '10px',
                    border: 'none',
                    background: isActive ? '#FFFFFF' : 'transparent',
                    color: isActive ? '#0F172A' : '#64748B',
                    fontSize: '13px',
                    fontWeight: isActive ? 800 : 600,
                    cursor: 'pointer',
                    boxShadow: isActive ? '0 2px 8px rgba(0, 0, 0, 0.06)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.6)';
                      e.currentTarget.style.color = '#0F172A';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = '#64748B';
                    }
                  }}
                >
                  <span style={{ display: 'inline-flex', flexShrink: 0 }}>{icon}</span>
                  <span>{label}</span>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: '20px',
                      height: '20px',
                      padding: '0 6px',
                      borderRadius: '999px',
                      fontSize: '11px',
                      fontWeight: 800,
                      background: isActive ? '#EFF6FF' : '#E2E8F0',
                      color: isActive ? '#2563EB' : '#64748B'
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', width: '280px' }}>
            <div style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}>
              <GlassSearchIcon size={16} />
            </div>
            <input
              type="text"
              placeholder="Search group name or JID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                background: '#FFFFFF',
                outline: 'none'
              }}
            />
          </div>

        </div>

        {/* Groups Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                <th style={{ padding: '12px 24px', fontSize: '11px', fontWeight: 800, color: '#64748B' }}>GROUP NAME & JID</th>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 800, color: '#64748B', textAlign: 'center' }}>MEMBERS</th>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 800, color: '#64748B', textAlign: 'center' }}>YOUR ROLE</th>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 800, color: '#64748B', textAlign: 'center' }}>POSTING RULES</th>
                <th style={{ padding: '12px 24px', fontSize: '11px', fontWeight: 800, color: '#64748B', textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                    <div style={{ width: '22px', height: '22px', border: '2px solid #DBEAFE', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 8px' }} />
                    <span>Loading WhatsApp groups...</span>
                  </td>
                </tr>
              ) : instances.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#DC2626', fontSize: '13px', fontWeight: 600 }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <GlassWarningIcon size={16} />
                      <span>No connected WhatsApp instances found. Please connect an instance first.</span>
                    </div>
                  </td>
                </tr>
              ) : filteredGroups.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>
                    No WhatsApp groups found matching your search.
                  </td>
                </tr>
              ) : (
                paginatedGroups.map((g) => (
                  <tr key={g.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    
                    {/* Group Title & ID */}
                    <td style={{ padding: '14px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '15px',
                            flexShrink: 0,
                            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'
                          }}
                        >
                          {g.subject.charAt(0).toUpperCase() || 'G'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '14px' }}>
                            {g.subject}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                            <code style={{ fontSize: '11px', color: '#64748B', fontFamily: 'var(--font-mono)' }}>
                              {g.id}
                            </code>
                            <button
                              onClick={() => handleCopyJid(g.id)}
                              title="Copy Group JID"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center' }}
                            >
                              {copiedGroupJid === g.id ? <GlassCheckCircleIcon size={14} /> : <GlassCopyIcon size={14} />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Member Count */}
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <span className="badge badge-info" style={{ fontSize: '12px', fontWeight: 800 }}>
                        {g.participantsCount.toLocaleString()} members
                      </span>
                    </td>

                    {/* Admin Status */}
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <span className={`badge ${g.isAdmin ? 'badge-warning' : 'badge-neutral'}`} style={{ fontSize: '11px', fontWeight: 700 }}>
                        {g.isAdmin ? 'Admin' : 'Member'}
                      </span>
                    </td>

                    {/* Announcement Rule */}
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <span className={`badge ${g.isAnnounce ? 'badge-danger' : 'badge-success'}`} style={{ fontSize: '11px' }}>
                        {g.isAnnounce ? 'Admin Only' : 'All Members'}
                      </span>
                    </td>

                    {/* Action Buttons */}
                    <td style={{ padding: '14px 24px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px' }}>
                        
                        {/* Send Message Button */}
                        <button
                          onClick={() => {
                            setSendingGroup(g);
                            setMessageText('');
                            setMediaUrl('');
                            setSendError(null);
                            setSendSuccess(false);
                          }}
                          style={{
                            background: 'linear-gradient(135deg, #1E40AF 0%, #2563EB 100%)',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '6px 14px',
                            color: '#FFFFFF',
                            fontSize: '12px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.2)'
                          }}
                        >
                          <GlassSendIcon size={14} /> Send Message
                        </button>

                        {/* View & Export Members Button */}
                        <button
                          onClick={() => handleOpenMembers(g)}
                          style={{
                            background: '#EFF6FF',
                            border: '1px solid #DBEAFE',
                            borderRadius: '8px',
                            padding: '6px 12px',
                            color: '#2563EB',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <GlassUsersGroupIcon size={14} /> Members
                        </button>

                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {filteredGroups.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px 0', borderTop: '1px solid #F1F5F9', flexWrap: 'wrap', gap: '12px' }}>
            <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>
              Showing <strong>{(currentPage - 1) * itemsPerPage + 1}</strong> to <strong>{Math.min(filteredGroups.length, currentPage * itemsPerPage)}</strong> of <strong>{filteredGroups.length}</strong> groups
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                style={{
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: 700,
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: currentPage === 1 ? '#94A3B8' : '#0F172A',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  opacity: currentPage === 1 ? 0.6 : 1,
                  transition: 'all 0.2s'
                }}
              >
                ← Prev
              </button>

              <span style={{ fontSize: '12px', fontWeight: 800, color: '#0F172A', padding: '0 6px' }}>
                Page {currentPage} of {totalPages}
              </span>

              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                style={{
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: 700,
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: currentPage >= totalPages ? '#94A3B8' : '#0F172A',
                  cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                  opacity: currentPage >= totalPages ? 0.6 : 1,
                  transition: 'all 0.2s'
                }}
              >
                Next →
              </button>
            </div>
          </div>
        )}

      </div>
      </>
      )}

      {/* MODAL 1: SEND MESSAGE TO GROUP */}
      {sendingGroup && createPortal(
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
            padding: '24px'
          }}
          onClick={() => !isSending && setSendingGroup(null)}
        >
          <div
            className="card animate-in"
            style={{
              width: '100%',
              maxWidth: '560px',
              position: 'relative',
              borderRadius: '24px',
              padding: '32px',
              boxShadow: '0 25px 50px -12px rgba(37, 99, 235, 0.25)',
              background: '#FFFFFF'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setSendingGroup(null)}
              title="Close modal"
              style={{
                position: 'absolute',
                top: '24px',
                right: '24px',
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

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <GlassSendIcon size={26} />
              </div>
              <div>
                <h3 style={{ fontWeight: 800, fontSize: '18px', color: '#0F172A', margin: 0 }}>
                  Send Message to Group
                </h3>
                <span style={{ fontSize: '12.5px', color: '#64748B', fontWeight: 600 }}>
                  Target: <strong>{sendingGroup.subject}</strong> ({sendingGroup.participantsCount} members)
                </span>
              </div>
            </div>

            {/* Mode Switcher */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', background: '#F8FAFC', padding: '4px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
              <button
                type="button"
                onClick={() => setMsgMode('text')}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '8px',
                  border: 'none',
                  background: msgMode === 'text' ? '#FFFFFF' : 'transparent',
                  color: msgMode === 'text' ? '#2563EB' : '#64748B',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: 'pointer',
                  boxShadow: msgMode === 'text' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                Plain Text
              </button>
              <button
                type="button"
                onClick={() => setMsgMode('media')}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '8px',
                  border: 'none',
                  background: msgMode === 'media' ? '#FFFFFF' : 'transparent',
                  color: msgMode === 'media' ? '#2563EB' : '#64748B',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: 'pointer',
                  boxShadow: msgMode === 'media' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                Media Attachment
              </button>
            </div>

            <form onSubmit={handleSendMessage} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Media URL Field */}
              {msgMode === 'media' && (
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#64748B', marginBottom: '6px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    Media Direct URL (Image, Video, Document)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}>
                      <GlassPaperclipIcon size={16} />
                    </div>
                    <input
                      type="url"
                      placeholder="https://example.com/image.png"
                      value={mediaUrl}
                      onChange={(e) => setMediaUrl(e.target.value)}
                      className="rounded-input"
                      style={{ height: '42px', paddingLeft: '38px', fontSize: '13px' }}
                      required
                    />
                  </div>
                </div>
              )}

              {/* Message / Caption Textarea */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#64748B', marginBottom: '6px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  {msgMode === 'media' ? 'Caption (Optional)' : 'Message Content'}
                </label>
                <textarea
                  rows={5}
                  placeholder="Type your group announcement message..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1px solid #CBD5E1',
                    background: '#F8FAFC',
                    fontSize: '13.5px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                    lineHeight: '1.5'
                  }}
                  required={msgMode === 'text'}
                />
              </div>

              {sendError && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: '10px', padding: '10px 14px', color: '#DC2626', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <GlassWarningIcon size={16} /> {sendError}
                </div>
              )}

              {sendSuccess && (
                <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '10px', padding: '10px 14px', color: '#16A34A', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <GlassCheckCircleIcon size={16} /> Message sent to group successfully!
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setSendingGroup(null)}
                  disabled={isSending}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid #E2E8F0',
                    background: '#F1F5F9',
                    color: '#64748B',
                    fontWeight: 700,
                    fontSize: '13.5px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSending}
                  className="btn-primary"
                  style={{
                    flex: 2,
                    padding: '12px',
                    borderRadius: '10px',
                    fontWeight: 800,
                    fontSize: '13.5px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {isSending ? (
                    <>
                      <div style={{ width: '16px', height: '16px', border: '2px solid #FFFFFF', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                      Sending to Group...
                    </>
                  ) : (
                    <>
                      <GlassSendIcon size={16} /> Send to {sendingGroup.participantsCount} Members
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 2: VIEW MEMBERS & EXPORT */}
      {viewingMembersGroup && createPortal(
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
            padding: '24px'
          }}
          onClick={() => setViewingMembersGroup(null)}
        >
          <div
            className="card animate-in"
            style={{
              width: '100%',
              maxWidth: '640px',
              position: 'relative',
              borderRadius: '24px',
              padding: '32px',
              boxShadow: '0 25px 50px -12px rgba(37, 99, 235, 0.25)',
              background: '#FFFFFF',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setViewingMembersGroup(null)}
              title="Close modal"
              style={{
                position: 'absolute',
                top: '24px',
                right: '24px',
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

            {/* Header */}
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontWeight: 800, fontSize: '18px', color: '#0F172A', margin: '0 0 4px' }}>
                {viewingMembersGroup.subject} — Members List
              </h3>
              <span style={{ fontSize: '12.5px', color: '#64748B' }}>
                Total: <strong>{members.length.toLocaleString()} participants</strong>
              </span>
            </div>

            {/* Action Bar: Search & Exports */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
              <div style={{ position: 'relative', width: '220px' }}>
                <div style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}>
                  <GlassSearchIcon size={14} />
                </div>
                <input
                  type="text"
                  placeholder="Search member..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 10px 6px 32px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '12px',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleExportMembersCsv}
                  disabled={members.length === 0}
                  style={{
                    background: '#0F172A',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#FFFFFF',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 6px rgba(15,23,42,0.2)'
                  }}
                >
                  <GlassDownloadIcon size={14} /> Export CSV
                </button>

                <button
                  onClick={handleForwardToBroadcast}
                  disabled={members.length === 0}
                  style={{
                    background: '#EFF6FF',
                    border: '1px solid #DBEAFE',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#2563EB',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <GlassSendIcon size={14} /> Broadcast to Members
                </button>
              </div>
            </div>

            {/* Members Scrollable Table */}
            <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #E2E8F0', borderRadius: '12px' }} className="custom-scrollbar">
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', position: 'sticky', top: 0, zIndex: 2 }}>
                    <th style={{ padding: '8px 16px', fontSize: '11px', fontWeight: 800, color: '#64748B', width: '40px' }}>#</th>
                    <th style={{ padding: '8px 16px', fontSize: '11px', fontWeight: 800, color: '#64748B' }}>PHONE NUMBER</th>
                    <th style={{ padding: '8px 16px', fontSize: '11px', fontWeight: 800, color: '#64748B', textAlign: 'right' }}>ROLE</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingMembers ? (
                    <tr>
                      <td colSpan={3} style={{ padding: '30px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                        <div style={{ width: '20px', height: '20px', border: '2px solid #DBEAFE', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 6px' }} />
                        <span>Fetching members...</span>
                      </td>
                    </tr>
                  ) : filteredMembers.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ padding: '24px', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>
                        No members found.
                      </td>
                    </tr>
                  ) : (
                    filteredMembers.map((m, i) => (
                      <tr key={m.id + i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '10px 16px', fontSize: '12px', color: '#94A3B8', fontWeight: 700 }}>
                          {(i + 1).toString().padStart(2, '0')}
                        </td>
                        <td style={{ padding: '10px 16px', fontSize: '13px', fontWeight: 700, color: '#0F172A', fontFamily: 'var(--font-mono)' }}>
                          +{m.number} {m.isMe && <span style={{ color: '#2563EB', fontSize: '11px', fontWeight: 800 }}>(You)</span>}
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                          <span className={`badge ${m.admin ? 'badge-warning' : 'badge-neutral'}`} style={{ fontSize: '10.5px' }}>
                            {m.admin ? '⭐ Admin' : 'Member'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>
        </div>,
        document.body
      )}

    </div>
  );
};
