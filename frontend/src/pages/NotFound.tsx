import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  CaretRightIcon
} from '../components/Icons';
import {
  GlassWhatsAppIcon,
  GlassDashboardIcon,
  GlassInstanceIcon,
  GlassSendIcon,
  GlassFilterIcon,
  GlassGroupIcon,
  GlassReportIcon,
  GlassCodeIcon,
  GlassLiveStatusIcon,
  GlassWarningIcon,
  GlassSparklesIcon
} from '../components/GlassIcons';

export const NotFound = () => {
  const navigate = useNavigate();
  const isAuthenticated = !!localStorage.getItem('token');
  const [branding, setBranding] = useState<{ brandName: string; brandLogoUrl: string | null; isCustom: boolean }>({
    brandName: 'WhatsApp API Gateway',
    brandLogoUrl: null,
    isCustom: false
  });

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || ''}/api/branding`)
      .then(res => res.json())
      .then(data => {
        if (data && data.brandName) {
          setBranding(data);
        }
      })
      .catch(() => {});
  }, []);

  const navLinks = [
    {
      title: 'Instances',
      desc: 'Connect & scan QR sessions',
      path: '/instances',
      icon: GlassInstanceIcon,
      bg: '#EFF6FF',
      accent: '#2563EB'
    },
    {
      title: 'Broadcast',
      desc: 'Multi-device campaign blast',
      path: '/broadcast',
      icon: GlassSendIcon,
      bg: '#EEF2FF',
      accent: '#4F46E5'
    },
    {
      title: 'Number Filter',
      desc: 'Batch WhatsApp number validator',
      path: '/filter',
      icon: GlassFilterIcon,
      bg: '#F5F3FF',
      accent: '#7C3AED'
    },
    {
      title: 'Groups Hub',
      desc: 'Audience & community reach',
      path: '/groups',
      icon: GlassGroupIcon,
      bg: '#FAF5FF',
      accent: '#9333EA'
    },
    {
      title: 'Reports',
      desc: 'Delivery logs & analytics SLA',
      path: '/reports',
      icon: GlassReportIcon,
      bg: '#ECFDF5',
      accent: '#059669'
    },
    {
      title: 'API Docs',
      desc: 'REST endpoints & Swagger specs',
      path: '/docs',
      icon: GlassCodeIcon,
      bg: '#F0F9FF',
      accent: '#0284C7'
    }
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(circle at 50% 0%, rgba(37, 99, 235, 0.08) 0%, rgba(248, 250, 252, 1) 65%, #EFF6FF 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        fontFamily: 'var(--font-sans, Inter, sans-serif)',
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Background Ambient Glow Circles */}
      <div
        style={{
          position: 'absolute',
          top: '-120px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.12) 0%, rgba(37, 99, 235, 0) 70%)',
          pointerEvents: 'none',
          zIndex: 0
        }}
      />

      {/* Brand Header */}
      <div
        onClick={() => navigate('/')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          marginBottom: '28px',
          cursor: 'pointer',
          zIndex: 1,
          padding: '8px 18px',
          borderRadius: '18px',
          background: 'rgba(255, 255, 255, 0.75)',
          border: '1px solid rgba(226, 232, 240, 0.85)',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 6px 20px rgba(15, 23, 42, 0.04)',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 10px 25px rgba(37, 99, 235, 0.12)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(15, 23, 42, 0.04)';
        }}
      >
        {branding.brandLogoUrl ? (
          <img
            src={branding.brandLogoUrl}
            alt={branding.brandName}
            style={{ width: '40px', height: '40px', borderRadius: '12px', objectFit: 'contain' }}
          />
        ) : (
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <GlassWhatsAppIcon size={40} />
          </div>
        )}
        <div>
          <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            {branding.brandName || 'WhatsApp API Gateway'}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#10B981',
                display: 'inline-block',
                boxShadow: '0 0 8px #10B981'
              }}
            />
            <p style={{ margin: 0, fontSize: '11px', fontWeight: 800, color: '#2563EB', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Enterprise Cloud Platform
            </p>
          </div>
        </div>
      </div>

      {/* Main 404 Glass Card */}
      <div
        className="animate-in"
        style={{
          width: '100%',
          maxWidth: '680px',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: '32px',
          padding: '44px 40px',
          boxShadow: '0 25px 70px -15px rgba(37, 99, 235, 0.12), 0 0 0 1px rgba(226, 232, 240, 0.9)',
          textAlign: 'center',
          boxSizing: 'border-box',
          zIndex: 1,
          position: 'relative'
        }}
      >
        {/* Floating Top Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 16px',
            borderRadius: '9999px',
            background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
            border: '1px solid #BFDBFE',
            color: '#1D4ED8',
            fontSize: '12px',
            fontWeight: 800,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            marginBottom: '16px',
            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.08)'
          }}
        >
          <GlassWarningIcon size={16} /> Error 404 • Route Not Found
        </div>

        {/* Hero 404 Graphic & Typography */}
        <div
          style={{
            fontSize: '100px',
            fontWeight: 900,
            lineHeight: 1,
            letterSpacing: '-0.06em',
            background: 'linear-gradient(135deg, #0F172A 0%, #1E40AF 45%, #2563EB 75%, #06B6D4 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: '0 0 10px',
            filter: 'drop-shadow(0 4px 12px rgba(37, 99, 235, 0.15))'
          }}
        >
          404
        </div>

        <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#0F172A', margin: '0 0 10px', letterSpacing: '-0.02em' }}>
          Lost in Transmission
        </h2>

        <p style={{ fontSize: '14.5px', color: '#64748B', lineHeight: 1.6, margin: '0 auto 30px', maxWidth: '480px', fontWeight: 500 }}>
          The endpoint or page you requested does not exist or has been relocated. Let's redirect you back to your workspace.
        </p>

        {/* Primary Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: isAuthenticated ? '32px' : '12px' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              padding: '11px 22px',
              borderRadius: '12px',
              border: '1.5px solid #E2E8F0',
              background: '#FFFFFF',
              color: '#334155',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#F8FAFC';
              e.currentTarget.style.borderColor = '#CBD5E1';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#FFFFFF';
              e.currentTarget.style.borderColor = '#E2E8F0';
              e.currentTarget.style.transform = 'none';
            }}
          >
            <ArrowLeftIcon size={16} color="#334155" /> Go Back
          </button>

          <button
            onClick={() => navigate('/')}
            className="btn-primary"
            style={{
              padding: '11px 26px',
              borderRadius: '12px',
              fontSize: '13.5px',
              fontWeight: 800,
              background: 'linear-gradient(135deg, #1E40AF 0%, #2563EB 100%)',
              boxShadow: '0 6px 20px rgba(37, 99, 235, 0.3)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              border: 'none',
              color: '#FFFFFF'
            }}
          >
            <GlassDashboardIcon size={18} /> {isAuthenticated ? 'Go to Dashboard' : 'Return to Login'}
          </button>

          <button
            onClick={() => navigate('/live-status')}
            style={{
              padding: '11px 20px',
              borderRadius: '12px',
              border: '1.5px solid #E2E8F0',
              background: '#F8FAFC',
              color: '#475569',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#FFFFFF';
              e.currentTarget.style.borderColor = '#2563EB';
              e.currentTarget.style.color = '#2563EB';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#F8FAFC';
              e.currentTarget.style.borderColor = '#E2E8F0';
              e.currentTarget.style.color = '#475569';
            }}
          >
            <GlassLiveStatusIcon size={18} /> Live Status
          </button>
        </div>

        {/* Quick Navigation Hub (6 Responsive Glass Cards) */}
        {isAuthenticated && (
          <div
            style={{
              borderTop: '1px solid #F1F5F9',
              paddingTop: '26px',
              textAlign: 'left'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <GlassSparklesIcon size={14} /> Quick Navigation Hub
              </span>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#2563EB' }}>
                Active Session
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: '12px'
              }}
            >
              {navLinks.map((item) => {
                const IconComp = item.icon;
                return (
                  <div
                    key={item.title}
                    onClick={() => navigate(item.path)}
                    style={{
                      padding: '14px 16px',
                      borderRadius: '16px',
                      border: '1.5px solid #F1F5F9',
                      background: '#FAFAFA',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      transition: 'all 0.2s ease',
                      userSelect: 'none',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#FFFFFF';
                      e.currentTarget.style.borderColor = item.accent;
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = `0 8px 20px ${item.accent}18`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#FAFAFA';
                      e.currentTarget.style.borderColor = '#F1F5F9';
                      e.currentTarget.style.transform = 'none';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '12px',
                        background: item.bg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      <IconComp size={22} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A', display: 'block' }}>
                          {item.title}
                        </span>
                        <CaretRightIcon size={12} color="#94A3B8" />
                      </div>
                      <span style={{ fontSize: '11px', color: '#64748B', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px', fontWeight: 500 }}>
                        {item.desc}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modern Status Footer */}
      <div
        style={{
          marginTop: '28px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '12px',
          color: '#64748B',
          fontWeight: 600,
          zIndex: 1
        }}
      >
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#10B981',
            boxShadow: '0 0 10px #10B981'
          }}
        />
        <span>WhatsApp Cloud Gateway • All Systems Operational</span>
      </div>
    </div>
  );
};
