import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GlassWhatsAppIcon,
  GlassUserIcon,
  GlassLockIcon,
  GlassShieldIcon,
  GlassCheckCircleIcon,
  GlassDeviceIcon,
  GlassSendIcon,
  GlassWarningIcon
} from '../components/GlassIcons';

export const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [branding, setBranding] = useState<{ brandName: string; brandLogoUrl: string | null; isCustom: boolean }>({
    brandName: 'WhatsApp Gateway',
    brandLogoUrl: null,
    isCustom: false
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/branding`)
      .then(res => res.json())
      .then(data => {
        if (data && data.brandName) {
          setBranding(data);
          document.title = `${data.brandName} - Login`;
        }
      })
      .catch(() => { });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      setLoading(false);

      if (data.token) {
        localStorage.setItem('token', data.token);
        if (data.username) {
          localStorage.setItem('username', data.username);
        } else {
          localStorage.setItem('username', username);
        }
        if (data.isAdmin) {
          localStorage.setItem('isAdmin', 'true');
        } else {
          localStorage.removeItem('isAdmin');
        }
        if (data.isReseller) {
          localStorage.setItem('isReseller', 'true');
        } else {
          localStorage.removeItem('isReseller');
        }
        if (data.role) {
          localStorage.setItem('role', data.role);
        }
        if (data.permissions) {
          localStorage.setItem('permissions', data.permissions);
        }

        if (data.isExpired) {
          localStorage.setItem('isExpired', 'true');
          navigate('/expired');
        } else {
          localStorage.removeItem('isExpired');
          navigate('/');
        }
      } else {
        setError(data.error || 'Invalid credentials');
      }
    } catch (e) {
      setLoading(false);
      setError('Unable to connect to authentication server');
    }
  };

  return (
    <div className="auth-split-screen" style={{ background: '#F8FAFC', minHeight: '100vh', display: 'flex' }}>

      {/* LEFT SIDE: Login Form */}
      <div className="auth-split-left" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 32px' }}>
        <div className="auth-card animate-in" style={{ width: '100%', maxWidth: '400px', padding: 0 }}>

          {/* Brand Header */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
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

            <h2 className="auth-card-title" style={{ fontSize: '26px', fontWeight: 800, color: '#0F172A', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
              Sign In to Your Account
            </h2>
            <p style={{ fontSize: '14px', color: '#64748B', margin: 0, fontWeight: 500, lineHeight: 1.5 }}>
              Enter your administrative or account credentials below to access the gateway panel.
            </p>
          </div>

          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: '12px', padding: '12px 16px', color: '#DC2626', fontSize: '13px', fontWeight: 600, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <GlassWarningIcon size={16} /> <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#64748B', marginBottom: '8px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Username</label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
                  <GlassUserIcon size={20} />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="rounded-input"
                  style={{ paddingLeft: '46px', width: '100%', height: '48px', fontSize: '14px', borderRadius: '12px', background: '#FFFFFF', border: '1.5px solid #E2E8F0' }}
                  placeholder="Enter username"
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#64748B', marginBottom: '8px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
                  <GlassLockIcon size={20} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="rounded-input"
                  style={{ paddingLeft: '46px', width: '100%', height: '48px', fontSize: '14px', borderRadius: '12px', background: '#FFFFFF', border: '1.5px solid #E2E8F0' }}
                  placeholder="••••••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{
                width: '100%', height: '50px', fontSize: '15px', fontWeight: 800, borderRadius: '12px', marginTop: '6px',
                background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 60%, #1E40AF 100%)', border: 'none', color: '#FFFFFF', cursor: 'pointer',
                fontFamily: 'var(--font-sans)', letterSpacing: '-0.01em',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                boxShadow: '0 4px 16px rgba(37, 99, 235, 0.4)', transition: 'all 0.2s ease'
              }}
            >
              {loading ? (
                'Authenticating...'
              ) : (
                <>
                  <span>Sign In to Panel</span>
                  <GlassSendIcon size={18} />
                </>
              )}
            </button>
          </form>

          {/* Security Footnote */}
          <div style={{ marginTop: '36px', paddingTop: '20px', borderTop: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#94A3B8', fontSize: '12px', fontWeight: 600 }}>
            <GlassShieldIcon size={16} /> 256-Bit SSL Encrypted Admin Access
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: Vibrant Royal Blue SaaS Visual Panel */}
      <div className="auth-split-right" style={{ flex: 1.2, background: 'linear-gradient(135deg, #1E40AF 0%, #2563EB 50%, #1D4ED8 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px', position: 'relative', overflow: 'hidden' }}>

        {/* Glowing Background Orbs */}
        <div style={{ position: 'absolute', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0) 70%)', top: '-120px', right: '-120px', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0) 70%)', bottom: '-100px', left: '-100px', pointerEvents: 'none' }} />

        {/* API Console Showcase Window */}
        <div className="auth-terminal-window" style={{ position: 'relative', width: '100%', maxWidth: '480px', marginBottom: '40px', zIndex: 10 }}>

          {/* Glassmorphic Card Container */}
          <div style={{ background: 'rgba(255, 255, 255, 0.12)', backdropFilter: 'blur(20px)', borderRadius: '24px', padding: '24px', border: '1px solid rgba(255, 255, 255, 0.25)', boxShadow: '0 25px 60px rgba(0, 0, 0, 0.25)' }}>
            {/* Header bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#EF4444' }} />
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#F59E0B' }} />
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10B981' }} />
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#FFFFFF', fontFamily: 'var(--font-mono)', marginLeft: '8px', letterSpacing: '0.04em' }}>
                  api_gateway.log
                </span>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#065F46', background: '#D1FAE5', border: '1px solid #A7F3D0', padding: '4px 12px', borderRadius: '9999px', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
                ● 200 OK
              </span>
            </div>

            {/* Code Output Box */}
            <div style={{ background: '#0F172A', borderRadius: '16px', padding: '20px', color: '#F8FAFC', fontFamily: 'var(--font-mono)', fontSize: '13px', lineHeight: '1.7', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ color: '#38BDF8', marginBottom: '6px', fontWeight: 700 }}>POST /api/v1/broadcast/send</div>
              <div style={{ color: '#94A3B8' }}>&#123;</div>
              <div style={{ paddingLeft: '16px' }}><span style={{ color: '#93C5FD' }}>"instanceId"</span>: <span style={{ color: '#FDE047' }}>"inst_sales_01"</span>,</div>
              <div style={{ paddingLeft: '16px' }}><span style={{ color: '#93C5FD' }}>"recipient"</span>: <span style={{ color: '#FDE047' }}>"+919876543210"</span>,</div>
              <div style={{ paddingLeft: '16px' }}><span style={{ color: '#93C5FD' }}>"deliveryStatus"</span>: <span style={{ color: '#34D399' }}>"DELIVERED"</span>,</div>
              <div style={{ paddingLeft: '16px' }}><span style={{ color: '#93C5FD' }}>"latencyMs"</span>: <span style={{ color: '#38BDF8' }}>14</span></div>
              <div style={{ color: '#94A3B8' }}>&#125;</div>
            </div>
          </div>

          {/* Floating Pill Badges with SVG Icons */}
          <div className="floating-badge-top" style={{ position: 'absolute', top: '-18px', right: '-18px', background: '#FFFFFF', padding: '10px 18px', borderRadius: '14px', boxShadow: '0 12px 30px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <GlassDeviceIcon size={20} />
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#0F172A' }}>Multi-Instance Router</span>
          </div>

          <div className="floating-badge-bottom" style={{ position: 'absolute', bottom: '-18px', left: '-18px', background: '#FFFFFF', padding: '10px 18px', borderRadius: '14px', boxShadow: '0 12px 30px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <GlassCheckCircleIcon size={20} />
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#0F172A' }}>99.9% Delivery Guarantee</span>
          </div>
        </div>

        {/* Text Copy */}
        <div style={{ textAlign: 'center', zIndex: 10, maxWidth: '440px' }}>
          <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 10px', letterSpacing: '-0.02em' }}>
            Enterprise WhatsApp Control Panel
          </h2>
          <p style={{ fontSize: '14px', color: '#DBEAFE', margin: 0, fontWeight: 500, lineHeight: 1.6 }}>
            Streamlined authentication portal for managing WhatsApp paired instances, automated broadcasts, and RESTful webhooks.
          </p>
        </div>
      </div>
    </div>
  );
};

