import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GlassWhatsAppIcon,
  GlassWarningIcon,
  GlassLockIcon,
  GlassShieldIcon,
  GlassCheckCircleIcon,
  GlassRefreshIcon,
  GlassActivityIcon,
  GlassDeviceIcon,
  GlassSendIcon
} from '../components/GlassIcons';

export const Expired = () => {
  const navigate = useNavigate();
  const [branding, setBranding] = useState<{ brandName: string; brandLogoUrl: string | null; isCustom: boolean }>({
    brandName: 'WhatsApp Gateway',
    brandLogoUrl: null,
    isCustom: false
  });

  const username = localStorage.getItem('username') || 'Account User';

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/branding`)
      .then(res => res.json())
      .then(data => {
        if (data && data.brandName) {
          setBranding(data);
          document.title = `${data.brandName} - Subscription Expired`;
        }
      })
      .catch(() => {});
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('isReseller');
    localStorage.removeItem('isExpired');
    localStorage.removeItem('username');
    navigate('/login');
  };

  return (
    <div className="auth-split-screen" style={{ background: '#F8FAFC', minHeight: '100vh', display: 'flex' }}>
      
      {/* LEFT SIDE: Expired Notice & Actions */}
      <div className="auth-split-left" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 32px' }}>
        <div className="auth-card animate-in" style={{ width: '100%', maxWidth: '440px', padding: 0 }}>
          
          {/* Brand Header */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
              {branding.brandLogoUrl ? (
                <img src={branding.brandLogoUrl} alt={branding.brandName} style={{ width: '44px', height: '44px', borderRadius: '12px', objectFit: 'contain' }} />
              ) : (
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <GlassWhatsAppIcon size={44} />
                </div>
              )}
              <div>
                <h1 style={{ margin: 0, fontSize: '19px', fontWeight: 900, color: '#0F172A', letterSpacing: '-0.02em', lineHeight: 1.2 }}>{branding.brandName}</h1>
                <p style={{ margin: 0, fontSize: '11px', fontWeight: 800, color: '#2563EB', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Enterprise Control Panel</p>
              </div>
            </div>

            {/* Warning Badge Card */}
            <div style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '10px', 
              background: '#FEF2F2', 
              border: '1px solid #FEE2E2', 
              padding: '8px 16px', 
              borderRadius: '9999px', 
              marginBottom: '20px' 
            }}>
              <GlassWarningIcon size={18} />
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#DC2626', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Access Suspended • Subscription Expired
              </span>
            </div>

            <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#0F172A', margin: '0 0 12px', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              Your Plan Has Expired
            </h2>
            <p style={{ fontSize: '14px', color: '#64748B', margin: 0, fontWeight: 500, lineHeight: 1.6 }}>
              Your account access to the WhatsApp API Gateway has been paused. Contact your system administrator or account representative to renew your service and resume instant messaging.
            </p>
          </div>

          {/* Account Details Box */}
          <div style={{ 
            background: '#F1F5F9', 
            borderRadius: '16px', 
            padding: '16px 20px', 
            marginBottom: '24px', 
            border: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Account User</span>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>{username}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</span>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#DC2626', background: '#FEE2E2', padding: '3px 10px', borderRadius: '6px', marginTop: '2px', display: 'inline-block' }}>
                Inactive
              </div>
            </div>
          </div>

          {/* Return to Login Action */}
          <button 
            onClick={handleLogout}
            className="btn-primary"
            style={{
              width: '100%', 
              height: '52px', 
              fontSize: '15px', 
              fontWeight: 800, 
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 60%, #1E40AF 100%)', 
              border: 'none', 
              color: '#FFFFFF', 
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)', 
              letterSpacing: '-0.01em',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '10px',
              boxShadow: '0 4px 16px rgba(37, 99, 235, 0.35)', 
              transition: 'all 0.2s ease'
            }}
          >
            <GlassRefreshIcon size={20} />
            <span>Return to Sign In</span>
          </button>

          {/* Security Footnote */}
          <div style={{ marginTop: '36px', paddingTop: '20px', borderTop: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#94A3B8', fontSize: '12px', fontWeight: 600 }}>
            <GlassShieldIcon size={16} /> 256-Bit SSL Encrypted Enterprise Gateway
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: Vibrant Royal Blue SaaS Showcase Visual Panel */}
      <div className="auth-split-right" style={{ 
        flex: 1.2, 
        background: 'linear-gradient(135deg, #1E40AF 0%, #2563EB 50%, #1D4ED8 100%)', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: '60px', 
        position: 'relative', 
        overflow: 'hidden' 
      }}>
        
        {/* Background Glowing Ambient Orbs */}
        <div style={{ position: 'absolute', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0) 70%)', top: '-120px', right: '-120px', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0) 70%)', bottom: '-100px', left: '-100px', pointerEvents: 'none' }} />

        {/* Expired Status Multi-Layer Glass Showcase Card */}
        <div style={{ position: 'relative', width: '100%', maxWidth: '460px', marginBottom: '36px', zIndex: 10 }}>
          <div style={{ 
            background: 'rgba(255, 255, 255, 0.12)', 
            backdropFilter: 'blur(24px)', 
            borderRadius: '24px', 
            padding: '28px', 
            border: '1px solid rgba(255, 255, 255, 0.25)', 
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.25)' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#EF4444', boxShadow: '0 0 10px #EF4444' }} />
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '0.05em' }}>GATEWAY SERVICE STATUS</span>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#EF4444', background: '#FEE2E2', padding: '4px 12px', borderRadius: '9999px' }}>
                PAUSED
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Feature Item 1 */}
              <div style={{ background: 'rgba(255, 255, 255, 0.95)', borderRadius: '16px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 4px 14px rgba(0,0,0,0.06)' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <GlassLockIcon size={22} />
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>API Routes & OTP Gateway</h4>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Message dispatch temporarily paused</p>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#DC2626', background: '#FEF2F2', padding: '3px 8px', borderRadius: '6px' }}>Locked</span>
              </div>

              {/* Feature Item 2 */}
              <div style={{ background: 'rgba(255, 255, 255, 0.95)', borderRadius: '16px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 4px 14px rgba(0,0,0,0.06)' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <GlassDeviceIcon size={22} />
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>Multi-SIM Instances & Data</h4>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Sessions & configurations safely preserved</p>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#2563EB', background: '#EFF6FF', padding: '3px 8px', borderRadius: '6px' }}>Saved</span>
              </div>
            </div>
          </div>

          {/* Floating Pill Badges */}
          <div style={{ 
            position: 'absolute', 
            top: '-16px', 
            right: '-16px', 
            background: '#FFFFFF', 
            padding: '10px 18px', 
            borderRadius: '14px', 
            boxShadow: '0 12px 30px rgba(0,0,0,0.18)', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px' 
          }}>
            <GlassCheckCircleIcon size={20} />
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#0F172A' }}>Instant Reactivation Ready</span>
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
