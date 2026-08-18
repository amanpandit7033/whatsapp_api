import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  ListIcon,
  XIcon,
  DashboardIcon,
  DeviceIcon,
  SendIcon,
  ChartIcon,
  ReportIcon,
  ActivityIcon,
  BookIcon,
  ShieldIcon,
  LogoutIcon,
  FilterIcon,
  UsersGroupIcon,
  UserPlusIcon,
  GlobeIcon
} from './Icons';

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = localStorage.getItem('isAdmin') === 'true';
  const isReseller = localStorage.getItem('isReseller') === 'true' || localStorage.getItem('role') === 'reseller';
  const username = localStorage.getItem('username') || (isAdmin ? 'Admin' : (isReseller ? 'Reseller' : 'User'));
  const avatarLetter = username.charAt(0).toUpperCase();
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth >= 1024);
  const [branding, setBranding] = useState<{ brandName: string; brandLogoUrl: string | null; isCustom: boolean }>({
    brandName: 'WhatsApp API',
    brandLogoUrl: null,
    isCustom: false
  });

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/branding`)
      .then(res => res.json())
      .then(data => {
        if (data && data.brandName) {
          setBranding(data);
          document.title = `${data.brandName} - Portal`;
        }
      })
      .catch(() => {});
  }, []);

  // Auto-close sidebar on page change for mobile/tablet viewports
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('isReseller');
    localStorage.removeItem('role');
    localStorage.removeItem('username');
    navigate('/login');
  };

  const permissionsStr = localStorage.getItem('permissions') || 'instances,broadcast,filter,groups,reports,docs';
  const permissions = permissionsStr.split(',');

  const allNavItems = [
    { to: '/', icon: DashboardIcon, label: 'Dashboard', id: 'dashboard' },
    { to: '/instances', icon: DeviceIcon, label: 'Instances', id: 'instances', badge: 'Active' },
    { to: '/broadcast', icon: SendIcon, label: 'Broadcast', id: 'broadcast' },
    { to: '/filter', icon: FilterIcon, label: 'Number Filter', id: 'filter' },
    { to: '/groups', icon: UsersGroupIcon, label: 'Groups Hub', id: 'groups' },
    { to: '/reports', icon: ReportIcon, label: 'Reports', id: 'reports' },
    { to: '/docs', icon: BookIcon, label: 'API Docs', id: 'docs' },
  ];

  const navItems = allNavItems.filter(item => 
    isAdmin || item.id === 'dashboard' || permissions.includes(item.id)
  );

  if (isReseller && !isAdmin) {
    navItems.push({ to: '/live-status', icon: ActivityIcon, label: 'Live Status', id: 'live-status' });
    navItems.push({ to: '/reseller', icon: UserPlusIcon, label: 'Reseller Hub', id: 'reseller' });
  }

  if (isAdmin) {
    navItems.push({ to: '/live-status', icon: ActivityIcon, label: 'Live Status', id: 'live-status' });
    navItems.push({ to: '/whitelabel', icon: GlobeIcon, label: 'White-Label', id: 'whitelabel' });
    navItems.push({ to: '/admin', icon: ShieldIcon, label: 'Admin Panel', id: 'admin' });
  }

  return (
    <div className="app-container">
      {/* Sidebar Backdrop Overlay */}
      <div
        className={`sidebar-backdrop ${isSidebarOpen ? 'show' : ''}`}
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* Shopeers Style Clean Sidebar */}
      <aside className={`app-sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
        {/* Brand Logo */}
        <div className="sidebar-brand-container" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px', padding: '0 4px', color: '#0F172A', fontWeight: 800, fontSize: '18px', letterSpacing: '-0.03em' }}>
          {branding.brandLogoUrl ? (
            <img src={branding.brandLogoUrl} alt={branding.brandName} style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'contain' }} />
          ) : (
            <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: '16px', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)', flexShrink: 0 }}>
              {branding.brandName.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="sidebar-brand-text" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{branding.brandName}</span>
        </div>

        <span className="sidebar-nav-heading" style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', marginBottom: '12px', paddingLeft: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Navigation
        </span>

        {/* Navigation items */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', width: '100%' }}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`sidebar-item ${isActive ? 'active' : ''}`}
                title={item.label}
              >
                <Icon size={18} color={isActive ? '#2563EB' : '#64748B'} />
                <span className="sidebar-item-label" style={{ flex: 1 }}>{item.label}</span>
                {item.badge && (
                  <span className="sidebar-item-badge badge badge-success" style={{ fontSize: '10px', padding: '2px 8px' }}>
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Logout */}
        <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '12px', width: '100%' }}>
          <button
            onClick={handleLogout}
            className="sidebar-item"
            title="Log out"
            style={{
              border: 'none',
              background: 'transparent',
              textAlign: 'left',
              width: '100%',
              color: '#EF4444',
            }}
          >
            <LogoutIcon size={18} color="#EF4444" />
            <span className="sidebar-item-label">Log out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="content-area custom-scrollbar">
        {/* Top Header Bar with Royal Blue Brand Gradient */}
        <header
          className="top-header-bar"
          style={{
            padding: '16px 32px',
            background: 'linear-gradient(135deg, #1E40AF 0%, #2563EB 50%, #1D4ED8 100%)',
            borderBottom: 'none',
            boxShadow: '0 4px 20px rgba(37, 99, 235, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          {/* Left Side: Hamburger Toggle + Page Title Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
              className="top-header-hamburger"
              aria-label="Toggle Navigation"
              title="Toggle Menu"
            >
              <ListIcon size={22} color="#FFFFFF" />
            </button>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.01em' }}>
                {location.pathname === '/' ? 'Dashboard' :
                 location.pathname.startsWith('/profile') ? 'Profile & Security' :
                 location.pathname.startsWith('/instances') ? 'Instances' :
                 location.pathname.startsWith('/broadcast') ? 'Broadcast' :
                 location.pathname.startsWith('/filter') ? 'Number Filter & Validator' :
                 location.pathname.startsWith('/groups') ? 'Groups Hub' :
                 location.pathname.startsWith('/reports') ? 'Reports' :
                 location.pathname.startsWith('/docs') ? 'API Documentation' :
                 location.pathname.startsWith('/reseller') ? 'Reseller Hub' :
                 location.pathname.startsWith('/admin') ? 'Admin Panel' : 'Overview'}
              </h3>
              <span style={{ fontSize: '12px', color: '#DBEAFE', fontWeight: 600 }}>WhatsApp API Gateway</span>
            </div>
          </div>

          {/* Right Side: Profile Card (Clickable to /profile) */}
          <div 
            onClick={() => navigate('/profile')}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              padding: '6px 16px 6px 8px', 
              borderRadius: '12px', 
              background: 'rgba(255, 255, 255, 0.15)', 
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {/* Profile Avatar */}
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '8px',
                background: '#FFFFFF',
                color: '#2563EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '14px',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
                flexShrink: 0,
              }}
            >
              {avatarLetter}
            </div>

            {/* Profile Username Only */}
            <span style={{ fontSize: '14px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.01em' }}>
              {username}
            </span>
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
