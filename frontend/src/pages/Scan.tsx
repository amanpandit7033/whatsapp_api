import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { DeviceIcon, DotsHorizontalIcon, QrCodeIcon, CheckCircleIcon, CheckIcon } from '../components/Icons';

export const Scan = () => {
  const [qr, setQr] = useState<string>('');
  const [status, setStatus] = useState<string>('initializing');
  const [linkMethod, setLinkMethod] = useState<'qr' | 'phone'>('qr');
  const [instanceId, setInstanceId] = useState('');
  const [qrRefreshed, setQrRefreshed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const navigate = useNavigate();

  useEffect(() => {
    let localInstanceId = '';
    const socket = io(`${import.meta.env.VITE_API_URL}`);
    let isConnected = false;
    let isNew = false;

    const init = async () => {
      const searchParams = new URLSearchParams(window.location.search);
      let id = searchParams.get('id');

      if (!id) {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/instances/create`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.status === 401) { navigate('/login'); return; }
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Failed to create instance');
          setStatus('error');
          return;
        }
        localInstanceId = data.instanceId;
        isNew = true;
      } else {
        localInstanceId = id;
        await fetch(`${import.meta.env.VITE_API_URL}/api/instances/${localInstanceId}/start`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
      }
      setInstanceId(localInstanceId);

      const pollAction = async () => {
        try {
          const qrRes = await fetch(`${import.meta.env.VITE_API_URL}/api/instances/${localInstanceId}/qr`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
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
            setStatus((s) => s === 'initializing' ? 'awaiting_scan' : s);
          }
        } catch (e) {}
      };

      pollAction(); // immediate check
      const pollQr = setInterval(pollAction, 1500);

      socket.on(`qr-${localInstanceId}`, (newQrUrl: string) => {
        setQr((prevQr) => {
          if (prevQr && prevQr !== newQrUrl) {
            setQrRefreshed(true);
            setTimeout(() => setQrRefreshed(false), 3500);
          }
          return newQrUrl;
        });
        setStatus((s) => s === 'initializing' ? 'awaiting_scan' : s);
      });

      socket.on(`status-${localInstanceId}`, (newStatus: string) => {
        setStatus(newStatus);
        if (newStatus === 'connected') {
          isConnected = true;
          setTimeout(() => navigate('/'), 2000);
        }
      });

      socket.on(`pairing-${localInstanceId}`, (code: string) => {
        setPairingCode(code);
        setRequestingCode(false);
      });

      socket.on(`pairing-error-${localInstanceId}`, (error: string) => {
        setErrorMsg(error);
        setRequestingCode(false);
      });

      return () => clearInterval(pollQr);
    };

    const cleanup = init();
    return () => {
      cleanup.then(cleanFn => cleanFn && cleanFn());
      socket.disconnect();
      if (isNew && localInstanceId && !isConnected) {
        fetch(`${import.meta.env.VITE_API_URL}/api/instances/${localInstanceId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
          keepalive: true
        }).catch(() => {});
      }
    };
  }, [navigate]);

  const handleRequestCode = async () => {
    if (!phoneNumber) return;
    setRequestingCode(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/instances/${instanceId}/pairing-code`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ number: phoneNumber })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to request code');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
      setRequestingCode(false);
    }
  };

  const isConnected = status === 'connected';
  const isAwaiting = status === 'awaiting_scan';

  return (
    <div className="animate-in" style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Connect WhatsApp</h1>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px', fontWeight: 500 }}>
            Link a WhatsApp number to your instance.
          </p>
        </div>
      </div>

      {/* No tabs needed */}
      <div className="scan-grid">
        {/* Main Card */}
        <div style={{
          background: 'white', borderRadius: '24px', padding: '32px',
          border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 8px 32px rgba(0,0,0,0.06)',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}>
          {/* Status Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '6px 16px', borderRadius: '9999px', marginBottom: '24px',
            background: isConnected ? '#f0fdf4' : isAwaiting ? '#fffbeb' : '#f8fafc',
            border: `1px solid ${isConnected ? '#bbf7d0' : isAwaiting ? '#fde68a' : '#e2e8f0'}`,
          }}>
            <span style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: isConnected ? '#22c55e' : isAwaiting ? '#f59e0b' : '#94a3b8',
              boxShadow: isConnected ? '0 0 0 3px rgba(34,197,94,0.2)' : isAwaiting ? '0 0 0 3px rgba(245,158,11,0.2)' : 'none',
              animation: (isAwaiting || isConnected) ? 'statusPulse 2s infinite' : 'none',
              display: 'inline-block',
            }}></span>
            <span style={{
              fontSize: '13px', fontWeight: 700,
              color: isConnected ? '#16a34a' : isAwaiting ? '#d97706' : '#64748b',
              textTransform: 'capitalize'
            }}>
              {status.replace('_', ' ')}
            </span>
          </div>

          {isConnected ? (
             <div style={{ textAlign: 'center', animation: 'popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
               <div style={{
                 width: '80px', height: '80px', borderRadius: '50%',
                 background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                 display: 'flex', alignItems: 'center', justifyContent: 'center',
                 margin: '0 auto 12px',
                 boxShadow: '0 8px 24px rgba(34,197,94,0.4)'
               }}>
                 <CheckIcon size={40} color="white" />
               </div>
               <p style={{ fontWeight: 700, color: '#16a34a', fontSize: '15px', margin: 0 }}>Connected!</p>
             </div>
           ) : (
             <div style={{
               width: '260px', height: '260px',
               background: error ? '#fef2f2' : 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
               borderRadius: '20px', border: `2px solid ${error ? '#fca5a5' : '#e2e8f0'}`,
               display: 'flex', alignItems: 'center', justifyContent: 'center',
               marginBottom: '24px', position: 'relative', padding: '20px', textAlign: 'center'
             }}>
               {error ? (
                 <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                   <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                     <span style={{ color: '#ef4444', fontSize: '24px', fontWeight: 'bold' }}>!</span>
                   </div>
                   <p style={{ margin: 0, fontWeight: 700, color: '#b91c1c', fontSize: '15px' }}>Access Denied</p>
                   <p style={{ margin: 0, color: '#ef4444', fontSize: '13px', fontWeight: 500, lineHeight: 1.5 }}>{error}</p>
                 </div>
               ) : qr ? (
                 <>
                   <img src={qr} alt="WhatsApp QR Code" style={{ width: '220px', height: '220px', borderRadius: '8px', display: 'block' }} />
                   {qrRefreshed && (
                     <div style={{
                       position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
                       background: '#10b981', color: 'white', padding: '6px 12px', borderRadius: '20px',
                       fontSize: '12px', fontWeight: 600, boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
                       animation: 'popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)', zIndex: 10, whiteSpace: 'nowrap'
                     }}>
                       Old QR expired. New QR generated!
                     </div>
                   )}
                 </>
               ) : (
                 <div style={{ textAlign: 'center' }}>
                   <div style={{
                     width: '48px', height: '48px', border: '4px solid #e0e7ff', borderTopColor: '#4f46e5',
                     borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px'
                   }}></div>
                   <p style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8', margin: 0 }}>Generating QR…</p>
                 </div>
               )}
             </div>
          )}
        </div>

        {/* Instructions Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: '#4F46E5', borderRadius: '24px', padding: '28px', color: 'white' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <QrCodeIcon size={24} color="white" />
                </div>
                <div>
                  <h3 style={{ fontWeight: 800, fontSize: '16px', margin: 0 }}>Scan to Connect</h3>
                  <p style={{ fontSize: '13px', opacity: 0.7, margin: '2px 0 0', fontWeight: 500 }}>Takes less than 30 seconds</p>
                </div>
              </div>
              <p style={{ fontSize: '14px', lineHeight: '1.7', opacity: 0.85, margin: 0, fontWeight: 500 }}>
                Open WhatsApp on your phone and link this device by scanning the QR code on the left.
              </p>
            </div>

          {[
            { step: 1, icon: DeviceIcon, title: 'Open WhatsApp', desc: 'Launch the WhatsApp app on your phone.' },
            { step: 2, icon: DotsHorizontalIcon, title: 'Go to Settings', desc: 'Tap the three-dot menu → Linked Devices.' },
            { step: 3, icon: QrCodeIcon, title: 'Link a Device', desc: 'Tap "Link a Device" then point your camera at the QR.' },
            { step: 4, icon: CheckCircleIcon, title: 'Done!', desc: 'You\'re connected. Your instance is now live.' },
          ].map(({ step, icon: IconComponent, title, desc }) => (
            <div key={step} className="card" style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '16px 20px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0, background: '#F3E8FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IconComponent size={18} color="#7C3AED" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                  <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#4F46E5', color: 'white', fontSize: '11px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{step}</span>
                  <h4 style={{ fontWeight: 700, fontSize: '14px', color: '#0F172A', margin: 0 }}>{title}</h4>
                </div>
                <p style={{ fontSize: '13px', color: '#64748B', margin: 0, fontWeight: 500, paddingLeft: '28px' }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes statusPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.9); }
        }
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.5); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};
