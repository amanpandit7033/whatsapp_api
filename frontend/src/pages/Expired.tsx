import React from 'react';
import { useNavigate } from 'react-router-dom';
import { WarningIcon, ArrowLeftIcon, WhatsAppIcon, ShieldIcon, LockIcon, CheckCircleIcon } from '../components/Icons';

export const Expired = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('isExpired');
    navigate('/login');
  };

  return (
    <div className="auth-split-screen" style={{ background: '#F8FAFC', minHeight: '100vh', display: 'flex' }}>
      
      {/* LEFT SIDE: Expired Notice */}
      <div className="auth-split-left" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 32px' }}>
        <div className="auth-card animate-in" style={{ width: '100%', maxWidth: '420px', padding: 0 }}>
          
          {/* Brand Header */}
          <div style={{ marginBottom: '36px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px rgba(37, 99, 235, 0.25)' }}>
                <WhatsAppIcon size={24} color="#FFFFFF" />
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: '19px', fontWeight: 900, color: '#0F172A', letterSpacing: '-0.02em', lineHeight: 1.2 }}>WhatsApp Gateway</h1>
                <p style={{ margin: 0, fontSize: '11px', fontWeight: 800, color: '#2563EB', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Enterprise Control Panel</p>
              </div>
            </div>

            {/* Warning Badge Icon */}
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.15)' }}>
              <WarningIcon size={28} color="#DC2626" />
            </div>

            <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#0F172A', margin: '0 0 10px', letterSpacing: '-0.02em' }}>
              Subscription Expired
            </h2>
            <p style={{ fontSize: '14px', color: '#64748B', margin: 0, fontWeight: 500, lineHeight: 1.6 }}>
              Your access to WhatsApp API Gateway has expired. Please contact your system administrator or account representative to renew your subscription plan.
            </p>
          </div>

          <button 
            onClick={handleLogout}
            className="btn-primary"
            style={{
              width: '100%', height: '50px', fontSize: '15px', fontWeight: 800, borderRadius: '12px',
              background: '#2563EB', border: 'none', color: '#FFFFFF', cursor: 'pointer',
              fontFamily: 'var(--font-sans)', letterSpacing: '-0.01em',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              boxShadow: '0 4px 16px rgba(37, 99, 235, 0.35)', transition: 'all 0.2s ease'
            }}
          >
            <ArrowLeftIcon size={18} color="#FFFFFF" />
            <span>Return to Login</span>
          </button>

          {/* Security Footnote */}
          <div style={{ marginTop: '36px', paddingTop: '20px', borderTop: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#94A3B8', fontSize: '12px', fontWeight: 600 }}>
            <ShieldIcon size={14} color="#94A3B8" /> 256-Bit SSL Encrypted Admin Access
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: Vibrant Royal Blue SaaS Visual Panel */}
      <div className="auth-split-right" style={{ flex: 1.2, background: 'linear-gradient(135deg, #1E40AF 0%, #2563EB 50%, #1D4ED8 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px', position: 'relative', overflow: 'hidden' }}>
        
        {/* Background Glowing Orbs */}
        <div style={{ position: 'absolute', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0) 70%)', top: '-120px', right: '-120px', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0) 70%)', bottom: '-100px', left: '-100px', pointerEvents: 'none' }} />

        {/* Expired Status Showcase Card */}
        <div style={{ position: 'relative', width: '100%', maxWidth: '440px', marginBottom: '40px', zIndex: 10 }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.12)', backdropFilter: 'blur(20px)', borderRadius: '24px', padding: '28px', border: '1px solid rgba(255, 255, 255, 0.25)', boxShadow: '0 25px 60px rgba(0, 0, 0, 0.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#EF4444', boxShadow: '0 0 8px #EF4444' }} />
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '0.04em' }}>ACCOUNT STATUS</span>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#EF4444', background: '#FEE2E2', padding: '4px 12px', borderRadius: '9999px' }}>
                EXPIRED
              </span>
            </div>

            <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '20px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <LockIcon size={18} color="#2563EB" />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>Instance Access Paused</h4>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Renewal required to unblock API routes</p>
                </div>
              </div>
            </div>
          </div>

          {/* Floating Pill Badges */}
          <div style={{ position: 'absolute', top: '-18px', right: '-18px', background: '#FFFFFF', padding: '10px 18px', borderRadius: '14px', boxShadow: '0 12px 30px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CheckCircleIcon size={18} color="#2563EB" />
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#0F172A' }}>Account Renewal Ready</span>
          </div>
        </div>

        {/* Text Copy */}
        <div style={{ textAlign: 'center', zIndex: 10, maxWidth: '440px' }}>
          <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 10px', letterSpacing: '-0.02em' }}>
            Renew Subscription to Reconnect
          </h2>
          <p style={{ fontSize: '14px', color: '#DBEAFE', margin: 0, fontWeight: 500, lineHeight: 1.6 }}>
            Contact your account administrator to reactivate multi-device routing, high-volume broadcasts, and webhook integrations.
          </p>
        </div>
      </div>
    </div>
  );
};
