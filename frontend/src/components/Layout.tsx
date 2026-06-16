import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardIcon,
  DeviceIcon,
  SendIcon,
  ChartIcon,
  BookIcon,
  ShieldIcon,
  LogoutIcon,
  ListIcon,
  XIcon
} from './Icons';

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = localStorage.getItem('isAdmin') === 'true';
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Auto-close sidebar on page change (for mobile viewports)
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('isAdmin');
    navigate('/login');
  };

  const permissionsStr = localStorage.getItem('permissions') || 'instances,broadcast,reports,docs';
  const permissions = permissionsStr.split(',');

  const allNavItems = [
    { to: '/', icon: DashboardIcon, label: 'Dashboard', id: 'dashboard' },
    { to: '/instances', icon: DeviceIcon, label: 'Instances', id: 'instances' },
    { to: '/broadcast', icon: SendIcon, label: 'Broadcast', id: 'broadcast' },
    { to: '/reports', icon: ChartIcon, label: 'Reports', id: 'reports' },
    { to: '/docs', icon: BookIcon, label: 'API Docs', id: 'docs' },
  ];

  const navItems = allNavItems.filter(item => item.id === 'dashboard' || permissions.includes(item.id));

  if (isAdmin) {
    navItems.push({ to: '/admin', icon: ShieldIcon, label: 'Admin Panel', id: 'admin' });
  }

  return (
    <div className="app-container">
      {/* Mobile Top Header */}
      <header className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0b47ff', fontWeight: 800, fontSize: '18px', letterSpacing: '-0.03em' }}>
          <div style={{ width: 24, height: 24, background: '#0b47ff', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <div style={{ width: 8, height: 8, background: '#fff', borderRadius: '50%' }}></div>
          </div>
          dotwork
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="mobile-hamburger">
          {isSidebarOpen ? <XIcon size={24} color="#0F172A" /> : <ListIcon size={24} color="#0F172A" />}
        </button>
      </header>

      {/* Sidebar Backdrop Overlay */}
      <div
        className={`sidebar-backdrop ${isSidebarOpen ? 'show' : ''}`}
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* Sidebar Navigation */}
      <aside className={`app-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '40px', padding: '0 8px', color: '#0b47ff', fontWeight: 800, fontSize: '20px', letterSpacing: '-0.03em' }}>
          <div style={{ width: 28, height: 28, background: '#0b47ff', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <div style={{ width: 10, height: 10, background: '#fff', borderRadius: '50%' }}></div>
          </div>
          dotwork
        </div>

        <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', marginBottom: '12px', paddingLeft: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Main
        </span>

        {/* Navigation */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`sidebar-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={20} color={isActive ? 'var(--accent-color)' : 'var(--text-secondary)'} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <button onClick={handleLogout} className="sidebar-item" style={{ border: 'none', background: 'transparent', textAlign: 'left', width: '100%', color: 'var(--danger-color)', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <LogoutIcon size={20} color="var(--danger-color)" />
            Log out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="content-area custom-scrollbar">
        {/* Page Content */}
        <div className="animate-in page-content-padding">
          {children}
        </div>
      </main>
    </div>
  );
};
