import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  ListIcon,
  XIcon,
  ArrowLeftIcon
} from './Icons';
import {
  GlassDashboardIcon,
  GlassInstanceIcon,
  GlassBroadcastIcon,
  GlassFilterIcon,
  GlassGroupIcon,
  GlassReportIcon,
  GlassActivityIcon,
  GlassDocsIcon,
  GlassShieldIcon,
  GlassResellerIcon,
  GlassGlobeIcon,
  GlassLogoutIcon,
  GlassSidebarShowIcon,
  GlassSidebarHideIcon,
  GlassWhatsAppIcon,
  GlassAdminIcon,
  GlassUserIcon
} from './GlassIcons';

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

  const isImpersonating = localStorage.getItem('isImpersonating') === 'true';
  const impersonatedUsername = localStorage.getItem('impersonatedUsername') || username;
  const originalSession = JSON.parse(localStorage.getItem('originalSession') || 'null');

  const handleReturnSession = () => {
    if (!originalSession) return;
    localStorage.setItem('token', originalSession.token);
    localStorage.setItem('isAdmin', originalSession.isAdmin);
    localStorage.setItem('isReseller', originalSession.isReseller);
    localStorage.setItem('role', originalSession.role);
    localStorage.setItem('username', originalSession.username);
    localStorage.setItem('permissions', originalSession.permissions || '');

    localStorage.removeItem('isImpersonating');
    localStorage.removeItem('impersonatedUsername');
    localStorage.removeItem('originalSession');

    window.location.href = originalSession.returnUrl || '/user-management';
  };

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
    localStorage.removeItem('isImpersonating');
    localStorage.removeItem('impersonatedUsername');
    localStorage.removeItem('originalSession');
    navigate('/login');
  };

  const permissionsStr = localStorage.getItem('permissions') || 'instances,broadcast,filter,groups,reports,docs';
  const permissions = permissionsStr.split(',');

  // Grouped Navigation Sections according to usage & ergonomics
  const rawSections = [
    {
      title: 'Overview',
      items: [
        { to: '/', icon: GlassDashboardIcon, label: 'Dashboard', id: 'dashboard' },
        { to: '/instances', icon: GlassInstanceIcon, label: 'Instances', id: 'instances', badge: 'Active' },
        { to: '/profile', icon: GlassUserIcon, label: 'Profile', id: 'profile' },
      ]
    },
    {
      title: 'Campaigns & Tools',
      items: [
        { to: '/broadcast', icon: GlassBroadcastIcon, label: 'Broadcast', id: 'broadcast' },
        { to: '/filter', icon: GlassFilterIcon, label: 'Number Filter', id: 'filter' },
        { to: '/groups', icon: GlassGroupIcon, label: 'Groups Hub', id: 'groups' },
      ]
    },
    {
      title: 'Analytics & Status',
      items: [
        { to: '/reports', icon: GlassReportIcon, label: 'Reports', id: 'reports' },
        ...(isAdmin || (isReseller && !isAdmin) ? [
          { to: '/live-status', icon: GlassActivityIcon, label: 'Live Status', id: 'live-status' }
        ] : []),
      ]
    },
    {
      title: 'Developer',
      items: [
        { to: '/docs', icon: GlassDocsIcon, label: 'API Docs', id: 'docs' },
      ]
    },
    ...((isAdmin || isReseller) ? [{
      title: 'Management',
      items: [
        ...(isReseller && !isAdmin ? [
          { to: '/reseller', icon: GlassResellerIcon, label: 'Reseller Hub', id: 'reseller' }
        ] : []),
        ...(isAdmin ? [
          { to: '/whitelabel', icon: GlassGlobeIcon, label: 'White-Label', id: 'whitelabel' },
          { to: '/user-management', icon: GlassAdminIcon, label: 'User Management', id: 'user-management' }
        ] : [])
      ]
    }] : [])
  ];

  // Filter sections and items based on permissions
  const navSections = rawSections
    .map(section => ({
      ...section,
      items: section.items.filter(item => 
        isAdmin || item.id === 'dashboard' || item.id === 'profile' || permissions.includes(item.id)
      )
    }))
    .filter(section => section.items.length > 0);

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
        <div className="sidebar-brand-container" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px', padding: '0 4px', color: '#0F172A', fontWeight: 800, fontSize: '18px', letterSpacing: '-0.03em' }}>
          {branding.brandLogoUrl ? (
            <img src={branding.brandLogoUrl} alt={branding.brandName} style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'contain' }} />
          ) : (
            <div style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <GlassWhatsAppIcon size={36} />
            </div>
          )}
          <span className="sidebar-brand-text" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{branding.brandName}</span>
        </div>

        {/* Navigation Sections */}
        <nav className="sidebar-nav-scroll custom-scrollbar" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', overflowY: 'auto', paddingRight: '2px' }}>
          {navSections.map((section, idx) => (
            <div key={section.title} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <span
                className="sidebar-nav-heading"
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  color: '#94A3B8',
                  marginBottom: '4px',
                  paddingLeft: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em'
                }}
              >
                {section.title}
              </span>

              {section.items.map((item) => {
                const isActive = location.pathname === item.to;
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={`sidebar-item ${isActive ? 'active' : ''}`}
                    title={item.label}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '9px 12px',
                      borderRadius: '12px',
                      textDecoration: 'none',
                      transition: 'all 0.2s ease',
                      background: isActive ? '#EFF6FF' : 'transparent',
                      color: isActive ? '#1D4ED8' : '#475569',
                      fontWeight: isActive ? 800 : 600
                    }}
                  >
                    <div style={{ transform: isActive ? 'scale(1.08)' : 'scale(1)', transition: 'transform 0.2s ease', flexShrink: 0 }}>
                      <Icon size={20} />
                    </div>
                    <span className="sidebar-item-label" style={{ flex: 1, fontSize: '13.5px' }}>{item.label}</span>
                    {item.badge && (
                      <span className="sidebar-item-badge badge badge-success" style={{ fontSize: '10px', padding: '2px 8px' }}>
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
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
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 14px',
              borderRadius: '12px',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '14px'
            }}
          >
            <GlassLogoutIcon size={20} />
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
          {/* Left Side: Glass Sidebar Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
              className="top-header-hamburger"
              aria-label="Toggle Navigation"
              title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(8px)',
                border: 'none',
                borderRadius: '10px',
                width: '38px',
                height: '38px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                padding: 0
              }}
            >
              {isSidebarOpen ? <GlassSidebarHideIcon size={22} /> : <GlassSidebarShowIcon size={22} />}
            </button>
          </div>

          {/* Right Side: Return Impersonation Button (if Pre-Login Active) + Profile Card */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {isImpersonating && (
              <button
                onClick={handleReturnSession}
                title={`Exit Pre-Login and return to ${originalSession?.returnRoleTitle || 'User Management'}`}
                style={{
                  background: '#FEF3C7',
                  color: '#92400E',
                  border: '1px solid #FDE68A',
                  borderRadius: '10px',
                  padding: '7px 14px',
                  fontSize: '12.5px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap'
                }}
              >
                <ArrowLeftIcon size={14} color="#92400E" />
                <span>Return to {originalSession?.returnRoleTitle || 'User Management'}</span>
              </button>
            )}

            {/* Profile Card (Clickable to /profile) */}
            <div 
              onClick={() => navigate('/profile')}
              title="View Profile & Settings"
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px', 
                padding: '4px 14px 4px 6px', 
                borderRadius: '30px', 
                background: 'rgba(255, 255, 255, 0.16)', 
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.28)',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.08)',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              {/* Profile Avatar with 3D Glass Icon */}
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.22)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
                  flexShrink: 0,
                }}
              >
                <GlassUserIcon size={20} />
              </div>

              {/* Profile Username */}
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.01em' }}>
                  {username}
                </span>
                <span style={{ fontSize: '10.5px', fontWeight: 600, color: '#BFDBFE', textTransform: 'capitalize' }}>
                  {isAdmin ? 'Administrator' : isReseller ? 'Reseller' : 'Member'}
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
