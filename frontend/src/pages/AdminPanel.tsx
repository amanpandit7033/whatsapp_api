import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { UserIcon, ShieldIcon, WarningIcon, UserPlusIcon, SearchIcon, EditIcon, CheckCircleIcon } from '../components/Icons';

const S: Record<string, React.CSSProperties> = {
  label: { display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748B', marginBottom: '8px' },
};

export const AdminPanel = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newMaxInstances, setNewMaxInstances] = useState('1');
  const [newMessageLimit, setNewMessageLimit] = useState('1000');
  const [newExpiresAt, setNewExpiresAt] = useState('');
  const [newPermissions, setNewPermissions] = useState<string[]>(['instances', 'broadcast', 'reports', 'docs']);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editPassword, setEditPassword] = useState('');
  const navigate = useNavigate();

  useEffect(() => { fetchUsers(); }, [page, search]);

  const fetchUsers = async () => {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/users?page=${page}&limit=10&search=${search}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    if (res.status === 401 || res.status === 403) { navigate('/'); return; }
    const data = await res.json();
    if (data.users) { setUsers(data.users); setTotalPages(data.totalPages); }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSuccess('');
    if (!newUsername || !newPassword) { setError('Username and password required'); return; }
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/users`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: newUsername, password: newPassword, maxInstances: parseInt(newMaxInstances), messageLimit: parseInt(newMessageLimit), expiresAt: newExpiresAt || undefined, permissions: newPermissions.join(',') })
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'Failed'); }
    else { setSuccess(`User "${data.user.username}" created!`); setNewUsername(''); setNewPassword(''); setNewMaxInstances('1'); setNewMessageLimit('1000'); setNewExpiresAt(''); setNewPermissions(['instances', 'broadcast', 'reports', 'docs']); setIsAddUserModalOpen(false); fetchUsers(); }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault(); if (!editingUser) return;
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/users/${editingUser.id}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: editingUser.username, password: editPassword || undefined, maxInstances: parseInt(editingUser.maxInstances), messageLimit: parseInt(editingUser.messageLimit), expiresAt: editingUser.expiresAt || null, isAdmin: editingUser.isAdmin, permissions: editingUser.permissions })
    });
    if (res.ok) { setEditingUser(null); setEditPassword(''); fetchUsers(); }
    else { const d = await res.json(); alert(d.error || 'Failed'); }
  };

  const totalUsers = users.length;
  const adminCount = users.filter(u => u.isAdmin).length;
  const expiredCount = users.filter(u => u.expiresAt && new Date(u.expiresAt) < new Date()).length;
  const activeCount = users.filter(u => !u.isAdmin && (!u.expiresAt || new Date(u.expiresAt) >= new Date())).length;

  return (
    <div className="animate-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>Admin Control Panel</h2>
          <p style={{ color: '#64748B', fontSize: '14px', margin: 0, fontWeight: 500 }}>Manage users, permissions, and system limits.</p>
        </div>
        <button onClick={() => { setIsAddUserModalOpen(true); setError(''); setSuccess(''); }} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <UserPlusIcon size={16} /> Add User
        </button>
      </div>

      {/* Stat strip */}
      <div className="stats-grid">
        {[
          { label: 'Total Users', val: totalUsers, icon: UserIcon, color: '#7C3AED', bg: '#F3E8FF' },
          { label: 'Admins', val: adminCount, icon: ShieldIcon, color: '#3B82F6', bg: '#DBEAFE' },
          { label: 'Active', val: activeCount, icon: CheckCircleIcon, color: '#10B981', bg: '#D1FAE5' },
          { label: 'Expired', val: expiredCount, icon: WarningIcon, color: '#EF4444', bg: '#FEE2E2' },
        ].map(({ label, val, icon: IconComponent, color, bg }) => (
          <div key={label} className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '24px 28px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IconComponent size={16} color={color} />
              </div>
            </div>
            <div>
              <p style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>{label}</p>
              <p style={{ fontSize: '13px', fontWeight: 500, color: '#64748B', margin: '2px 0 0' }}>{val} accounts</p>
            </div>
          </div>
        ))}
      </div>

      {/* Users Table */}
      <div className="card" style={{ padding: '24px 0', marginBottom: '24px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '16px', padding: '0 32px' }}>
            <h3 style={{ fontWeight: 800, fontSize: '15px', color: '#0F172A', margin: 0 }}>Manage Users</h3>
            <div style={{ position: 'relative' }}>
              <SearchIcon size={14} color="#94A3B8" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text" placeholder="Search…" value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="rounded-input" style={{ width: '240px', paddingRight: '36px' }}
              />
            </div>
          </div>

          <div style={{ overflowX: 'auto' }} className="custom-scrollbar">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0' }}>
                  {['User', 'Instances', 'Monthly Limit', 'Expiry', 'Joined', 'Action'].map(h => (
                    <th key={h} style={{ padding: '16px 32px', fontSize: '13px', fontWeight: 600, color: '#64748B' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((user, i) => {
                  const isExpired = user.expiresAt && new Date(user.expiresAt) < new Date();
                  const usagePct = Math.min(100, (user._count.instances / user.maxInstances) * 100);
                  const Icon = user.isAdmin ? ShieldIcon : UserIcon;
                  return (
                    <tr key={user.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '16px 32px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: user.isAdmin ? '#F3E8FF' : '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Icon size={18} color={user.isAdmin ? '#7C3AED' : '#64748B'} />
                          </div>
                          <div>
                            <p style={{ fontWeight: 600, fontSize: '14px', color: '#0F172A', margin: 0 }}>{user.username}</p>
                            {user.isAdmin && <span style={{ background: '#F3E8FF', color: '#7C3AED', padding: '1px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 800 }}>ADMIN</span>}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '16px 32px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 600, color: '#0F172A', fontSize: '14px' }}>{user._count.instances}</span>
                          <span style={{ color: '#94A3B8', fontSize: '13px', fontWeight: 500 }}>/ {user.maxInstances}</span>
                        </div>
                        <div style={{ height: '4px', background: '#F1F5F9', borderRadius: '9999px', marginTop: '6px', width: '60px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: '9999px', background: usagePct >= 100 ? '#EF4444' : '#7C3AED', width: `${usagePct}%`, transition: 'width 0.5s' }} />
                        </div>
                      </td>
                      <td style={{ padding: '16px 32px' }}>
                        <span style={{ fontWeight: 600, color: '#0F172A', fontSize: '14px' }}>{user.messageLimit}</span>
                      </td>
                      <td style={{ padding: '16px 32px' }}>
                        {user.expiresAt ? (
                          <span style={{ fontSize: '13px', fontWeight: 600, color: isExpired ? '#DC2626' : '#0F172A' }}>
                            {isExpired ? '⚠ ' : ''}{new Date(user.expiresAt).toLocaleDateString()}
                          </span>
                        ) : <span style={{ fontSize: '13px', color: '#94A3B8', fontStyle: 'italic', fontWeight: 500 }}>Never</span>}
                      </td>
                      <td style={{ padding: '16px 32px', fontSize: '13px', color: '#64748B', fontWeight: 500 }}>
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '16px 32px' }}>
                        <button onClick={() => { setEditingUser({ ...user }); setEditPassword(''); }} style={{
                          background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px',
                          padding: '6px 12px', fontSize: '13px', fontWeight: 600, color: '#0F172A',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
                        }}>
                          <EditIcon size={14} color="#0F172A" /> Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {users.length === 0 && (
                  <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#94A3B8', fontWeight: 500 }}>No users found</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 32px 0' }}>
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ background: 'none', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '6px 14px', fontSize: '13px', fontWeight: 600, color: page === 1 ? '#CBD5E1' : '#0F172A', cursor: page === 1 ? 'not-allowed' : 'pointer' }}>← Prev</button>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>Page {page} / {totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} style={{ background: 'none', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '6px 14px', fontSize: '13px', fontWeight: 600, color: page === totalPages ? '#CBD5E1' : '#0F172A', cursor: page === totalPages ? 'not-allowed' : 'pointer' }}>Next →</button>
            </div>
          )}
        </div>

      {/* Add User Modal */}
      {isAddUserModalOpen && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '440px', position: 'relative', boxShadow: '0 24px 64px rgba(0,0,0,0.1)' }}>
            <button onClick={() => setIsAddUserModalOpen(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: '#F1F5F9', border: 'none', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>✕</button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#F3E8FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UserPlusIcon size={22} color="#7C3AED" />
              </div>
              <div>
                <h3 style={{ fontWeight: 800, fontSize: '18px', color: '#0F172A', margin: 0 }}>Add New User</h3>
                <p style={{ fontSize: '13px', color: '#94A3B8', margin: '2px 0 0', fontWeight: 600 }}>Create an account</p>
              </div>
            </div>

            {error && <div style={{ background: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', fontWeight: 600, color: '#DC2626', marginBottom: '16px' }}>{error}</div>}
            {success && <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', fontWeight: 600, color: '#16A34A', marginBottom: '16px' }}>{success}</div>}

            <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                { label: 'Username', ph: 'e.g. john_doe', val: newUsername, set: setNewUsername, type: 'text' },
                { label: 'Password', ph: '••••••••', val: newPassword, set: setNewPassword, type: 'password' },
              ].map(({ label, ph, val, set, type }) => (
                <div key={label}>
                  <label style={S.label}>{label}</label>
                  <input type={type} placeholder={ph} value={val} onChange={e => set(e.target.value)} className="rounded-input" />
                </div>
              ))}
              <div style={{ display: 'flex', gap: '14px' }}>
                <div style={{ flex: 1 }}>
                  <label style={S.label}>Max Instances</label>
                  <input type="number" min="1" value={newMaxInstances} onChange={e => setNewMaxInstances(e.target.value)} className="rounded-input" />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={S.label}>Monthly Limit</label>
                  <input type="number" min="1" value={newMessageLimit} onChange={e => setNewMessageLimit(e.target.value)} className="rounded-input" />
                </div>
              </div>
              <div>
                <label style={S.label}>Expiry Date <span style={{ color: '#94A3B8', fontWeight: 500 }}>(optional)</span></label>
                <input type="date" value={newExpiresAt} onChange={e => setNewExpiresAt(e.target.value)} className="rounded-input" />
              </div>
              <div>
                <label style={S.label}>Menu Permissions</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '4px' }}>
                  {['instances', 'broadcast', 'reports', 'docs'].map(perm => (
                    <label key={perm} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={newPermissions.includes(perm)} onChange={(e) => {
                        if (e.target.checked) setNewPermissions([...newPermissions, perm]);
                        else setNewPermissions(newPermissions.filter(p => p !== perm));
                      }} style={{ accentColor: '#7C3AED' }} />
                      <span style={{ textTransform: 'capitalize' }}>{perm === 'docs' ? 'API Docs' : perm}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button type="button" onClick={() => setIsAddUserModalOpen(false)} className="btn-outline" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 2 }}>Create User</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Modal */}
      {editingUser && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '440px', position: 'relative', boxShadow: '0 24px 64px rgba(0,0,0,0.1)' }}>
            <button onClick={() => setEditingUser(null)} style={{ position: 'absolute', top: '16px', right: '16px', background: '#F1F5F9', border: 'none', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>✕</button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#F3E8FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <EditIcon size={22} color="#7C3AED" />
              </div>
              <div>
                <h3 style={{ fontWeight: 800, fontSize: '18px', color: '#0F172A', margin: 0 }}>Edit User</h3>
                <p style={{ fontSize: '13px', color: '#94A3B8', margin: '2px 0 0', fontWeight: 600 }}>{editingUser.username}</p>
              </div>
            </div>

            <form onSubmit={handleUpdateUser} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={S.label}>New Password <span style={{ color: '#94A3B8', fontWeight: 500 }}>(leave blank to keep)</span></label>
                <input type="password" value={editPassword} onChange={e => setEditPassword(e.target.value)} placeholder="••••••••" className="rounded-input" />
              </div>
              <div>
                <label style={S.label}>Max Instances</label>
                <input type="number" min="1" value={editingUser.maxInstances} onChange={e => setEditingUser({ ...editingUser, maxInstances: e.target.value })} className="rounded-input" />
              </div>
              <div>
                <label style={S.label}>Monthly Message Limit</label>
                <input type="number" min="1" value={editingUser.messageLimit} onChange={e => setEditingUser({ ...editingUser, messageLimit: e.target.value })} className="rounded-input" />
              </div>
              <div>
                <label style={S.label}>Expiry Date</label>
                <input type="date" value={editingUser.expiresAt ? new Date(editingUser.expiresAt).toISOString().split('T')[0] : ''} onChange={e => setEditingUser({ ...editingUser, expiresAt: e.target.value })} className="rounded-input" />
              </div>
              <div>
                <label style={S.label}>Menu Permissions</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '4px' }}>
                  {['instances', 'broadcast', 'reports', 'docs'].map(perm => {
                    const perms = (editingUser.permissions || '').split(',');
                    return (
                      <label key={perm} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={perms.includes(perm)} onChange={(e) => {
                          const newPerms = e.target.checked ? [...perms, perm] : perms.filter((p: string) => p !== perm && p !== '');
                          setEditingUser({ ...editingUser, permissions: newPerms.join(',') });
                        }} style={{ accentColor: '#7C3AED' }} />
                        <span style={{ textTransform: 'capitalize' }}>{perm === 'docs' ? 'API Docs' : perm}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', cursor: 'pointer' }}>
                <input type="checkbox" checked={editingUser.isAdmin} onChange={e => setEditingUser({ ...editingUser, isAdmin: e.target.checked })} style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#7C3AED' }} />
                <div>
                  <p style={{ fontWeight: 700, fontSize: '14px', color: '#0F172A', margin: 0 }}>Grant Admin Privileges</p>
                  <p style={{ fontSize: '12px', color: '#94A3B8', margin: '2px 0 0', fontWeight: 500 }}>Admin can manage all users</p>
                </div>
              </label>
              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button type="button" onClick={() => setEditingUser(null)} className="btn-outline" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 2 }}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
