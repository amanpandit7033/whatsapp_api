import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  WhatsAppIcon,
  DashboardIcon,
  DeviceIcon,
  SendIcon,
  BookIcon,
  ArrowLeftIcon,
  SearchIcon,
  ShieldIcon
} from '../components/Icons';

export const NotFound = () => {
  const navigate = useNavigate();
  const isAuthenticated = !!localStorage.getItem('token');

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #F8FAFC 0%, #EFF6FF 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 20px',
        fontFamily: 'var(--font-sans, Inter, sans-serif)',
        boxSizing: 'border-box'
      }}
    >
      {/* Brand Header */}
      <div
        onClick={() => navigate('/')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '32px',
          cursor: 'pointer'
        }}
      >
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 20px rgba(37, 99, 235, 0.25)'
          }}
        >
          <WhatsAppIcon size={24} color="#FFFFFF" />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#0F172A', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            WhatsApp API Gateway
          </h1>
          <p style={{ margin: 0, fontSize: '11px', fontWeight: 800, color: '#2563EB', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Enterprise Cloud System
          </p>
        </div>
      </div>

      {/* Main 404 Card */}
      <div
        className="animate-in"
        style={{
          width: '100%',
          maxWidth: '580px',
          background: '#FFFFFF',
          borderRadius: '28px',
          padding: '44px 36px',
          boxShadow: '0 25px 60px -15px rgba(37, 99, 235, 0.12), 0 0 0 1px rgba(226, 232, 240, 0.8)',
          textAlign: 'center',
          boxSizing: 'border-box'
        }}
      >
        {/* Visual 404 Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '8px 20px',
            borderRadius: '9999px',
            background: '#EFF6FF',
            border: '1.5px solid #DBEAFE',
            color: '#2563EB',
            fontSize: '13px',
            fontWeight: 800,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            marginBottom: '20px'
          }}
        >
          <SearchIcon size={16} color="#2563EB" /> Error 404
        </div>

        {/* Large 404 Number */}
        <div
          style={{
            fontSize: '84px',
            fontWeight: 900,
            lineHeight: 1,
            letterSpacing: '-0.05em',
            background: 'linear-gradient(135deg, #1E40AF 0%, #2563EB 50%, #60A5FA 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: '0 0 12px'
          }}
        >
          404
        </div>

        <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', margin: '0 0 12px', letterSpacing: '-0.02em' }}>
          Page Not Found
        </h2>

        <p style={{ fontSize: '14.5px', color: '#64748B', lineHeight: 1.6, margin: '0 auto 32px', maxWidth: '420px', fontWeight: 500 }}>
          The page you are looking for doesn't exist, has been removed, or is temporarily unavailable.
        </p>

        {/* Primary Action Buttons */}
        <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '32px' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              padding: '12px 24px',
              borderRadius: '12px',
              border: '1.5px solid #CBD5E1',
              background: '#FFFFFF',
              color: '#334155',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease'
            }}
          >
            <ArrowLeftIcon size={16} color="#334155" /> Go Back
          </button>

          <button
            onClick={() => navigate('/')}
            className="btn-primary"
            style={{
              padding: '12px 28px',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: 800,
              background: 'linear-gradient(135deg, #1E40AF 0%, #2563EB 100%)',
              boxShadow: '0 6px 20px rgba(37, 99, 235, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer'
            }}
          >
            <DashboardIcon size={16} color="#FFFFFF" /> {isAuthenticated ? 'Go to Dashboard' : 'Return to Home'}
          </button>
        </div>

        {/* Quick Links Card Section */}
        {isAuthenticated && (
          <div
            style={{
              borderTop: '1px solid #F1F5F9',
              paddingTop: '24px',
              textAlign: 'left'
            }}
          >
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '14px' }}>
              Quick Navigation
            </span>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px' }}>
              {[
                { title: 'Instances', path: '/instances', icon: DeviceIcon, color: '#2563EB', bg: '#EFF6FF' },
                { title: 'Broadcast', path: '/broadcast', icon: SendIcon, color: '#059669', bg: '#D1FAE5' },
                { title: 'API Docs', path: '/docs', icon: BookIcon, color: '#7C3AED', bg: '#F3E8FF' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    onClick={() => navigate(item.path)}
                    style={{
                      padding: '12px',
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      background: '#F8FAFC',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#FFFFFF';
                      e.currentTarget.style.borderColor = '#CBD5E1';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#F8FAFC';
                      e.currentTarget.style.borderColor = '#E2E8F0';
                      e.currentTarget.style.transform = 'none';
                    }}
                  >
                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={14} color={item.color} />
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>{item.title}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer copyright */}
      <p style={{ marginTop: '28px', fontSize: '12px', color: '#94A3B8', fontWeight: 500 }}>
        © {new Date().getFullYear()} WhatsApp API Platform. All rights reserved.
      </p>
    </div>
  );
};
