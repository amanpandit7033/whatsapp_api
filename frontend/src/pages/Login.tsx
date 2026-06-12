import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MailIcon, LockIcon, WhatsAppIcon, ApiIcon, SendIcon } from '../components/Icons';

export const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem('token', data.token);
        if (data.isAdmin) {
          localStorage.setItem('isAdmin', 'true');
        } else {
          localStorage.removeItem('isAdmin');
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
      } else if (!isLogin && data.message) {
        setIsLogin(true);
        alert('Registered successfully. Please login.');
      } else {
        alert(data.error);
      }
    } catch (e) {
      alert('Network error');
    }
  };

  return (
    <div className="auth-split-screen">
      
      {/* LEFT SIDE: Form */}
      <div className="auth-split-left">
        <div className="auth-card animate-in">
          <div style={{ textAlign: 'left', marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '40px', color: '#0b47ff', fontWeight: 800, fontSize: '20px' }}>
              <div style={{ width: 24, height: 24, background: '#0b47ff', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 8, height: 8, background: '#fff', borderRadius: '50%' }}></div>
              </div>
              dotwork
            </div>
            <h2 className="auth-title">
              Welcome Back
            </h2>
            <p className="auth-subtitle">Sign in to WA API Gateway</p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group" style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
                <MailIcon size={18} />
              </div>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="rounded-input"
                style={{ paddingLeft: '44px', width: '100%', boxSizing: 'border-box' }}
                placeholder="Username"
                required
              />
            </div>
            <div className="form-group" style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
                <LockIcon size={18} />
              </div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="rounded-input"
                style={{ paddingLeft: '44px', width: '100%', boxSizing: 'border-box' }}
                placeholder="Password"
                required
              />
            </div>
            
            <div style={{ marginTop: '24px' }}>
              <button
                type="submit"
                className="btn-primary"
                style={{ width: '100%' }}
              >
                Login
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* RIGHT SIDE: Blue Graphic */}
      <div className="auth-split-right">
        <div className="auth-graphic-circle">
          <div className="auth-graphic-circle-inner"></div>
          <div className="auth-graphic-floating" style={{ width: 48, height: 48, top: 40, left: 60, color: '#0b47ff' }}>
            <WhatsAppIcon size={24} />
          </div>
          <div className="auth-graphic-floating" style={{ width: 64, height: 64, left: -32, color: '#0b47ff' }}>
            <ApiIcon size={32} />
          </div>
          <div className="auth-graphic-floating" style={{ width: 56, height: 56, bottom: 40, left: 80, color: '#0b47ff' }}>
            <SendIcon size={28} />
          </div>
          
          <div style={{ position: 'absolute', right: -60, background: '#e2e8f0', width: 280, height: 200, borderRadius: '12px 12px 0 0', padding: 12, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
              <div style={{ width: 10, height: 10, background: '#ef4444', borderRadius: '50%' }}></div>
              <div style={{ width: 10, height: 10, background: '#f59e0b', borderRadius: '50%' }}></div>
              <div style={{ width: 10, height: 10, background: '#10b981', borderRadius: '50%' }}></div>
            </div>
            <div style={{ background: '#fff', borderRadius: 8, height: 32, marginBottom: 8, display: 'flex', alignItems: 'center', padding: '0 12px' }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#cbd5e1' }}></div>
              <div style={{ width: 120, height: 8, background: '#e2e8f0', borderRadius: 4, marginLeft: 12 }}></div>
            </div>
            <div style={{ background: '#fff', borderRadius: 8, height: 32, marginBottom: 8, display: 'flex', alignItems: 'center', padding: '0 12px' }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#cbd5e1' }}></div>
              <div style={{ width: 100, height: 8, background: '#e2e8f0', borderRadius: 4, marginLeft: 12 }}></div>
            </div>
            <div style={{ background: '#fff', borderRadius: 8, height: 32, display: 'flex', alignItems: 'center', padding: '0 12px' }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#cbd5e1' }}></div>
              <div style={{ width: 80, height: 8, background: '#e2e8f0', borderRadius: 4, marginLeft: 12 }}></div>
            </div>
          </div>
        </div>

        <div className="auth-split-right-content" style={{ marginTop: '300px' }}>
          <h2 className="auth-split-right-title">connect with every applications</h2>
          <p className="auth-split-right-subtitle">Everything you need a customizable dashboard</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 32 }}>
            <div style={{ width: 8, height: 8, background: '#fff', borderRadius: '50%' }}></div>
            <div style={{ width: 8, height: 8, background: '#fff', borderRadius: '50%', opacity: 0.5 }}></div>
            <div style={{ width: 8, height: 8, background: '#fff', borderRadius: '50%', opacity: 0.5 }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};
