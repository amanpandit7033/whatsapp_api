import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import {
  DeviceIcon,
  DotsHorizontalIcon,
  QrCodeIcon,
  CheckCircleIcon,
  CheckIcon,
  RefreshIcon,
  WarningIcon,
  ShieldIcon,
  WhatsAppIcon,
  ArrowRightIcon
} from '../components/Icons';

export const Scan = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [qr, setQr] = useState<string>('');
  const [status, setStatus] = useState<string>('initializing');
  const [instanceId, setInstanceId] = useState('');
  const [qrRefreshed, setQrRefreshed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const pollIntervalRef = useRef<any>(null);

  useEffect(() => {
    let localInstanceId = '';
    let isConnected = false;
    let isNew = false;

    const socket = io(`${import.meta.env.VITE_API_URL}`);
    socketRef.current = socket;

    const init = async () => {
      const idParam = searchParams.get('id');

      if (!idParam) {
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL}/api/instances/create`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          if (res.status === 401) {
            navigate('/login');
            return;
          }
          const data = await res.json();
          if (!res.ok) {
            setError(data.error || 'Failed to create instance');
            setStatus('error');
            return;
          }
          localInstanceId = data.instanceId;
          isNew = true;
        } catch (e: any) {
          setError(e.message || 'Failed to initialize instance');
          setStatus('error');
          return;
        }
      } else {
        localInstanceId = idParam;
        try {
          await fetch(`${import.meta.env.VITE_API_URL}/api/instances/${localInstanceId}/start`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
        } catch (e) {}
      }

      setInstanceId(localInstanceId);

      // Fetch QR immediately
      const fetchQr = async () => {
        try {
          const qrRes = await fetch(`${import.meta.env.VITE_API_URL}/api/instances/${localInstanceId}/qr`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          const qrData = await qrRes.json();
          if (qrData.qr) {
            setQr((prevQr) => {
              if (prevQr && prevQr !== qrData.qr) {
                setQrRefreshed(true);
                setTimeout(() => setQrRefreshed(false), 3500);
              }
              return qrData.qr;
            });
            setStatus((s) => (s === 'initializing' ? 'awaiting_scan' : s));
          }
        } catch (e) {}
      };

      fetchQr();
      pollIntervalRef.current = setInterval(fetchQr, 2000);

      // Listen for socket events
      socket.on(`qr-${localInstanceId}`, (newQrUrl: string) => {
        setQr((prevQr) => {
          if (prevQr && prevQr !== newQrUrl) {
            setQrRefreshed(true);
            setTimeout(() => setQrRefreshed(false), 3500);
          }
          return newQrUrl;
        });
        setStatus((s) => (s === 'initializing' ? 'awaiting_scan' : s));
      });

      socket.on(`status-${localInstanceId}`, (newStatus: string) => {
        setStatus(newStatus);
        if (newStatus === 'connected') {
          isConnected = true;
          setCountdown(2);
          const interval = setInterval(() => {
            setCountdown((c) => {
              if (c !== null && c <= 1) {
                clearInterval(interval);
                navigate('/');
                return 0;
              }
              return c !== null ? c - 1 : 0;
            });
          }, 1000);
        }
      });
    };

    init();

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      socket.disconnect();
      if (isNew && localInstanceId && !isConnected) {
        fetch(`${import.meta.env.VITE_API_URL}/api/instances/${localInstanceId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          keepalive: true
        }).catch(() => {});
      }
    };
  }, [navigate, searchParams]);

  // Manually trigger QR refresh
  const handleManualRefresh = async () => {
    if (!instanceId) return;
    setRefreshing(true);
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/instances/${instanceId}/start`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const qrRes = await fetch(`${import.meta.env.VITE_API_URL}/api/instances/${instanceId}/qr`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const qrData = await qrRes.json();
      if (qrData.qr) {
        setQr(qrData.qr);
        setStatus('awaiting_scan');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setRefreshing(false), 600);
    }
  };

  const isConnected = status === 'connected';
  const isAwaiting = status === 'awaiting_scan';

  return (
    <div className="animate-in" style={{ maxWidth: '1080px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top Header Card */}
      <div className="card" style={{ padding: '24px 28px', background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)', border: '1px solid #E2E8F0' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          
          <div>
            {/* Breadcrumb back button */}
            <button
              onClick={() => navigate('/')}
              style={{
                alignSelf: 'flex-start',
                background: '#EFF6FF',
                border: '1px solid #DBEAFE',
                borderRadius: '8px',
                padding: '6px 12px',
                color: '#2563EB',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '10px',
                transition: 'all 0.2s'
              }}
            >
              <span>←</span>
              <span>Back to Instances</span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
                Connect WhatsApp Device
              </h1>

              {isConnected ? (
                <span className="badge badge-success" style={{ fontSize: '11.5px', fontWeight: 800, padding: '4px 12px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <CheckCircleIcon size={14} color="#15803D" />
                  <span>Connected & Ready</span>
                </span>
              ) : isAwaiting ? (
                <span className="badge badge-warning" style={{ fontSize: '11.5px', fontWeight: 800, padding: '4px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#D97706', animation: 'statusPulse 1.5s infinite' }} />
                  <span>Waiting for WhatsApp Scan</span>
                </span>
              ) : status === 'error' ? (
                <span className="badge badge-danger" style={{ fontSize: '11.5px', fontWeight: 800, padding: '4px 12px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <WarningIcon size={14} color="#DC2626" />
                  <span>Connection Error</span>
                </span>
              ) : (
                <span className="badge badge-neutral" style={{ fontSize: '11.5px', fontWeight: 700, padding: '4px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <RefreshIcon size={12} color="#64748B" style={{ animation: 'spin 1.2s linear infinite' }} />
                  <span>Initializing Secure Channel...</span>
                </span>
              )}
            </div>

            {instanceId && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#475569', background: '#FFFFFF', padding: '4px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', marginTop: '10px' }}>
                <DeviceIcon size={14} color="#2563EB" />
                <span>Session Instance ID: <strong style={{ color: '#0F172A', fontFamily: 'var(--font-mono)' }}>{instanceId}</strong></span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={handleManualRefresh}
              disabled={refreshing || isConnected}
              style={{
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '12px',
                padding: '10px 16px',
                fontSize: '13px',
                fontWeight: 700,
                color: '#475569',
                cursor: (refreshing || isConnected) ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
              }}
            >
              <RefreshIcon size={14} color="#475569" style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
              <span>{refreshing ? 'Refreshing...' : 'Regenerate QR'}</span>
            </button>

            <button
              onClick={() => navigate('/')}
              style={{
                background: '#F1F5F9',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '10px 16px',
                fontSize: '13px',
                fontWeight: 700,
                color: '#64748B',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>

        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 420px) 1fr', gap: '24px', alignItems: 'start' }}>
        
        {/* Left Column: QR Code Stage Card */}
        <div className="card" style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', background: '#FFFFFF' }}>
          
          {/* Socket Feed Status Tag */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '20px', background: isConnected ? '#DCFCE7' : '#EFF6FF', border: `1px solid ${isConnected ? '#BBF7D0' : '#DBEAFE'}`, marginBottom: '24px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: isConnected ? '#16A34A' : '#2563EB', animation: isConnected ? 'none' : 'statusPulse 1.5s infinite', display: 'inline-block' }} />
            <span style={{ fontSize: '12px', fontWeight: 700, color: isConnected ? '#15803D' : '#1E40AF' }}>
              {isConnected ? 'Device Linked Successfully' : 'Real-time WebSocket Live Feed'}
            </span>
          </div>

          {/* QR Viewport Frame */}
          {isConnected ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', animation: 'popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
              <div style={{
                width: '96px',
                height: '96px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                boxShadow: '0 8px 30px rgba(16, 185, 129, 0.35)'
              }}>
                <CheckIcon size={48} color="#FFFFFF" strokeWidth={3} />
              </div>
              <h3 style={{ margin: '0 0 6px', color: '#0F172A', fontSize: '20px', fontWeight: 800 }}>
                WhatsApp Linked!
              </h3>
              <p style={{ margin: '0 0 20px', color: '#059669', fontSize: '14px', fontWeight: 600 }}>
                Your WhatsApp account is now connected and operational.
              </p>
              {countdown !== null && (
                <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', padding: '10px 16px', borderRadius: '12px', color: '#166534', fontSize: '13px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <RefreshIcon size={14} color="#166534" style={{ animation: 'spin 1.2s linear infinite' }} />
                  <span>Redirecting to Dashboard in {countdown}s...</span>
                </div>
              )}
            </div>
          ) : error ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', maxWidth: '300px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <WarningIcon size={28} color="#DC2626" />
              </div>
              <h4 style={{ margin: '0 0 8px', color: '#991B1B', fontSize: '16px', fontWeight: 800 }}>Connection Error</h4>
              <p style={{ margin: '0 0 20px', color: '#DC2626', fontSize: '13px', fontWeight: 500, lineHeight: 1.5 }}>
                {error}
              </p>
              <button
                onClick={() => navigate('/')}
                className="btn-primary"
                style={{ padding: '8px 18px', borderRadius: '10px', fontSize: '13px' }}
              >
                Back to Instances
              </button>
            </div>
          ) : (
            <div style={{ position: 'relative', width: '270px', height: '270px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', borderRadius: '24px', border: '2px dashed #CBD5E1', padding: '14px' }}>
              
              {/* Corner Viewfinder Guides */}
              <div style={{ position: 'absolute', top: '10px', left: '10px', width: '20px', height: '20px', borderTop: '3px solid #2563EB', borderLeft: '3px solid #2563EB', borderTopLeftRadius: '6px' }} />
              <div style={{ position: 'absolute', top: '10px', right: '10px', width: '20px', height: '20px', borderTop: '3px solid #2563EB', borderRight: '3px solid #2563EB', borderTopRightRadius: '6px' }} />
              <div style={{ position: 'absolute', bottom: '10px', left: '10px', width: '20px', height: '20px', borderBottom: '3px solid #2563EB', borderLeft: '3px solid #2563EB', borderBottomLeftRadius: '6px' }} />
              <div style={{ position: 'absolute', bottom: '10px', right: '10px', width: '20px', height: '20px', borderBottom: '3px solid #2563EB', borderRight: '3px solid #2563EB', borderBottomRightRadius: '6px' }} />

              {/* QR Image or Loading Spinner */}
              {qr ? (
                <div style={{ position: 'relative', width: '228px', height: '228px', background: '#FFFFFF', borderRadius: '14px', padding: '10px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
                  <img
                    src={qr}
                    alt="WhatsApp QR Code"
                    style={{ width: '100%', height: '100%', borderRadius: '8px', display: 'block' }}
                  />

                  {/* Animated Scanner Laser */}
                  <div style={{
                    position: 'absolute',
                    left: '10px',
                    right: '10px',
                    height: '2px',
                    background: 'linear-gradient(90deg, transparent, #2563EB, #60A5FA, #2563EB, transparent)',
                    boxShadow: '0 0 10px #2563EB',
                    animation: 'scanLine 2.5s ease-in-out infinite',
                    pointerEvents: 'none'
                  }} />

                  {/* QR Expired & Refreshed Toast */}
                  {qrRefreshed && (
                    <div style={{
                      position: 'absolute',
                      bottom: '-12px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: '#10B981',
                      color: '#FFFFFF',
                      padding: '5px 12px',
                      borderRadius: '20px',
                      fontSize: '11px',
                      fontWeight: 700,
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
                      animation: 'popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      zIndex: 10,
                      whiteSpace: 'nowrap'
                    }}>
                      New QR Code Generated!
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: '42px', height: '42px', border: '3px solid #DBEAFE', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
                  <p style={{ fontSize: '13px', fontWeight: 700, color: '#64748B', margin: 0 }}>Generating QR Code…</p>
                  <span style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px', display: 'block' }}>Establishing Baileys session</span>
                </div>
              )}

            </div>
          )}

          {/* Under QR Micro-instructions */}
          {!isConnected && !error && (
            <p style={{ fontSize: '12px', color: '#64748B', margin: '20px 0 0', fontWeight: 500 }}>
              Point your WhatsApp camera at the QR code above to link your phone.
            </p>
          )}

        </div>

        {/* Right Column: Step-by-Step Interactive Guide */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Instructions Hero Card */}
          <div style={{ background: 'linear-gradient(135deg, #1E40AF 0%, #2563EB 100%)', borderRadius: '20px', padding: '24px 28px', color: '#FFFFFF', boxShadow: '0 8px 24px rgba(37, 99, 235, 0.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <WhatsAppIcon size={24} color="#FFFFFF" />
              </div>
              <div>
                <h3 style={{ fontWeight: 800, fontSize: '17px', margin: 0, letterSpacing: '-0.01em', color: '#FFFFFF' }}>How to Connect Your Device</h3>
                <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.85)', margin: '2px 0 0', fontWeight: 500 }}>Quick setup — takes less than 30 seconds</p>
              </div>
            </div>
            <p style={{ fontSize: '13.5px', lineHeight: 1.6, color: 'rgba(255,255,255,0.95)', margin: 0, fontWeight: 500 }}>
              Follow the quick steps below to pair your WhatsApp account to this instance without sharing login credentials or passwords.
            </p>
          </div>

          {/* 4 Steps Checklist */}
          {[
            {
              step: '01',
              icon: DeviceIcon,
              title: 'Open WhatsApp on your Phone',
              desc: 'Launch the WhatsApp or WhatsApp Business mobile application.'
            },
            {
              step: '02',
              icon: DotsHorizontalIcon,
              title: 'Navigate to Linked Devices',
              desc: 'Tap Menu (3 vertical dots on Android) or Settings (gear icon on iOS) → Linked Devices.'
            },
            {
              step: '03',
              icon: QrCodeIcon,
              title: 'Tap "Link a Device"',
              desc: 'Point your camera viewfinder directly at the QR code displayed on the left.'
            },
            {
              step: '04',
              icon: CheckCircleIcon,
              title: 'Instant Synchronization',
              desc: 'Once scanned, your instance automatically goes Live and begins dispatching messages.'
            }
          ].map(({ step, icon: IconComponent, title, desc }) => (
            <div
              key={step}
              className="card"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '16px',
                padding: '16px 20px',
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease'
              }}
            >
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                flexShrink: 0,
                background: '#EFF6FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #DBEAFE'
              }}>
                <IconComponent size={18} color="#2563EB" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    color: '#2563EB',
                    fontFamily: 'var(--font-mono)',
                    background: '#EFF6FF',
                    padding: '2px 6px',
                    borderRadius: '6px'
                  }}>
                    STEP {step}
                  </span>
                  <h4 style={{ fontWeight: 800, fontSize: '14px', color: '#0F172A', margin: 0 }}>
                    {title}
                  </h4>
                </div>
                <p style={{ fontSize: '13px', color: '#64748B', margin: 0, fontWeight: 500, lineHeight: 1.5 }}>
                  {desc}
                </p>
              </div>
            </div>
          ))}

          {/* Security & Privacy Banner */}
          <div style={{ background: '#F8FAFC', borderRadius: '16px', padding: '16px 20px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ShieldIcon size={18} color="#059669" />
            </div>
            <div>
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', display: 'block' }}>End-to-End Encrypted Session</span>
              <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>Your WhatsApp credentials, chats, and keys are fully isolated and encrypted on your dedicated server.</span>
            </div>
          </div>

        </div>

      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes statusPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.6); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes scanLine {
          0% { top: 10px; opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { top: 218px; opacity: 0; }
        }
      `}</style>

    </div>
  );
};
