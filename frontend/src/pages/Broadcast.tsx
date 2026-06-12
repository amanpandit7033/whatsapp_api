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
  XCircleIcon 
} from '../components/Icons';

// ─── Types ───────────────────────────────────
type MsgMode = 'text' | 'media' | 'interactive';
type BtnType = 'quick_reply' | 'cta_url' | 'cta_call';
interface IButton { type: BtnType; label: string; url?: string; phone?: string; id?: string; }

const cardStyle: React.CSSProperties = {
  background: 'white', borderRadius: '20px', padding: '24px',
  border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748B', marginBottom: '7px',
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px', background: '#F8FAFC',
  border: '1px solid #E2E8F0', borderRadius: '11px', fontSize: '14px',
  fontWeight: 500, color: '#0F172A', fontFamily: 'inherit',
  outline: 'none', boxSizing: 'border-box' as const, transition: 'border-color 0.2s',
};
const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' };
const taStyle: React.CSSProperties = { ...inputStyle, resize: 'vertical' as const, lineHeight: 1.6 };

// ─── Button-type label map ───────────────────
const BTN_LABELS: Record<BtnType, string> = {
  quick_reply: '💬 Quick Reply',
  cta_url: '🔗 URL Button',
  cta_call: '📞 Call Button',
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
    <p style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', marginBottom: '8px', textAlign: 'center' }}>📱 Live Preview</p>
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
                {btn.type === 'cta_url' ? '🔗' : btn.type === 'cta_call' ? '📞' : '💬'} {btn.label || 'Button'}
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

  // Interactive fields
  const [headerType, setHeaderType] = useState<'none' | 'text' | 'image'>('none');
  const [headerText, setHeaderText] = useState('');
  const [headerImageUrl, setHeaderImageUrl] = useState('');
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

        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/instances/${instanceId}/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
          body: JSON.stringify(payload)
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
    <div className="animate-in">
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Broadcast Message</h1>
        <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px', fontWeight: 500 }}>
          Send bulk messages across multiple connected instances.
        </p>
      </div>

      {/* Mode Selector */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
        {([
          { key: 'text', icon: SendIcon, label: 'Text / Media' },
          { key: 'interactive', icon: SparklesIcon, label: 'Interactive Buttons' },
        ] as const).map(({ key, icon: IconComponent, label }) => (
          <button key={key} onClick={() => setMode(key)} style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '10px 20px', borderRadius: '12px', border: '2px solid',
            borderColor: mode === key ? '#4f46e5' : '#e2e8f0',
            background: mode === key ? '#ede9fe' : 'white',
            color: mode === key ? '#4f46e5' : '#64748b',
            fontWeight: 700, fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s',
          }}>
            <IconComponent size={18} />
            {label}
            {key === 'interactive' && (
              <span style={{ background: '#4f46e5', color: 'white', fontSize: '10px', padding: '2px 6px', borderRadius: '9999px', fontWeight: 800 }}>NEW</span>
            )}
          </button>
        ))}
      </div>

      <div className="broadcast-grid">
        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

          {/* Instances */}
          <div style={cardStyle}>
            <p style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ background: '#ede9fe', color: '#7c3aed', width: '24px', height: '24px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '13px', flexShrink: 0 }}>1</span>
              Select Instances
            </p>
            {instances.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #e2e8f0' }}>
                <p style={{ fontSize: '14px', color: '#94a3b8', fontWeight: 600, margin: 0 }}>No connected instances</p>
              </div>
            ) : instances.map(inst => {
              const sel = selectedInstances.includes(inst.id);
              return (
                <label key={inst.id} onClick={() => toggleInstance(inst.id)} style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px',
                  borderRadius: '12px', cursor: 'pointer', marginBottom: '8px',
                  border: `2px solid ${sel ? '#4f46e5' : '#f1f5f9'}`,
                  background: sel ? '#ede9fe' : '#f8fafc', transition: 'all 0.2s',
                }}>
                  <div style={{ width: '18px', height: '18px', borderRadius: '5px', border: `2px solid ${sel ? '#4f46e5' : '#cbd5e1'}`, background: sel ? '#4f46e5' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}>
                    {sel && <CheckIcon size={10} color="white" />}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg,#d1fae5,#a7f3d0)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg viewBox="0 0 24 24" width="16" height="16" style={{ fill: '#059669' }}>
                        <path d="M12.004 2C6.48 2 2 6.48 2 12.004c0 1.907.533 3.69 1.464 5.214L2 22l4.98-1.42A9.905 9.905 0 0 0 12.004 22C17.528 22 22 17.52 22 12.004 22 6.48 17.52 2 12.004 2zM12 20.363c-1.798 0-3.51-.482-4.992-1.393l-.358-.214-2.97.848.865-2.835-.243-.387a8.318 8.318 0 0 1-1.272-4.38c0-4.607 3.753-8.36 8.36-8.36 4.607 0 8.36 3.753 8.36 8.36.002 4.608-3.75 8.36-8.36 8.36zm4.58-6.25c-.25-.124-1.48-.73-1.71-.813-.23-.083-.4-.124-.567.125-.167.248-.646.812-.792.98-.146.165-.292.187-.542.062a6.837 6.837 0 0 1-2.012-1.24c-.787-.7-1.318-1.564-1.472-1.81-.154-.25-.017-.384.108-.508.113-.11.25-.29.375-.436.125-.145.166-.25.25-.415.083-.166.04-.312-.02-.437-.063-.125-.567-1.37-.777-1.875-.205-.5-.43-.43-.587-.438-.15-.008-.323-.008-.495-.008-.172 0-.453.064-.69.32a2.535 2.535 0 0 0-.792 1.886c0 1.112.81 2.185.922 2.338.113.153 1.59 2.43 3.85 3.407.537.23 1.025.39 1.378.502.54.17 1.03.146 1.417.088.433-.064 1.48-.604 1.687-1.188.208-.583.208-1.083.146-1.187-.063-.105-.23-.167-.48-.292z"/>
                      </svg>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inst.id}</p>
                      {inst.phoneNumber && <p style={{ fontSize: '12px', color: '#64748b', margin: '1px 0 0', fontWeight: 600 }}>+{inst.phoneNumber}</p>}
                    </div>
                  </div>
                  <span className="badge success" style={{ marginLeft: 'auto', flexShrink: 0 }}>Live</span>
                </label>
              );
            })}
          </div>

          {/* Target Numbers */}
          <div style={cardStyle}>
            <p style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ background: '#ede9fe', color: '#7c3aed', width: '24px', height: '24px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '13px', flexShrink: 0 }}>2</span>
              Target Numbers
            </p>
            <textarea rows={6} placeholder={"911234567890\n919876543210\n447911123456"} value={numbers} onChange={e => setNumbers(e.target.value)} style={taStyle} />
            {numberList.length > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', marginTop: '8px', background: '#ede9fe', color: '#7c3aed', padding: '4px 12px', borderRadius: '9999px', fontSize: '12px', fontWeight: 700 }}>
                {numberList.length} recipient{numberList.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Live Preview */}
          <div style={cardStyle}>
            <p style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a', margin: '0 0 14px' }}>👁 Live Preview</p>
            <Preview mode={mode} message={message} mediaUrl={mediaUrl} headerType={headerType} headerText={headerText} headerImageUrl={headerImageUrl} body={body} footer={footer} buttons={buttons} />
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

          {/* Message Compose */}
          <div style={cardStyle}>
            <p style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a', margin: '0 0 18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ background: '#d1fae5', color: '#059669', width: '24px', height: '24px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '13px', flexShrink: 0 }}>3</span>
              {mode === 'interactive' ? 'Interactive Message Builder' : 'Compose Message'}
            </p>

            {mode === 'text' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={labelStyle}>Message Text</label>
                  <textarea rows={5} placeholder="Hello! This is a broadcast message. 👋" value={message} onChange={e => setMessage(e.target.value)} style={taStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Media URL <span style={{ color: '#94a3b8', fontWeight: 500 }}>(optional)</span></label>
                  <input type="text" placeholder="https://example.com/image.jpg" value={mediaUrl} onChange={e => setMediaUrl(e.target.value)} style={inputStyle} />
                </div>
              </div>
            )}

            {mode === 'interactive' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Interactive mode notice */}
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '10px 14px', display: 'flex', gap: '10px' }}>
                  <WarningIcon size={18} color="#d97706" style={{ flexShrink: 0, marginTop: '1px' }} />
                  <p style={{ fontSize: '12px', color: '#92400e', fontWeight: 600, margin: 0, lineHeight: 1.5 }}>
                    If interactive messages are not supported by the recipient's WhatsApp version, a formatted plain-text fallback will be sent automatically.
                  </p>
                </div>

                {/* Header */}
                <div>
                  <label style={labelStyle}>Header Type</label>
                  <select value={headerType} onChange={e => setHeaderType(e.target.value as any)} style={selectStyle}>
                    <option value="none">No Header</option>
                    <option value="text">Text Header</option>
                    <option value="image">Image Header</option>
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
                    <label style={labelStyle}>Header Image URL</label>
                    <input type="text" placeholder="https://example.com/banner.jpg" value={headerImageUrl} onChange={e => setHeaderImageUrl(e.target.value)} style={inputStyle} />
                  </div>
                )}

                {/* Body */}
                <div>
                  <label style={labelStyle}>Body (required)</label>
                  <textarea rows={4} placeholder="Hello! Please choose an option below 👇" value={body} onChange={e => setBody(e.target.value)} style={taStyle} />
                </div>

                {/* Footer */}
                <div>
                  <label style={labelStyle}>Footer <span style={{ color: '#94a3b8', fontWeight: 500 }}>(optional)</span></label>
                  <input type="text" placeholder="Powered by our service" value={footer} onChange={e => setFooter(e.target.value)} style={inputStyle} />
                </div>

                {/* Buttons */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <label style={{ ...labelStyle, margin: 0 }}>Buttons ({buttons.length}/3)</label>
                    {buttons.length < 3 && (
                      <button onClick={addButton} style={{ background: '#ede9fe', border: 'none', borderRadius: '8px', padding: '5px 12px', color: '#7c3aed', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <PlusIcon size={12} /> Add Button
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {buttons.map((btn, i) => (
                      <div key={i} style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px', border: `2px solid ${BTN_COLORS[btn.type]}22` }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 800, color: BTN_COLORS[btn.type], background: `${BTN_COLORS[btn.type]}15`, padding: '3px 10px', borderRadius: '9999px' }}>
                            {BTN_LABELS[btn.type]}
                          </span>
                          {buttons.length > 1 && (
                            <button onClick={() => removeButton(i)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '16px', padding: '2px' }}>✕</button>
                          )}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          <div>
                            <label style={labelStyle}>Type</label>
                            <select value={btn.type} onChange={e => updateButton(i, { type: e.target.value as BtnType })} style={{ ...selectStyle, padding: '8px 10px' }}>
                              <option value="quick_reply">💬 Quick Reply</option>
                              <option value="cta_url">🔗 URL Button</option>
                              <option value="cta_call">📞 Call Button</option>
                            </select>
                          </div>
                          <div>
                            <label style={labelStyle}>Button Label</label>
                            <input type="text" placeholder="e.g. Learn More" value={btn.label} onChange={e => updateButton(i, { label: e.target.value })} style={{ ...inputStyle, padding: '8px 10px' }} />
                          </div>
                          {btn.type === 'cta_url' && (
                            <div style={{ gridColumn: '1/-1' }}>
                              <label style={labelStyle}>URL</label>
                              <input type="url" placeholder="https://example.com" value={btn.url || ''} onChange={e => updateButton(i, { url: e.target.value })} style={{ ...inputStyle, padding: '8px 10px' }} />
                            </div>
                          )}
                          {btn.type === 'cta_call' && (
                            <div style={{ gridColumn: '1/-1' }}>
                              <label style={labelStyle}>Phone Number</label>
                              <input type="text" placeholder="919876543210" value={btn.phone || ''} onChange={e => updateButton(i, { phone: e.target.value })} style={{ ...inputStyle, padding: '8px 10px' }} />
                            </div>
                          )}
                          {btn.type === 'quick_reply' && (
                            <div style={{ gridColumn: '1/-1' }}>
                              <label style={labelStyle}>Reply ID (optional)</label>
                              <input type="text" placeholder="btn_1" value={btn.id || ''} onChange={e => updateButton(i, { id: e.target.value })} style={{ ...inputStyle, padding: '8px 10px' }} />
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

          {/* Summary + Send */}
          <div style={cardStyle}>
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px 18px', border: '1px solid #f1f5f9', display: 'flex', gap: '24px', marginBottom: '18px' }}>
              {[
                { label: 'Instances', val: selectedInstances.length, color: '#4f46e5' },
                { label: 'Recipients', val: numberList.length, color: '#10b981' },
                { label: 'Type', val: mode === 'interactive' ? 'Interactive' : mode === 'media' ? 'Media' : 'Text', color: '#f59e0b' },
              ].map(({ label, val, color }) => (
                <div key={label}>
                  <p style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
                  <p style={{ fontSize: '18px', fontWeight: 800, color, margin: '2px 0 0' }}>{val}</p>
                </div>
              ))}
            </div>

            <button onClick={handleSend}
              disabled={isSending || selectedInstances.length === 0 || !numberList.length || (mode === 'text' && !message) || (mode === 'interactive' && !body)}
              className="btn-primary"
              style={{
                width: '100%', padding: '15px', fontSize: '15px', fontWeight: 700, borderRadius: '12px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', height: 'auto',
                ...( (isSending || selectedInstances.length === 0 || !numberList.length) ? { background: '#e2e8f0', color: '#94a3b8', cursor: 'not-allowed' } : {} )
              }}>
              {isSending ? (
                <><div style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div> Sending {results.length}/{numberList.length}…</>
              ) : (
                <><SendIcon size={18} /> Start Broadcast</>
              )}
            </button>
          </div>

          {/* Results */}
          {results.length > 0 && (
            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <h3 style={{ fontWeight: 800, fontSize: '15px', color: '#0f172a', margin: 0 }}>Delivery Report</h3>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {successCount > 0 && <span className="badge success"><CheckCircleIcon size={14} /> {successCount} sent</span>}
                  {fallbackCount > 0 && <span className="badge warning"><SwapIcon size={14} /> {fallbackCount} fallback</span>}
                  {failCount > 0 && <span className="badge danger"><XCircleIcon size={14} /> {failCount} failed</span>}
                </div>
              </div>

              {isSending && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: 'linear-gradient(90deg, #4f46e5, #7c3aed)', borderRadius: '9999px', width: `${(results.length / numberList.length) * 100}%`, transition: 'width 0.5s' }} />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '260px', overflowY: 'auto' }} className="custom-scrollbar">
                {results.map((r, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '10px', background: r.status === 'success' ? '#f0fdf4' : '#fef2f2', border: `1px solid ${r.status === 'success' ? '#bbf7d0' : '#fee2e2'}` }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{r.number}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {r.fallback && <span style={{ fontSize: '11px', background: '#fef3c7', color: '#d97706', padding: '2px 8px', borderRadius: '9999px', fontWeight: 700 }}>text fallback</span>}
                      <span style={{ fontSize: '12px', fontWeight: 700, color: r.status === 'success' ? '#16a34a' : '#dc2626' }}>
                        {r.status === 'success' ? '✓ Delivered' : r.error}
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
