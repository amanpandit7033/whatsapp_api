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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg viewBox="0 0 24 24" width="24" height="24" style={{ fill: 'var(--accent-color)' }}>
            <path d="M12.004 2C6.48 2 2 6.48 2 12.004c0 1.907.533 3.69 1.464 5.214L2 22l4.98-1.42A9.905 9.905 0 0 0 12.004 22C17.528 22 22 17.52 22 12.004 22 6.48 17.52 2 12.004 2zM12 20.363c-1.798 0-3.51-.482-4.992-1.393l-.358-.214-2.97.848.865-2.835-.243-.387a8.318 8.318 0 0 1-1.272-4.38c0-4.607 3.753-8.36 8.36-8.36 4.607 0 8.36 3.753 8.36 8.36.002 4.608-3.75 8.36-8.36 8.36zm4.58-6.25c-.25-.124-1.48-.73-1.71-.813-.23-.083-.4-.124-.567.125-.167.248-.646.812-.792.98-.146.165-.292.187-.542.062a6.837 6.837 0 0 1-2.012-1.24c-.787-.7-1.318-1.564-1.472-1.81-.154-.25-.017-.384.108-.508.113-.11.25-.29.375-.436.125-.145.166-.25.25-.415.083-.166.04-.312-.02-.437-.063-.125-.567-1.37-.777-1.875-.205-.5-.43-.43-.587-.438-.15-.008-.323-.008-.495-.008-.172 0-.453.064-.69.32a2.535 2.535 0 0 0-.792 1.886c0 1.112.81 2.185.922 2.338.113.153 1.59 2.43 3.85 3.407.537.23 1.025.39 1.378.502.54.17 1.03.146 1.417.088.433-.064 1.48-.604 1.687-1.188.208-.583.208-1.083.146-1.187-.063-.105-.23-.167-.48-.292z"/>
          </svg>
          <span style={{ fontWeight: 800, fontSize: '18px', color: '#0F172A', letterSpacing: '-0.03em' }}>
            Whatsapp API
          </span>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '40px', padding: '0 8px' }}>
          <svg viewBox="0 0 24 24" width="28" height="28" style={{ fill: 'var(--accent-color)', flexShrink: 0 }}>
            <path d="M12.004 2C6.48 2 2 6.48 2 12.004c0 1.907.533 3.69 1.464 5.214L2 22l4.98-1.42A9.905 9.905 0 0 0 12.004 22C17.528 22 22 17.52 22 12.004 22 6.48 17.52 2 12.004 2zM12 20.363c-1.798 0-3.51-.482-4.992-1.393l-.358-.214-2.97.848.865-2.835-.243-.387a8.318 8.318 0 0 1-1.272-4.38c0-4.607 3.753-8.36 8.36-8.36 4.607 0 8.36 3.753 8.36 8.36.002 4.608-3.75 8.36-8.36 8.36zm4.58-6.25c-.25-.124-1.48-.73-1.71-.813-.23-.083-.4-.124-.567.125-.167.248-.646.812-.792.98-.146.165-.292.187-.542.062a6.837 6.837 0 0 1-2.012-1.24c-.787-.7-1.318-1.564-1.472-1.81-.154-.25-.017-.384.108-.508.113-.11.25-.29.375-.436.125-.145.166-.25.25-.415.083-.166.04-.312-.02-.437-.063-.125-.567-1.37-.777-1.875-.205-.5-.43-.43-.587-.438-.15-.008-.323-.008-.495-.008-.172 0-.453.064-.69.32a2.535 2.535 0 0 0-.792 1.886c0 1.112.81 2.185.922 2.338.113.153 1.59 2.43 3.85 3.407.537.23 1.025.39 1.378.502.54.17 1.03.146 1.417.088.433-.064 1.48-.604 1.687-1.188.208-.583.208-1.083.146-1.187-.063-.105-.23-.167-.48-.292z"/>
          </svg>
          <span style={{ fontWeight: 800, fontSize: '20px', color: '#0F172A', letterSpacing: '-0.03em' }}>
            Whatsapp API
          </span>
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
