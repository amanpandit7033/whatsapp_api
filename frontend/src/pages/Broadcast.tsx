import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  PaperclipIcon, 
  SendIcon, 
  SparklesIcon, 
  CheckIcon, 
  WarningIcon, 
  PlusIcon, 
  CheckCircleIcon, 
  SwapIcon, 
  XCircleIcon,
  EyeIcon,
  PhoneIcon,
  LinkIcon,
  MessageSquareIcon,
  XIcon,
} from '../components/Icons';

// ─── Types ───────────────────────────────────
type MsgMode = 'text' | 'media' | 'interactive';
type BtnType = 'quick_reply' | 'cta_url' | 'cta_call';
interface IButton { type: BtnType; label: string; url?: string; phone?: string; id?: string; }

const cardStyle: React.CSSProperties = {
  background: 'white', borderRadius: '18px', padding: '24px',
  border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '11px', fontWeight: 800, color: '#64748B', marginBottom: '8px',
  letterSpacing: '0.05em', textTransform: 'uppercase',
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 16px', background: '#F8FAFC',
  border: '1px solid #E2E8F0', borderRadius: '10px', fontSize: '14px',
  fontWeight: 500, color: '#0F172A', fontFamily: 'inherit',
  outline: 'none', boxSizing: 'border-box' as const, transition: 'all 0.2s ease',
};
const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' };
const taStyle: React.CSSProperties = { ...inputStyle, resize: 'vertical' as const, lineHeight: 1.6 };

// ─── Button-type label map ───────────────────
const BTN_LABELS: Record<BtnType, string> = {
  quick_reply: 'Quick Reply',
  cta_url: 'URL Button',
  cta_call: 'Call Button',
};
const BTN_COLORS: Record<BtnType, string> = {
  quick_reply: '#4F46E5',
  cta_url: '#0EA5E9',
  cta_call: '#10B981',
};

