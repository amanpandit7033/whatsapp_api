import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  ListIcon,
  XIcon,
  DashboardIcon,
  DeviceIcon,
  SendIcon,
  ChartIcon,
  BookIcon,
  ShieldIcon,
  LogoutIcon
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
    { to: '/instances', icon: DeviceIcon, label: 'Instances', id: 'instances', badge: 'Active' },
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#2563EB', fontWeight: 800, fontSize: '18px', letterSpacing: '-0.03em' }}>
          <div style={{ width: 26, height: 26, background: '#2563EB', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: '14px' }}>
            W
          </div>
          WhatsApp API
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

      {/* Shopeers Style Clean Sidebar */}
      <aside className={`app-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        {/* Brand Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px', padding: '0 4px', color: '#0F172A', fontWeight: 800, fontSize: '20px', letterSpacing: '-0.03em' }}>
          <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: '16px', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)' }}>
            W
          </div>
          <span>WhatsApp API</span>
        </div>

        <span style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', marginBottom: '12px', paddingLeft: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Navigation
        </span>

        {/* Navigation items */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`sidebar-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={18} color={isActive ? '#2563EB' : '#64748B'} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge && (
                  <span className="badge badge-success" style={{ fontSize: '10px', padding: '2px 8px' }}>
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Logout */}
        <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '12px' }}>
          <button
            onClick={handleLogout}
            className="sidebar-item"
            style={{
              border: 'none',
              background: 'transparent',
              textAlign: 'left',
              width: '100%',
              color: '#EF4444',
            }}
          >
            <LogoutIcon size={18} color="#EF4444" />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="content-area custom-scrollbar">
        {/* Top Header Bar with Profile Section */}
        <header
          style={{
            padding: '14px 32px',
            background: '#FFFFFF',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          {/* Left Side: Page Title Indicator */}
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.01em' }}>
              {location.pathname === '/' ? 'Dashboard' :
               location.pathname.startsWith('/instances') ? 'Instances' :
               location.pathname.startsWith('/broadcast') ? 'Broadcast' :
               location.pathname.startsWith('/reports') ? 'Reports' :
               location.pathname.startsWith('/docs') ? 'API Documentation' :
               location.pathname.startsWith('/admin') ? 'Admin Panel' : 'Overview'}
            </h3>
            <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>WhatsApp API Gateway</span>
          </div>

          {/* Right Side: Profile Section */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#F8FAFC', padding: '6px 12px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }}></span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#059669' }}>Live</span>
            </div>

            <div 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px', 
                padding: '5px 12px 5px 6px', 
                borderRadius: '12px', 
                background: '#FFFFFF', 
                border: '1px solid #E2E8F0',
                boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
              }}
            >
              {/* Profile Avatar */}
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '14px',
                  boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)',
                }}
              >
                {isAdmin ? 'A' : 'U'}
              </div>

              {/* Profile Name & Badge */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>
                  {isAdmin ? 'System Admin' : 'API User'}
                </span>
                <span style={{ fontSize: '11px', color: '#2563EB', fontWeight: 700, marginTop: '2px' }}>
                  {isAdmin ? 'Administrator' : 'Standard Plan'}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="animate-in page-content-padding" style={{ padding: '28px 32px' }}>
          {children}
        </div>
      </main>
    </div>
  );
};