// ─── Live WhatsApp-style preview ─────────────
const Preview = ({ mode, message, mediaUrl, headerType, headerText, headerImageUrl, body, footer, buttons }:
  { mode: MsgMode; message: string; mediaUrl: string; headerType: string; headerText: string; headerImageUrl: string; body: string; footer: string; buttons: IButton[] }) => (
  <div style={{ background: '#e5ddd5', borderRadius: '16px', padding: '16px', minHeight: '200px', backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'50\' height=\'50\' viewBox=\'0 0 50 50\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23000000\' fill-opacity=\'0.03\'%3E%3Ccircle cx=\'25\' cy=\'25\' r=\'10\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}>
    <p style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', marginBottom: '8px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
      <EyeIcon size={13} color="#6b7280" /> Live Preview
    </p>
    <div style={{ maxWidth: '280px', marginLeft: 'auto' }}>
      <div style={{ background: 'white', borderRadius: '8px 2px 8px 8px', boxShadow: '0 1px 3px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
        {/* Header */}
        {mode === 'interactive' && headerType === 'image' && headerImageUrl && (
          <img src={headerImageUrl} alt="header" style={{ width: '100%', height: '120px', objectFit: 'cover', display: 'block' }} onError={e => (e.currentTarget.style.display = 'none')} />
        )}
        {mode === 'interactive' && headerType === 'text' && headerText && (
          <div style={{ background: '#f0f4f8', padding: '10px 12px', borderBottom: '1px solid #e2e8f0' }}>
            <p style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a', margin: 0 }}>{headerText}</p>
          </div>
        )}
        {mode === 'media' && mediaUrl && (
          <div style={{ background: '#f0f4f8', padding: '10px 12px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PaperclipIcon size={16} color="#94a3b8" />
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mediaUrl}</p>
          </div>
        )}

        {/* Body */}
        <div style={{ padding: '10px 12px' }}>
          <p style={{ fontSize: '14px', color: '#1a1a1a', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
            {mode === 'text' ? (message || <span style={{ color: '#94a3b8' }}>Your message…</span>)
              : mode === 'interactive' ? (body || <span style={{ color: '#94a3b8' }}>Message body…</span>)
              : (message || <span style={{ color: '#94a3b8' }}>Caption…</span>)}
          </p>
          {mode === 'interactive' && footer && (
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '6px 0 0', fontStyle: 'italic' }}>{footer}</p>
          )}
          <p style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'right', margin: '4px 0 0' }}>12:00 ✓✓</p>
        </div>

        {/* Buttons */}
        {mode === 'interactive' && buttons.filter(b => b.label).length > 0 && (
          <div style={{ borderTop: '1px solid #e2e8f0' }}>
            {buttons.filter(b => b.label).map((btn, i) => (
              <div key={i} style={{
                padding: '10px 12px', borderBottom: i < buttons.length - 1 ? '1px solid #f1f5f9' : 'none',
                textAlign: 'center', color: BTN_COLORS[btn.type], fontWeight: 700, fontSize: '13px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              }}>
                {btn.type === 'cta_url' ? <LinkIcon size={14} color={BTN_COLORS[btn.type]} /> : btn.type === 'cta_call' ? <PhoneIcon size={14} color={BTN_COLORS[btn.type]} /> : <MessageSquareIcon size={14} color={BTN_COLORS[btn.type]} />} {btn.label || 'Button'}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────
export const Broadcast = () => {
  const [instances, setInstances] = useState<any[]>([]);
  const [selectedInstances, setSelectedInstances] = useState<string[]>([]);
  const [numbers, setNumbers] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [results, setResults] = useState<{ number: string; status: string; error?: string; fallback?: boolean }[]>([]);
  const navigate = useNavigate();

  // Mode
  const [mode, setMode] = useState<MsgMode>('text');

  // Text/Media fields
  const [message, setMessage] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);

  // Interactive fields
  const [headerType, setHeaderType] = useState<'none' | 'text' | 'image'>('none');
  const [headerText, setHeaderText] = useState('');
  const [headerImageUrl, setHeaderImageUrl] = useState('');
  const [headerImageFile, setHeaderImageFile] = useState<File | null>(null);
  const [body, setBody] = useState('');
  const [footer, setFooter] = useState('');
  const [buttons, setButtons] = useState<IButton[]>([{ type: 'quick_reply', label: '', id: 'btn_1' }]);

  useEffect(() => { fetchInstances(); }, []);

  const fetchInstances = async () => {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/instances`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    if (res.status === 401) { navigate('/login'); return; }
    const data = await res.json();
    setInstances((data.instances || []).filter((i: any) => i.status === 'connected'));
  };

  const toggleInstance = (id: string) => {
    setSelectedInstances(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const updateButton = (i: number, patch: Partial<IButton>) => {
    setButtons(prev => prev.map((b, idx) => idx === i ? { ...b, ...patch } : b));
  };

  const addButton = () => {
    if (buttons.length >= 3) return;
    setButtons(prev => [...prev, { type: 'quick_reply', label: '', id: `btn_${prev.length + 1}` }]);
  };

  const removeButton = (i: number) => setButtons(prev => prev.filter((_, idx) => idx !== i));

  const handleSend = async () => {
    if (selectedInstances.length === 0) return alert('Select at least one instance');
    const numberList = numbers.split('\n').map(n => n.trim()).filter(n => n);
    if (!numberList.length) return alert('Enter at least one number');

    if (mode === 'text' && !message.trim()) return alert('Enter a message');
    if (mode === 'interactive' && !body.trim()) return alert('Enter a message body');

    setIsSending(true);
    setResults([]);
    const newResults: typeof results = [];
    let instanceIdx = 0;

    for (const num of numberList) {
      const instanceId = selectedInstances[instanceIdx % selectedInstances.length];
      try {
        let payload: any = { number: num };

        if (mode === 'text') {
          payload.message = message;
          if (mediaUrl.trim()) payload.media = { url: mediaUrl.trim() };
        } else if (mode === 'media') {
          payload.message = message;
          payload.media = { url: mediaUrl.trim() };
        } else if (mode === 'interactive') {
          payload.interactive = {
            headerType,
            headerText: headerType === 'text' ? headerText : undefined,
            headerImageUrl: headerType === 'image' ? headerImageUrl : undefined,
            body,
            footer,
            buttons: buttons.filter(b => b.label.trim()),
          };
        }

        const formData = new FormData();
        formData.append('payload', JSON.stringify(payload));
        if (mode === 'text' && mediaFile) {
            formData.append('file', mediaFile);
        } else if (mode === 'interactive' && headerImageFile) {
            formData.append('file', headerImageFile);
        }

        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/instances/${instanceId}/send`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
          body: formData
        });
        const data = await res.json();

        if (res.ok) {
          newResults.push({ number: num, status: 'success', fallback: data.usedFallback });
        } else {
          newResults.push({ number: num, status: 'failed', error: data.error || 'Failed' });
        }
      } catch {
        newResults.push({ number: num, status: 'failed', error: 'Network error' });
      }
      setResults([...newResults]);
      instanceIdx++;
      await new Promise(r => setTimeout(r, 1000));
    }
    setIsSending(false);
  };

  const numberList = numbers.split('\n').map(n => n.trim()).filter(n => n);
  const successCount = results.filter(r => r.status === 'success').length;
  const failCount = results.filter(r => r.status === 'failed').length;
  const fallbackCount = results.filter(r => r.fallback).length;

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px', letterSpacing: '-0.02em' }}>Broadcast Hub</h2>
          <p style={{ color: '#64748B', fontSize: '14px', margin: 0, fontWeight: 500 }}>
            Send bulk messages and interactive CTA cards across your linked WhatsApp numbers.
          </p>
        </div>
      </div>

      {/* Mode Selector Tabs (Shopeers SaaS Style) */}
      <div className="mode-tabs-container" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {([
          { key: 'text', icon: SendIcon, label: 'Text / Media Campaign' },
          { key: 'interactive', icon: SparklesIcon, label: 'Interactive CTA Buttons' },
        ] as const).map(({ key, icon: IconComponent, label }) => {
          const isActive = mode === key;
          return (
            <button 
              key={key} 
              onClick={() => setMode(key)} 
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '10px',
                padding: '12px 24px', borderRadius: '12px',
                border: isActive ? 'none' : '1px solid #E2E8F0',
                background: isActive ? '#2563EB' : '#FFFFFF',
                color: isActive ? '#FFFFFF' : '#64748B',
                fontWeight: 800, fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s ease',
                boxShadow: isActive ? '0 4px 14px rgba(37, 99, 235, 0.3)' : '0 2px 6px rgba(0,0,0,0.02)',
              }}
            >
              <IconComponent size={18} color={isActive ? '#FFFFFF' : '#64748B'} />
              {label}
              {key === 'interactive' && (
                <span style={{ background: isActive ? '#FFFFFF' : '#EFF6FF', color: isActive ? '#2563EB' : '#2563EB', fontSize: '10px', padding: '2px 8px', borderRadius: '9999px', fontWeight: 800, letterSpacing: '0.04em' }}>
                  FEATURE
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="broadcast-grid">
        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Step 1: Select Instances */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <span style={{ background: '#EFF6FF', color: '#2563EB', width: '28px', height: '28px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '13px', flexShrink: 0 }}>
                1
              </span>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>Select Connected Numbers</h3>
            </div>

            {instances.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', background: '#F8FAFC', borderRadius: '14px', border: '1px dashed #E2E8F0' }}>
                <p style={{ fontSize: '14px', color: '#94A3B8', fontWeight: 600, margin: 0 }}>No active connected instances found.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {instances.map(inst => {
                  const sel = selectedInstances.includes(inst.id);
                  return (
                    <label key={inst.id} onClick={() => toggleInstance(inst.id)} style={{
                      display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px',
                      borderRadius: '14px', cursor: 'pointer',
                      border: sel ? '2px solid #2563EB' : '1px solid #E2E8F0',
                      background: sel ? '#EFF6FF' : '#F8FAFC', transition: 'all 0.2s ease',
                      boxShadow: sel ? '0 4px 12px rgba(37, 99, 235, 0.1)' : 'none'
                    }}>
                      <div style={{ width: '20px', height: '20px', borderRadius: '6px', border: `2px solid ${sel ? '#2563EB' : '#CBD5E1'}`, background: sel ? '#2563EB' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}>
                        {sel && <CheckIcon size={12} color="white" />}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                        <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <svg viewBox="0 0 24 24" width="18" height="18" style={{ fill: '#059669' }}>
                            <path d="M12.004 2C6.48 2 2 6.48 2 12.004c0 1.907.533 3.69 1.464 5.214L2 22l4.98-1.42A9.905 9.905 0 0 0 12.004 22C17.528 22 22 17.52 22 12.004 22 6.48 17.52 2 12.004 2zM12 20.363c-1.798 0-3.51-.482-4.992-1.393l-.358-.214-2.97.848.865-2.835-.243-.387a8.318 8.318 0 0 1-1.272-4.38c0-4.607 3.753-8.36 8.36-8.36 4.607 0 8.36 3.753 8.36 8.36.002 4.608-3.75 8.36-8.36 8.36zm4.58-6.25c-.25-.124-1.48-.73-1.71-.813-.23-.083-.4-.124-.567.125-.167.248-.646.812-.792.98-.146.165-.292.187-.542.062a6.837 6.837 0 0 1-2.012-1.24c-.787-.7-1.318-1.564-1.472-1.81-.154-.25-.017-.384.108-.508.113-.11.25-.29.375-.436.125-.145.166-.25.25-.415.083-.166.04-.312-.02-.437-.063-.125-.567-1.37-.777-1.875-.205-.5-.43-.43-.587-.438-.15-.008-.323-.008-.495-.008-.172 0-.453.064-.69.32a2.535 2.535 0 0 0-.792 1.886c0 1.112.81 2.185.922 2.338.113.153 1.59 2.43 3.85 3.407.537.23 1.025.39 1.378.502.54.17 1.03.146 1.417.088.433-.064 1.48-.604 1.687-1.188.208-.583.208-1.083.146-1.187-.063-.105-.23-.167-.48-.292z"/>
                          </svg>
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontWeight: 800, fontSize: '14px', color: '#0F172A', margin: 0, fontFamily: 'var(--font-mono)' }}>{inst.id}</p>
                          {inst.phoneNumber && <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0', fontWeight: 600 }}>+{inst.phoneNumber}</p>}
                        </div>
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#059669', background: '#D1FAE5', padding: '3px 10px', borderRadius: '9999px', marginLeft: 'auto', flexShrink: 0 }}>
                        Active
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Step 2: Target Numbers */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ background: '#EFF6FF', color: '#2563EB', width: '28px', height: '28px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '13px', flexShrink: 0 }}>
                  2
                </span>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>Target Numbers List</h3>
              </div>
              {numberList.length > 0 && (
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#2563EB', background: '#EFF6FF', padding: '4px 12px', borderRadius: '9999px' }}>
                  {numberList.length} recipient{numberList.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <textarea 
              rows={6} 
              placeholder={"911234567890\n919876543210\n447911123456"} 
              value={numbers} 
              onChange={e => setNumbers(e.target.value)} 
              style={{ ...taStyle, fontFamily: 'var(--font-mono)', fontSize: '13px' }} 
            />
          </div>

          {/* Step 3: Live Preview Mockup */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <EyeIcon size={18} color="#2563EB" />
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>Live Device Preview</h3>
            </div>
            <Preview mode={mode} message={message} mediaUrl={mediaUrl} headerType={headerType} headerText={headerText} headerImageUrl={headerImageUrl} body={body} footer={footer} buttons={buttons} />
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Step 4: Message Composer */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <span style={{ background: '#D1FAE5', color: '#059669', width: '28px', height: '28px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '13px', flexShrink: 0 }}>
                3
              </span>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                {mode === 'interactive' ? 'Interactive Message Composer' : 'Text / Media Message Composer'}
              </h3>
            </div>

            {mode === 'text' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>Campaign Message Body</label>
                  <textarea rows={5} placeholder="Write your WhatsApp broadcast message content here..." value={message} onChange={e => setMessage(e.target.value)} style={taStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Media Attachment URL <span style={{ color: '#94A3B8', fontWeight: 500, textTransform: 'none' }}>(Optional)</span></label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input type="text" placeholder="https://example.com/image.jpg" value={mediaUrl} onChange={e => { setMediaUrl(e.target.value); setMediaFile(null); }} style={{ ...inputStyle, flex: 1, opacity: mediaFile ? 0.5 : 1 }} disabled={!!mediaFile} />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: mediaFile ? '#EFF6FF' : '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '0 16px', cursor: 'pointer', position: 'relative', transition: 'all 0.2s', color: mediaFile ? '#2563EB' : '#475569' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, whiteSpace: 'nowrap', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{mediaFile ? mediaFile.name : 'Attach File'}</span>
                      <input type="file" onChange={e => { const f = e.target.files?.[0]; if (f) { setMediaFile(f); setMediaUrl(''); } }} style={{ position: 'absolute', opacity: 0, inset: 0, cursor: 'pointer' }} />
                      {mediaFile && (
                        <button onClick={(e) => { e.preventDefault(); setMediaFile(null); }} style={{ marginLeft: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', fontWeight: 'bold', fontSize: '16px', padding: '0 4px' }}>×</button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {mode === 'interactive' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {/* Notice */}
                <div style={{ background: '#FFFBEB', border: '1px solid #FEF3C7', borderRadius: '12px', padding: '12px 16px', display: 'flex', gap: '10px' }}>
                  <WarningIcon size={18} color="#D97706" style={{ flexShrink: 0, marginTop: '1px' }} />
                  <p style={{ fontSize: '12px', color: '#B45309', fontWeight: 600, margin: 0, lineHeight: 1.5 }}>
                    If recipient WhatsApp version does not support interactive buttons, a clean formatted text fallback will be transmitted automatically.
                  </p>
                </div>

                {/* Header Selector */}
                <div>
                  <label style={labelStyle}>Header Format</label>
                  <select value={headerType} onChange={e => setHeaderType(e.target.value as any)} style={selectStyle}>
                    <option value="none">No Header</option>
                    <option value="text">Text Header</option>
                    <option value="image">Image Banner Header</option>
                  </select>
                </div>

                {headerType === 'text' && (
                  <div>
                    <label style={labelStyle}>Header Text</label>
                    <input type="text" placeholder="Welcome to our store!" value={headerText} onChange={e => setHeaderText(e.target.value)} style={inputStyle} />
                  </div>
                )}
                {headerType === 'image' && (
                  <div>
                    <label style={labelStyle}>Header Banner Image URL</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input type="text" placeholder="https://example.com/banner.jpg" value={headerImageUrl} onChange={e => { setHeaderImageUrl(e.target.value); setHeaderImageFile(null); }} style={{ ...inputStyle, flex: 1, opacity: headerImageFile ? 0.5 : 1 }} disabled={!!headerImageFile} />
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: headerImageFile ? '#EFF6FF' : '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '0 16px', cursor: 'pointer', position: 'relative', transition: 'all 0.2s', color: headerImageFile ? '#2563EB' : '#475569' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, whiteSpace: 'nowrap', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{headerImageFile ? headerImageFile.name : 'Upload Header'}</span>
                        <input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) { setHeaderImageFile(f); setHeaderImageUrl(''); } }} style={{ position: 'absolute', opacity: 0, inset: 0, cursor: 'pointer' }} />
                        {headerImageFile && (
                          <button onClick={(e) => { e.preventDefault(); setHeaderImageFile(null); }} style={{ marginLeft: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', fontWeight: 'bold', fontSize: '16px', padding: '0 4px' }}>×</button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Body */}
                <div>
                  <label style={labelStyle}>Message Body Content (Required)</label>
                  <textarea rows={4} placeholder="Hello! Choose an action below..." value={body} onChange={e => setBody(e.target.value)} style={taStyle} />
                </div>

                {/* Footer */}
                <div>
                  <label style={labelStyle}>Message Footer <span style={{ color: '#94A3B8', fontWeight: 500, textTransform: 'none' }}>(Optional)</span></label>
                  <input type="text" placeholder="Powered by API Gateway" value={footer} onChange={e => setFooter(e.target.value)} style={inputStyle} />
                </div>

                {/* Buttons List */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <label style={{ ...labelStyle, margin: 0 }}>CTA Action Buttons ({buttons.length}/3)</label>
                    {buttons.length < 3 && (
                      <button onClick={addButton} style={{ background: '#EFF6FF', border: 'none', borderRadius: '8px', padding: '6px 14px', color: '#2563EB', fontSize: '12px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <PlusIcon size={14} color="#2563EB" /> Add Button
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {buttons.map((btn, i) => (
                      <div key={i} style={{ background: '#F8FAFC', borderRadius: '14px', padding: '16px', border: '1px solid #E2E8F0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 800, color: BTN_COLORS[btn.type], background: '#FFFFFF', border: `1px solid ${BTN_COLORS[btn.type]}`, padding: '3px 10px', borderRadius: '6px' }}>
                            {BTN_LABELS[btn.type]}
                          </span>
                          {buttons.length > 1 && (
                            <button onClick={() => removeButton(i)} style={{ background: '#FEF2F2', border: 'none', color: '#EF4444', cursor: 'pointer', borderRadius: '6px', padding: '4px 8px', fontSize: '12px', fontWeight: 700 }}>Remove</button>
                          )}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <div>
                            <label style={labelStyle}>Button Type</label>
                            <select value={btn.type} onChange={e => updateButton(i, { type: e.target.value as BtnType })} style={{ ...selectStyle, padding: '8px 12px' }}>
                              <option value="quick_reply">Quick Reply</option>
                              <option value="cta_url">URL Button</option>
                              <option value="cta_call">Call Button</option>
                            </select>
                          </div>
                          <div>
                            <label style={labelStyle}>Button Label</label>
                            <input type="text" placeholder="e.g. Learn More" value={btn.label} onChange={e => updateButton(i, { label: e.target.value })} style={{ ...inputStyle, padding: '8px 12px' }} />
                          </div>
                          {btn.type === 'cta_url' && (
                            <div style={{ gridColumn: '1/-1' }}>
                              <label style={labelStyle}>Target URL</label>
                              <input type="url" placeholder="https://example.com" value={btn.url || ''} onChange={e => updateButton(i, { url: e.target.value })} style={{ ...inputStyle, padding: '8px 12px' }} />
                            </div>
                          )}
                          {btn.type === 'cta_call' && (
                            <div style={{ gridColumn: '1/-1' }}>
                              <label style={labelStyle}>Phone Number</label>
                              <input type="text" placeholder="919876543210" value={btn.phone || ''} onChange={e => updateButton(i, { phone: e.target.value })} style={{ ...inputStyle, padding: '8px 12px' }} />
                            </div>
                          )}
                          {btn.type === 'quick_reply' && (
                            <div style={{ gridColumn: '1/-1' }}>
                              <label style={labelStyle}>Reply Payload ID (Optional)</label>
                              <input type="text" placeholder="btn_1" value={btn.id || ''} onChange={e => updateButton(i, { id: e.target.value })} style={{ ...inputStyle, padding: '8px 12px' }} />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Step 5: Summary + Send */}
          <div className="card">
            <div className="summary-strip-card">
              {[
                { label: 'SELECTED INSTANCES', val: selectedInstances.length, color: '#2563EB' },
                { label: 'TOTAL RECIPIENTS', val: numberList.length, color: '#059669' },
                { label: 'CAMPAIGN TYPE', val: mode === 'interactive' ? 'Interactive' : mode === 'media' ? 'Media' : 'Text', color: '#D97706' },
              ].map(({ label, val, color }) => (
                <div key={label}>
                  <p style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', margin: 0, letterSpacing: '0.05em' }}>{label}</p>
                  <p style={{ fontSize: '20px', fontWeight: 900, color, margin: '2px 0 0', letterSpacing: '-0.02em' }}>{val}</p>
                </div>
              ))}
            </div>

            <button 
              onClick={handleSend}
              disabled={isSending || selectedInstances.length === 0 || !numberList.length || (mode === 'text' && !message) || (mode === 'interactive' && !body)}
              className="btn-primary"
              style={{
                width: '100%', padding: '16px', fontSize: '15px', fontWeight: 800, borderRadius: '12px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', height: 'auto',
                ...( (isSending || selectedInstances.length === 0 || !numberList.length) ? { background: '#CBD5E1', color: '#94A3B8', cursor: 'not-allowed', boxShadow: 'none' } : {} )
              }}
            >
              {isSending ? (
                <><div style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div> Transmitting {results.length}/{numberList.length}…</>
              ) : (
                <><SendIcon size={18} /> Dispatch Broadcast Campaign</>
              )}
            </button>
          </div>
          {/* Delivery Results Log */}
          {results.length > 0 && (
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ fontWeight: 800, fontSize: '15px', color: '#0F172A', margin: 0 }}>Campaign Delivery Report</h3>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {successCount > 0 && <span style={{ fontSize: '12px', fontWeight: 800, color: '#059669', background: '#D1FAE5', padding: '4px 10px', borderRadius: '9999px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><CheckCircleIcon size={14} /> {successCount} Sent</span>}
                  {fallbackCount > 0 && <span style={{ fontSize: '12px', fontWeight: 800, color: '#D97706', background: '#FEF3C7', padding: '4px 10px', borderRadius: '9999px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><SwapIcon size={14} /> {fallbackCount} Fallback</span>}
                  {failCount > 0 && <span style={{ fontSize: '12px', fontWeight: 800, color: '#DC2626', background: '#FEE2E2', padding: '4px 10px', borderRadius: '9999px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><XCircleIcon size={14} /> {failCount} Failed</span>}
                </div>
              </div>

              {isSending && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ height: '6px', background: '#F1F5F9', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: 'linear-gradient(90deg, #2563EB, #7C3AED)', borderRadius: '9999px', width: `${(results.length / numberList.length) * 100}%`, transition: 'width 0.5s' }} />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }} className="custom-scrollbar">
                {results.map((r, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: '10px', background: r.status === 'success' ? '#F0FDF4' : '#FEF2F2', border: `1px solid ${r.status === 'success' ? '#BBF7D0' : '#FEE2E2'}` }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>{r.number}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {r.fallback && <span style={{ fontSize: '11px', background: '#FEF3C7', color: '#D97706', padding: '2px 8px', borderRadius: '9999px', fontWeight: 800 }}>FALLBACK</span>}
                      <span style={{ fontSize: '12px', fontWeight: 800, color: r.status === 'success' ? '#16A34A' : '#DC2626' }}>
                        {r.status === 'success' ? 'Delivered' : r.error}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
