import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  CheckIcon, 
} from '../components/Icons';
import {
  GlassSendIcon,
  GlassSparklesIcon,
  GlassInstanceIcon,
  GlassEyeIcon,
  GlassPaperclipIcon,
  GlassLinkIcon,
  GlassPhoneIcon,
  GlassChatIcon,
  GlassPlusIcon,
  GlassAlertIcon,
  GlassCheckCircleIcon,
  GlassRefreshIcon,
  GlassCancelIcon,
  GlassGroupIcon,
  GlassEditIcon,
  GlassTagIcon,
  GlassSearchIcon,
  GlassUsersIcon,
  GlassSmileyIcon,
  GlassCameraIcon,
  GlassMicIcon,
  GlassVideoCallIcon,
  GlassAudioCallIcon,
  GlassFolderIcon,
  GlassBackIcon,
  GlassTextHeaderIcon,
  GlassImageBannerIcon,
  GlassBoltIcon
} from '../components/GlassIcons';

// ─── Types ───────────────────────────────────
type MsgMode = 'text' | 'media' | 'interactive';
type BtnType = 'quick_reply' | 'cta_url' | 'cta_call';
interface IButton { type: BtnType; label: string; url?: string; phone?: string; id?: string; }

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

// ─── WhatsApp Rich Markdown Parser (*bold*, _italic_, ~strike~, ```code```) ───
const renderFormattedWhatsAppText = (raw: string) => {
  if (!raw) return null;

  // Resolve spintax e.g. {Hi|Hello|Hey} -> Hi
  const resolved = raw.replace(/\{([^{}]+)\}/g, (_, choices) => {
    const parts = choices.split('|');
    return parts[0] || '';
  });

  const lines = resolved.split('\n');

  return lines.map((line, lineIdx) => {
    const regex = /(```[\s\S]*?```|\*[^\*\n]+\*|_[^_\n]+_|~[^~\n]+~|https?:\/\/[^\s]+)/g;
    const tokens: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let key = 0;

    while ((match = regex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        tokens.push(<span key={`txt-${lineIdx}-${key++}`}>{line.substring(lastIndex, match.index)}</span>);
      }

      const m = match[0];
      if (m.startsWith('```') && m.endsWith('```')) {
        tokens.push(
          <code key={`code-${lineIdx}-${key++}`} style={{ background: '#E2E8F0', padding: '1px 5px', borderRadius: '4px', fontFamily: 'var(--font-mono, monospace)', fontSize: '11.5px', color: '#B91C1C' }}>
            {m.slice(3, -3)}
          </code>
        );
      } else if (m.startsWith('*') && m.endsWith('*') && m.length > 2) {
        tokens.push(
          <strong key={`b-${lineIdx}-${key++}`} style={{ fontWeight: 800, color: '#0F172A' }}>
            {m.slice(1, -1)}
          </strong>
        );
      } else if (m.startsWith('_') && m.endsWith('_') && m.length > 2) {
        tokens.push(
          <em key={`i-${lineIdx}-${key++}`} style={{ fontStyle: 'italic' }}>
            {m.slice(1, -1)}
          </em>
        );
      } else if (m.startsWith('~') && m.endsWith('~') && m.length > 2) {
        tokens.push(
          <del key={`del-${lineIdx}-${key++}`} style={{ textDecoration: 'line-through', opacity: 0.75 }}>
            {m.slice(1, -1)}
          </del>
        );
      } else if (m.startsWith('http://') || m.startsWith('https://')) {
        tokens.push(
          <span key={`link-${lineIdx}-${key++}`} style={{ color: '#0284C7', textDecoration: 'underline', wordBreak: 'break-all' }}>
            {m}
          </span>
        );
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < line.length) {
      tokens.push(<span key={`tail-${lineIdx}-${key++}`}>{line.substring(lastIndex)}</span>);
    }

    return (
      <React.Fragment key={lineIdx}>
        {tokens.length > 0 ? tokens : <span>&nbsp;</span>}
        {lineIdx < lines.length - 1 && <br />}
      </React.Fragment>
    );
  });
};

// ─── Premium iPhone Vector Smartphone Simulator ───
const PhoneSimulator = ({ mode, message, mediaUrl, headerType, headerText, headerImageUrl, body, footer, buttons }:
  { mode: MsgMode; message: string; mediaUrl: string; headerType: string; headerText: string; headerImageUrl: string; body: string; footer: string; buttons: IButton[] }) => {
  const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const rawContent = mode === 'text' ? message : mode === 'interactive' ? body : message;

  return (
    <div style={{ position: 'sticky', top: '20px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      
      {/* Precision iPhone 16 Pro Chassis Enclosure */}
      <div style={{
        position: 'relative',
        width: '324px',
        height: '640px',
        background: 'linear-gradient(145deg, #2D3748 0%, #1A202C 40%, #0F172A 100%)',
        borderRadius: '46px',
        padding: '10px',
        boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.15), inset 0 0 0 2px rgba(0, 0, 0, 0.6)',
        boxSizing: 'border-box'
      }}>
        {/* Hardware Button Accents */}
        <div style={{ position: 'absolute', left: '-3px', top: '100px', width: '3px', height: '24px', background: '#334155', borderRadius: '2px 0 0 2px' }} />
        <div style={{ position: 'absolute', left: '-3px', top: '136px', width: '3px', height: '42px', background: '#334155', borderRadius: '2px 0 0 2px' }} />
        <div style={{ position: 'absolute', left: '-3px', top: '186px', width: '3px', height: '42px', background: '#334155', borderRadius: '2px 0 0 2px' }} />
        <div style={{ position: 'absolute', right: '-3px', top: '140px', width: '3px', height: '60px', background: '#334155', borderRadius: '0 2px 2px 0' }} />

        {/* OLED Display Container */}
        <div style={{
          width: '100%',
          height: '100%',
          background: '#ECE5DD',
          borderRadius: '36px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          boxShadow: 'inset 0 0 4px rgba(0,0,0,0.2)'
        }}>

          {/* Dynamic Island Header */}
          <div style={{
            background: '#075E54',
            padding: '10px 14px 10px',
            color: '#FFFFFF',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            {/* Top iOS Status Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', fontWeight: 700, padding: '0 4px' }}>
              <span>{currentTime}</span>
              {/* Dynamic Island Pill */}
              <div style={{ width: '80px', height: '18px', background: '#000000', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '6px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#059669' }} />
              </div>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center', fontSize: '10px' }}>
                <span>5G</span>
                <span>100%</span>
              </div>
            </div>

            {/* WhatsApp Emerald Chat Navbar with Glass SVGs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
              <span style={{ fontSize: '14px', cursor: 'pointer', fontWeight: 800 }}>‹</span>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #128C7E 0%, #25D366 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontSize: '12px', fontWeight: 800, boxShadow: '0 2px 4px rgba(0,0,0,0.15)' }}>
                WA
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '12.5px', fontWeight: 800, whiteHeight: 1.2, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  +91XXXXXXXXXX
                </div>
                <div style={{ fontSize: '10px', opacity: 0.85, fontWeight: 500 }}>online</div>
              </div>
              <div style={{ display: 'flex', gap: '12px', opacity: 0.95, alignItems: 'center' }}>
                <GlassVideoCallIcon size={18} style={{ cursor: 'pointer' }} />
                <GlassAudioCallIcon size={18} style={{ cursor: 'pointer' }} />
              </div>
            </div>
          </div>

          {/* WhatsApp Chat Wallpaper Area */}
          <div style={{
            flex: 1,
            padding: '12px 10px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            gap: '8px',
            background: `radial-gradient(circle at 50% 50%, rgba(220, 215, 201, 0.5) 0%, rgba(236, 229, 221, 0.9) 100%)`
          }}>
            
            {/* Timestamp Pill */}
            <div style={{ alignSelf: 'center', background: 'rgba(255, 255, 255, 0.75)', backdropFilter: 'blur(4px)', padding: '2px 8px', borderRadius: '6px', fontSize: '9px', fontWeight: 700, color: '#54656F', boxShadow: '0 1px 1px rgba(0,0,0,0.06)' }}>
              TODAY
            </div>

            {/* Outgoing Message Bubble (WhatsApp Official Green Tone #E7FFDB) */}
            <div style={{
              alignSelf: 'flex-end',
              maxWidth: '88%',
              background: '#E7FFDB',
              borderRadius: '10px 0px 10px 10px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.12)',
              overflow: 'hidden',
              fontSize: '12px',
              color: '#111B21',
              position: 'relative'
            }}>
              
              {/* Media Preview Banner */}
              {((mode === 'media' && mediaUrl) || (mode === 'interactive' && headerType === 'image' && headerImageUrl)) && (
                <div style={{ width: '100%', maxHeight: '130px', overflow: 'hidden', background: '#D9FDD3', position: 'relative' }}>
                  <img
                    src={mode === 'media' ? mediaUrl : headerImageUrl}
                    alt="Media Attachment"
                    onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                </div>
              )}

              {/* Bubble Body Content */}
              <div style={{ padding: '7px 9px 4px' }}>
                
                {/* Interactive Text Header */}
                {mode === 'interactive' && headerType === 'text' && headerText && (
                  <div style={{ fontWeight: 800, fontSize: '12.5px', color: '#111B21', marginBottom: '4px' }}>
                    {headerText}
                  </div>
                )}

                {/* Main Text Content */}
                <div style={{ wordBreak: 'break-word', lineHeight: 1.4, fontSize: '12px' }}>
                  {rawContent ? renderFormattedWhatsAppText(rawContent) : (
                    <span style={{ color: '#8696A0', fontStyle: 'italic' }}>Type your message content to preview...</span>
                  )}
                </div>

                {/* Footer Text */}
                {mode === 'interactive' && footer && (
                  <p style={{ margin: '4px 0 0', fontSize: '10px', color: '#6B7280', fontStyle: 'italic' }}>
                    {footer}
                  </p>
                )}

                {/* Timestamp & Double Blue Checkmarks */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '3px', marginTop: '2px' }}>
                  <span style={{ fontSize: '9.5px', color: '#667781', fontWeight: 500 }}>{currentTime}</span>
                  <span style={{ fontSize: '10px', color: '#53BDEB', fontWeight: 900, lineHeight: 1 }}>✓✓</span>
                </div>
              </div>

              {/* Interactive CTA Buttons */}
              {mode === 'interactive' && buttons.filter(b => b.label.trim()).length > 0 && (
                <div style={{ borderTop: '1px solid #E9EDEF', background: '#FAFAFA' }}>
                  {buttons.filter(b => b.label.trim()).map((btn, idx) => (
                    <div key={idx} style={{
                      padding: '8px 10px',
                      borderBottom: idx < buttons.length - 1 ? '1px solid #E9EDEF' : 'none',
                      textAlign: 'center',
                      color: '#008069',
                      fontSize: '12px',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}>
                      {btn.type === 'cta_url' && <GlassLinkIcon size={14} />}
                      {btn.type === 'cta_call' && <GlassPhoneIcon size={14} />}
                      {btn.type === 'quick_reply' && <GlassChatIcon size={14} />}
                      <span>{btn.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* WhatsApp Bottom Chat Input Bar with Glass Icons */}
          <div style={{
            background: '#F0F2F5',
            padding: '6px 8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            borderTop: '1px solid #E4E6EB'
          }}>
            <GlassSmileyIcon size={24} style={{ cursor: 'pointer', flexShrink: 0 }} />
            <div style={{
              flex: 1,
              background: '#FFFFFF',
              borderRadius: '20px',
              padding: '6px 10px 6px 12px',
              fontSize: '11px',
              color: '#8696A0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
            }}>
              <span>Message</span>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <GlassPaperclipIcon size={16} style={{ cursor: 'pointer', opacity: 0.85 }} />
                <GlassCameraIcon size={16} style={{ cursor: 'pointer', opacity: 0.85 }} />
              </div>
            </div>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #00A884 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 2px 6px rgba(0, 168, 132, 0.35)',
              cursor: 'pointer'
            }}>
              <GlassMicIcon size={18} />
            </div>
          </div>

          {/* iOS Bottom Home Bar */}
          <div style={{ background: '#F0F2F5', paddingBottom: '6px', display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: '100px', height: '3.5px', background: '#0F172A', borderRadius: '4px', opacity: 0.4 }} />
          </div>

        </div>
      </div>
      
      {/* Label under mockup */}
      <p style={{ color: '#64748B', fontSize: '11.5px', fontWeight: 700, textAlign: 'center', margin: '8px 0 0', display: 'flex', alignItems: 'center', gap: '5px' }}>
        Live WhatsApp Preview
      </p>
    </div>
  );
};

// ─── Main Broadcast Campaign Builder Page ───────────────────────────
export const BroadcastCampaign = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageTextareaRef = useRef<HTMLTextAreaElement>(null);
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Smart WhatsApp Rich-Text Selection Formatting
  const applyTextFormatting = (target: 'text' | 'interactive', prefix: string, suffix: string = prefix, defaultPlaceholder: string = 'text') => {
    const textarea = target === 'text' ? messageTextareaRef.current : bodyTextareaRef.current;
    const currentVal = target === 'text' ? message : body;
    const setter = target === 'text' ? setMessage : setBody;

    if (!textarea) {
      setter(prev => `${prev}${prefix}${defaultPlaceholder}${suffix} `);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    if (start !== end) {
      const selected = currentVal.substring(start, end);
      const newText = currentVal.substring(0, start) + prefix + selected + suffix + currentVal.substring(end);
      setter(newText);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + prefix.length, end + prefix.length);
      }, 0);
    } else {
      const newText = currentVal.substring(0, start) + prefix + defaultPlaceholder + suffix + currentVal.substring(end);
      setter(newText);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + prefix.length, start + prefix.length + defaultPlaceholder.length);
      }, 0);
    }
  };

  const [instances, setInstances] = useState<any[]>([]);
  const [selectedInstances, setSelectedInstances] = useState<string[]>([]);
  const [selectedPoolName, setSelectedPoolName] = useState<string>('');
  const [campaignName, setCampaignName] = useState(() => `Campaign - ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
  const [numbers, setNumbers] = useState(() => (location.state as any)?.prefilledNumbers || '');
  const [isSending, setIsSending] = useState(false);
  const [results, setResults] = useState<{ number: string; status: string; error?: string; fallback?: boolean }[]>([]);
  const [lastSavedCampaignId, setLastSavedCampaignId] = useState<string | null>(null);

  // Mode
  const [mode, setMode] = useState<MsgMode>('text');

  // Text/Media Message
  const [message, setMessage] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [uploadedMediaName, setUploadedMediaName] = useState('');
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // Interactive CTA Message
  const [headerType, setHeaderType] = useState<'text' | 'image' | 'none'>('none');
  const [headerText, setHeaderText] = useState('');
  const [headerImageUrl, setHeaderImageUrl] = useState('');
  const [uploadedHeaderImageName, setUploadedHeaderImageName] = useState('');
  const [uploadingHeaderImage, setUploadingHeaderImage] = useState(false);
  const [body, setBody] = useState('');
  const [footer, setFooter] = useState('');
  const [buttons, setButtons] = useState<IButton[]>([
    { type: 'quick_reply', label: 'Interested', id: 'btn_1' },
    { type: 'cta_url', label: 'Visit Website', url: 'https://example.com', id: 'btn_2' }
  ]);

  // Anti-Ban Safeguard Settings
  const [minDelay, setMinDelay] = useState(3);
  const [maxDelay, setMaxDelay] = useState(8);
  const [batchSize, setBatchSize] = useState(50);
  const [batchDelay, setBatchDelay] = useState(30);
  const [dispatchStatusMsg, setDispatchStatusMsg] = useState('');

  // Multi-SIM Pools
  const [pools, setPools] = useState<any[]>([]);

  useEffect(() => { 
    fetchInstances(); 
    fetchPools();
  }, []);

  const fetchInstances = async () => {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/instances`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    if (res.status === 401) { navigate('/login'); return; }
    const data = await res.json();
    setInstances((data.instances || []).filter((i: any) => i.status === 'connected'));
  };

  const fetchPools = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/pools`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPools(data.pools || []);
      }
    } catch (e) {}
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;
      const parsed = content
        .split(/[\r\n,;]+/)
        .map(n => n.trim().replace(/[^0-9]/g, ''))
        .filter(n => n.length >= 7);
      
      const unique = Array.from(new Set(parsed));
      setNumbers(prev => {
        const existing = prev ? prev.split('\n').filter(Boolean) : [];
        const merged = Array.from(new Set([...existing, ...unique]));
        return merged.join('\n');
      });
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>, isHeader = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (isHeader) setUploadingHeaderImage(true);
    else setUploadingMedia(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: formData
      });
      const data = await res.json();
      if (data.url) {
        if (isHeader) {
          setHeaderImageUrl(data.url);
          setUploadedHeaderImageName(file.name);
        } else {
          setMediaUrl(data.url);
          setUploadedMediaName(file.name);
        }
      }
    } catch (err) {
      alert('Upload failed. Please check network.');
    } finally {
      if (isHeader) setUploadingHeaderImage(false);
      else setUploadingMedia(false);
      if (e.target) e.target.value = '';
    }
  };

  const addButton = () => {
    if (buttons.length >= 3) {
      alert('WhatsApp interactive messages allow maximum 3 action buttons.');
      return;
    }
    setButtons([...buttons, { type: 'quick_reply', label: 'New Option', id: `btn_${Date.now()}` }]);
  };

  const removeButton = (index: number) => {
    setButtons(buttons.filter((_, idx) => idx !== index));
  };

  const updateButton = (index: number, field: keyof IButton, value: any) => {
    const next = [...buttons];
    next[index] = { ...next[index], [field]: value };
    setButtons(next);
  };

  const handleSend = async () => {
    const numberList = numbers.split('\n').map(n => n.trim().replace(/[^0-9]/g, '')).filter(Boolean);
    if (numberList.length === 0) {
      alert('Please enter at least one recipient phone number.');
      return;
    }
    if (selectedInstances.length === 0) {
      alert('Please select at least one active sender instance or multi-SIM pool.');
      return;
    }
    if (mode === 'text' && !message.trim()) {
      alert('Please enter a message.');
      return;
    }
    if (mode === 'interactive' && !body.trim()) {
      alert('Please enter the interactive message body.');
      return;
    }

    setIsSending(true);

    try {
      const payload = {
        name: campaignName.trim() || `Campaign ${new Date().toLocaleDateString()}`,
        instances: selectedInstances,
        poolName: selectedPoolName || null,
        messageType: mode,
        messageText: message,
        mediaUrl: mode === 'media' ? mediaUrl : null,
        headerType: mode === 'interactive' ? headerType : 'none',
        headerText: mode === 'interactive' && headerType === 'text' ? headerText : null,
        headerImageUrl: mode === 'interactive' && headerType === 'image' ? headerImageUrl : null,
        body: mode === 'interactive' ? body : message,
        footer: mode === 'interactive' ? footer : null,
        buttons: mode === 'interactive' ? buttons : [],
        numbers: numberList,
        minDelay,
        maxDelay,
        batchSize,
        batchDelay
      };

      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/broadcast/campaigns/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || 'Failed to start broadcast campaign.');
        setIsSending(false);
        return;
      }

      // Batch created instantly! Redirect to Broadcast Batches page
      navigate('/broadcast');
    } catch (err: any) {
      alert('Error launching broadcast campaign: ' + (err?.message || 'Network error'));
      setIsSending(false);
    }
  };

  const numberList = numbers.split('\n').map(n => n.trim().replace(/[^0-9]/g, '')).filter(Boolean);
  const successCount = results.filter(r => r.status === 'success').length;
  const failCount = results.filter(r => r.status === 'failed').length;

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '60px' }}>
      
      {/* ─────────────────────────────────────────────────────────────
          PAGE HEADER WITH RIGHT-ALIGNED BACK BUTTON
          ───────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 900, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
            Create Broadcast Campaign
          </h2>
          <p style={{ color: '#64748B', fontSize: '13.5px', margin: '4px 0 0', fontWeight: 500 }}>
            Configure Multi-SIM pools, personalize interactive payloads, and preview real-time WhatsApp rendering.
          </p>
        </div>

        <div>
          <button
            onClick={() => navigate('/broadcast')}
            className="btn-outline"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 16px',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: 800,
              color: '#1E293B',
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              transition: 'all 0.15s ease'
            }}
            title="Back to Broadcast Batches"
          >
            <GlassBackIcon size={18} />
            <span>Back</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          CAMPAIGN BUILDER GRID
          ───────────────────────────────────────────────────────────── */}
      <div className="broadcast-grid">
        
        {/* LEFT COLUMN: STEP-BY-STEP CAMPAIGN BUILDER */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* STEP 1: CAMPAIGN NAME & SIM ALLOCATION */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <GlassInstanceIcon size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Step 1: Campaign Name & Sender Allocation</h3>
                <span style={{ fontSize: '12px', color: '#64748B' }}>Identify your campaign and choose Multi-SIM pool or individual SIMs</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Campaign Batch Name</label>
                <input
                  type="text"
                  placeholder="e.g. Summer Flash Sale Announcement"
                  value={campaignName}
                  onChange={e => setCampaignName(e.target.value)}
                  style={inputStyle}
                />
              </div>

              {pools.length > 0 && (
                <div>
                  <label style={labelStyle}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <GlassBoltIcon size={14} /> Multi-SIM Sender Pool (Recommended)
                    </span>
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px', marginBottom: '8px' }}>
                    <div
                      onClick={() => setSelectedPoolName('')}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: !selectedPoolName ? '1.5px solid #2563EB' : '1px solid #E2E8F0',
                        background: !selectedPoolName ? '#EFF6FF' : '#FFFFFF',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: !selectedPoolName ? '#2563EB' : '#94A3B8' }} />
                        <span style={{ fontSize: '12.5px', fontWeight: !selectedPoolName ? 800 : 600, color: !selectedPoolName ? '#1E40AF' : '#475569' }}>
                          Custom Selection
                        </span>
                      </div>
                      {!selectedPoolName && <span style={{ color: '#2563EB', fontWeight: 900, fontSize: '12px' }}>✓</span>}
                    </div>

                    {pools.map(p => {
                      const isSelected = selectedPoolName === p.name;
                      const count = p.instances?.length || p.connectedCount || p.totalCount || 0;
                      return (
                        <div
                          key={p.id}
                          onClick={() => {
                            setSelectedPoolName(p.name);
                            if (p.instances && p.instances.length > 0) {
                              setSelectedInstances(p.instances.map((i: any) => i.id));
                            } else if (p.instanceIds && p.instanceIds.length > 0) {
                              setSelectedInstances(p.instanceIds);
                            }
                          }}
                          style={{
                            padding: '10px 14px',
                            borderRadius: '10px',
                            border: isSelected ? '1.5px solid #2563EB' : '1px solid #E2E8F0',
                            background: isSelected ? '#EFF6FF' : '#FFFFFF',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '8px',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                            <GlassTagIcon size={14} />
                            <div style={{ minWidth: 0 }}>
                              <p style={{ margin: 0, fontSize: '12.5px', fontWeight: isSelected ? 800 : 700, color: isSelected ? '#1E40AF' : '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {p.name}
                              </p>
                              <span style={{ fontSize: '11px', color: isSelected ? '#3B82F6' : '#64748B', display: 'block' }}>
                                {count} SIMs rotation
                              </span>
                            </div>
                          </div>
                          {isSelected && <span style={{ color: '#2563EB', fontWeight: 900, fontSize: '12px' }}>✓</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label style={labelStyle}>Select Sending Instance(s) ({selectedInstances.length} selected)</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px', maxHeight: '160px', overflowY: 'auto', padding: '6px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                  {instances.map(inst => {
                    const isSelected = selectedInstances.includes(inst.id);
                    const displayName = inst.phoneNumber ? `+${inst.phoneNumber}` : inst.id;
                    const subText = inst.phoneNumber ? inst.id : null;
                    return (
                      <div
                        key={inst.id}
                        onClick={() => {
                          setSelectedPoolName('');
                          if (isSelected) setSelectedInstances(selectedInstances.filter(id => id !== inst.id));
                          else setSelectedInstances([...selectedInstances, inst.id]);
                        }}
                        style={{
                          padding: '10px 14px',
                          borderRadius: '10px',
                          border: isSelected ? '1.5px solid #2563EB' : '1px solid #CBD5E1',
                          background: isSelected ? '#EFF6FF' : '#FFFFFF',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isSelected ? '#2563EB' : '#10B981', flexShrink: 0 }} />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <p style={{ margin: 0, fontSize: '13px', fontWeight: isSelected ? 800 : 700, color: isSelected ? '#1E40AF' : '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)' }}>
                            {displayName}
                          </p>
                          {subText && (
                            <span style={{ fontSize: '11px', color: isSelected ? '#3B82F6' : '#64748B', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {subText}
                            </span>
                          )}
                        </div>
                        {isSelected && (
                          <div style={{ color: '#2563EB', fontWeight: 900, fontSize: '12px' }}>✓</div>
                        )}
                      </div>
                    );
                  })}
                  {instances.length === 0 && (
                    <div style={{ gridColumn: '1 / -1', padding: '16px', textAlign: 'center', color: '#94A3B8', fontSize: '13px', fontWeight: 500 }}>
                      No connected sender instances found. Please connect an instance first in Instances &gt; Scan QR.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* STEP 2: TARGET AUDIENCE NUMBERS */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <GlassUsersIcon size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Step 2: Target Audience</h3>
                  <span style={{ fontSize: '12px', color: '#64748B' }}>Paste numbers or import bulk CSV / TXT contacts</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <label className="btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                  <GlassFolderIcon size={16} /> Upload CSV / TXT
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".csv,.txt"
                    style={{ display: 'none' }}
                  />
                </label>
                {numberList.length > 0 && (
                  <button
                    onClick={() => {
                      const unique = Array.from(new Set(numberList));
                      setNumbers(unique.join('\n'));
                    }}
                    className="btn-outline"
                    style={{ padding: '6px 10px', fontSize: '11px', fontWeight: 700 }}
                  >
                    Clean Duplicates ({numberList.length})
                  </button>
                )}
              </div>
            </div>

            <div>
              <textarea
                placeholder="Paste recipient phone numbers (one per line, with country code)&#10;91XXXXXXXXXX&#10;91XXXXXXXXXX&#10;91XXXXXXXXXX"
                value={numbers}
                onChange={e => setNumbers(e.target.value)}
                rows={5}
                style={{ ...taStyle, fontFamily: 'var(--font-mono, monospace)', fontSize: '13px' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                <span style={{ fontSize: '11px', color: '#94A3B8' }}>Example: 91XXXXXXXXXX</span>
                <span style={{ fontSize: '12px', fontWeight: 800, color: numberList.length > 0 ? '#2563EB' : '#94A3B8' }}>
                  Total Recipients: {numberList.length}
                </span>
              </div>
            </div>
          </div>

          {/* STEP 3: MESSAGE PAYLOAD COMPOSER */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#FAF5FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <GlassChatIcon size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Step 3: Message Payload</h3>
                  <span style={{ fontSize: '12px', color: '#64748B' }}>Craft standard, media attachment, or interactive CTA messages</span>
                </div>
              </div>

              {/* Mode Toggle Buttons */}
              <div style={{ display: 'flex', background: '#F1F5F9', padding: '3px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                {(['text', 'media', 'interactive'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 800,
                      border: 'none',
                      cursor: 'pointer',
                      background: mode === m ? '#FFFFFF' : 'transparent',
                      color: mode === m ? '#2563EB' : '#64748B',
                      boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                      textTransform: 'capitalize',
                      transition: 'all 0.15s'
                    }}
                  >
                    {m === 'interactive' ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <GlassBoltIcon size={14} /> Interactive CTA
                      </span>
                    ) : m}
                  </button>
                ))}
              </div>
            </div>

            {/* MODE 1 & 2: TEXT & MEDIA MESSAGE */}
            {(mode === 'text' || mode === 'media') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {mode === 'media' && (
                  <div>
                    <label style={labelStyle}>Media Attachment (Image URL or Direct Upload)</label>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder="https://example.com/banner.jpg"
                        value={mediaUrl}
                        onChange={e => setMediaUrl(e.target.value)}
                        style={inputStyle}
                      />
                      <label className="btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '11px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        <GlassPaperclipIcon size={16} /> {uploadingMedia ? 'Uploading...' : 'Browse'}
                        <input
                          type="file"
                          onChange={e => handleMediaUpload(e, false)}
                          accept="image/*,video/*,application/pdf"
                          style={{ display: 'none' }}
                        />
                      </label>
                    </div>
                    {uploadedMediaName && (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#EFF6FF', border: '1px solid #DBEAFE', borderRadius: '8px', padding: '4px 8px', marginTop: '6px' }}>
                        <span style={{ fontSize: '11.5px', color: '#1D4ED8', fontWeight: 600 }}>📎 {uploadedMediaName}</span>
                        <button
                          onClick={() => { setMediaUrl(''); setUploadedMediaName(''); }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', fontWeight: 800, fontSize: '12px' }}
                          title="Remove attachment"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ ...labelStyle, marginBottom: 0 }}>Message Content</label>
                    
                    {/* Native WhatsApp Text Toolbar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#F1F5F9', padding: '2px 4px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                      <button
                        type="button"
                        onClick={() => applyTextFormatting('text', '*', '*', 'bold')}
                        style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '4px', padding: '2px 7px', fontSize: '12px', fontWeight: 900, cursor: 'pointer', color: '#0F172A' }}
                        title="Bold (*text*)"
                      >
                        B
                      </button>
                      <button
                        type="button"
                        onClick={() => applyTextFormatting('text', '_', '_', 'italic')}
                        style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '4px', padding: '2px 7px', fontSize: '12px', fontStyle: 'italic', fontWeight: 700, cursor: 'pointer', color: '#0F172A' }}
                        title="Italic (_text_)"
                      >
                        I
                      </button>
                      <button
                        type="button"
                        onClick={() => applyTextFormatting('text', '~', '~', 'strike')}
                        style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '4px', padding: '2px 7px', fontSize: '12px', textDecoration: 'line-through', fontWeight: 700, cursor: 'pointer', color: '#0F172A' }}
                        title="Strikethrough (~text~)"
                      >
                        S
                      </button>
                      <button
                        type="button"
                        onClick={() => applyTextFormatting('text', '```', '```', 'code')}
                        style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 700, cursor: 'pointer', color: '#0F172A' }}
                        title="Monospace (```code```)"
                      >
                        &lt;/&gt;
                      </button>
                      <button
                        type="button"
                        onClick={() => applyTextFormatting('text', '{', '}', 'Hi|Hello|Hey')}
                        style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '4px', padding: '2px 8px', fontSize: '11.5px', fontWeight: 800, cursor: 'pointer', color: '#2563EB', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        title="Anti-ban Spintax variations: {Hi|Hello|Hey}"
                      >
                        <GlassBoltIcon size={13} /> {'{Spintax}'}
                      </button>
                    </div>
                  </div>

                  <textarea
                    ref={messageTextareaRef}
                    placeholder="Hello! *Exclusive Offer* for you today. Click the link below to redeem."
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    rows={6}
                    style={taStyle}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', fontSize: '11px', color: '#94A3B8' }}>
                    <span>Use formatting: *bold*, _italic_, ~strike~, ```code```</span>
                    <span>{message.length} characters</span>
                  </div>
                </div>
              </div>
            )}

            {/* MODE 3: INTERACTIVE CTA MESSAGES */}
            {mode === 'interactive' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* Header Format Segmented Pill Controller */}
                <div>
                  <label style={labelStyle}>Header Format (Optional)</label>
                  <div style={{ display: 'flex', gap: '8px', background: '#F8FAFC', padding: '4px', borderRadius: '12px', border: '1px solid #E2E8F0', width: 'fit-content', marginBottom: '10px' }}>
                    {(['none', 'text', 'image'] as const).map(fmt => {
                      const isSel = headerType === fmt;
                      return (
                        <button
                          key={fmt}
                          type="button"
                          onClick={() => setHeaderType(fmt)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 14px',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: 800,
                            border: isSel ? '1.5px solid #2563EB' : '1px solid transparent',
                            background: isSel ? '#FFFFFF' : 'transparent',
                            color: isSel ? '#2563EB' : '#64748B',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            boxShadow: isSel ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'
                          }}
                        >
                          {fmt === 'none' && <span>No Header</span>}
                          {fmt === 'text' && (
                            <>
                              <GlassTextHeaderIcon size={16} />
                              <span>Text Header</span>
                            </>
                          )}
                          {fmt === 'image' && (
                            <>
                              <GlassImageBannerIcon size={16} />
                              <span>Image Banner</span>
                            </>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {headerType === 'text' && (
                    <input
                      type="text"
                      placeholder="e.g. FLASH SALE ANNOUNCEMENT"
                      value={headerText}
                      onChange={e => setHeaderText(e.target.value)}
                      style={inputStyle}
                    />
                  )}

                  {headerType === 'image' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <input
                          type="text"
                          placeholder="https://example.com/banner.jpg"
                          value={headerImageUrl}
                          onChange={e => setHeaderImageUrl(e.target.value)}
                          style={inputStyle}
                        />
                        <label className="btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '11px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          <GlassPaperclipIcon size={16} /> {uploadingHeaderImage ? 'Uploading...' : 'Browse'}
                          <input
                            type="file"
                            onChange={e => handleMediaUpload(e, true)}
                            accept="image/*"
                            style={{ display: 'none' }}
                          />
                        </label>
                      </div>
                      {uploadedHeaderImageName && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#EFF6FF', border: '1px solid #DBEAFE', borderRadius: '8px', padding: '4px 8px', width: 'fit-content' }}>
                          <span style={{ fontSize: '11.5px', color: '#1D4ED8', fontWeight: 600 }}>🖼️ {uploadedHeaderImageName}</span>
                          <button
                            onClick={() => { setHeaderImageUrl(''); setUploadedHeaderImageName(''); }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', fontWeight: 800, fontSize: '12px' }}
                            title="Remove header banner"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Body Content with Native WhatsApp Toolbar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ ...labelStyle, marginBottom: 0 }}>Message Body *</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#F1F5F9', padding: '2px 4px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                      <button
                        type="button"
                        onClick={() => applyTextFormatting('interactive', '*', '*', 'bold')}
                        style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '4px', padding: '2px 7px', fontSize: '12px', fontWeight: 900, cursor: 'pointer', color: '#0F172A' }}
                        title="Bold (*text*)"
                      >
                        B
                      </button>
                      <button
                        type="button"
                        onClick={() => applyTextFormatting('interactive', '_', '_', 'italic')}
                        style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '4px', padding: '2px 7px', fontSize: '12px', fontStyle: 'italic', fontWeight: 700, cursor: 'pointer', color: '#0F172A' }}
                        title="Italic (_text_)"
                      >
                        I
                      </button>
                      <button
                        type="button"
                        onClick={() => applyTextFormatting('interactive', '~', '~', 'strike')}
                        style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '4px', padding: '2px 7px', fontSize: '12px', textDecoration: 'line-through', fontWeight: 700, cursor: 'pointer', color: '#0F172A' }}
                        title="Strikethrough (~text~)"
                      >
                        S
                      </button>
                      <button
                        type="button"
                        onClick={() => applyTextFormatting('interactive', '```', '```', 'code')}
                        style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 700, cursor: 'pointer', color: '#0F172A' }}
                        title="Monospace (```code```)"
                      >
                        &lt;/&gt;
                      </button>
                      <button
                        type="button"
                        onClick={() => applyTextFormatting('interactive', '{', '}', 'Hi|Hello|Hey')}
                        style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '4px', padding: '2px 8px', fontSize: '11.5px', fontWeight: 800, cursor: 'pointer', color: '#2563EB', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        title="Anti-ban Spintax variations: {Hi|Hello|Hey}"
                      >
                        <GlassBoltIcon size={13} /> {'{Spintax}'}
                      </button>
                    </div>
                  </div>

                  <textarea
                    ref={bodyTextareaRef}
                    placeholder="We are thrilled to invite you to our VIP demo. Click one of the buttons below to proceed!"
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    rows={4}
                    style={taStyle}
                  />
                </div>

                {/* Footer Content */}
                <div>
                  <label style={labelStyle}>Footer Caption (Optional small italic text)</label>
                  <input
                    type="text"
                    placeholder="e.g. Reply STOP to unsubscribe"
                    value={footer}
                    onChange={e => setFooter(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                {/* Interactive Action Buttons (Max 3) */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <label style={{ ...labelStyle, marginBottom: 0 }}>Action Buttons ({buttons.length}/3)</label>
                    {buttons.length < 3 && (
                      <button
                        onClick={addButton}
                        className="btn-outline"
                        style={{ padding: '4px 10px', fontSize: '11.5px', fontWeight: 700, borderRadius: '6px' }}
                      >
                        + Add Action Button
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {buttons.map((btn, idx) => (
                      <div key={idx} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 800, color: '#334155' }}>Button #{idx + 1}</span>
                          <button
                            onClick={() => removeButton(idx)}
                            style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}
                          >
                            Remove
                          </button>
                        </div>

                        {/* Button Type Selector */}
                        <div style={{ display: 'flex', gap: '6px', background: '#FFFFFF', padding: '3px', borderRadius: '10px', border: '1px solid #E2E8F0', marginBottom: '10px', width: 'fit-content' }}>
                          {(['quick_reply', 'cta_url', 'cta_call'] as const).map(bt => {
                            const isSelected = btn.type === bt;
                            return (
                              <button
                                key={bt}
                                type="button"
                                onClick={() => updateButton(idx, 'type', bt)}
                                style={{
                                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                                  padding: '5px 12px', borderRadius: '7px', fontSize: '11.5px', fontWeight: 800,
                                  border: isSelected ? '1.5px solid #2563EB' : '1px solid transparent',
                                  background: isSelected ? '#EFF6FF' : 'transparent',
                                  color: isSelected ? '#2563EB' : '#64748B',
                                  cursor: 'pointer', transition: 'all 0.15s ease'
                                }}
                              >
                                {bt === 'quick_reply' && <GlassChatIcon size={13} />}
                                {bt === 'cta_url' && <GlassLinkIcon size={13} />}
                                {bt === 'cta_call' && <GlassPhoneIcon size={13} />}
                                <span>{bt === 'quick_reply' ? 'Quick Reply' : bt === 'cta_url' ? 'Website URL' : 'Call Phone'}</span>
                              </button>
                            );
                          })}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: btn.type === 'quick_reply' ? '1fr' : '1fr 1fr', gap: '10px' }}>
                          <div>
                            <input
                              type="text"
                              placeholder="Button Label (e.g. Visit Website)"
                              value={btn.label}
                              onChange={e => updateButton(idx, 'label', e.target.value)}
                              style={inputStyle}
                            />
                          </div>

                          {btn.type === 'cta_url' && (
                            <div>
                              <input
                                type="url"
                                placeholder="Target URL (https://...)"
                                value={btn.url || ''}
                                onChange={e => updateButton(idx, 'url', e.target.value)}
                                style={inputStyle}
                              />
                            </div>
                          )}

                          {btn.type === 'cta_call' && (
                            <div>
                              <input
                                type="text"
                                placeholder="Phone number (e.g. +91XXXXXXXXXX)"
                                value={btn.phone || ''}
                                onChange={e => updateButton(idx, 'phone', e.target.value)}
                                style={inputStyle}
                              />
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

          {/* STEP 4: DISPATCH SAFEGUARDS & ANTI-BAN RATE LIMITING */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <GlassSparklesIcon size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Step 4: Anti-Ban Safeguards & Smart Jitter</h3>
                <span style={{ fontSize: '12px', color: '#64748B' }}>Protects WhatsApp numbers with randomized human intervals</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Random Delay Range (Seconds)</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={minDelay}
                    onChange={e => setMinDelay(Number(e.target.value))}
                    style={inputStyle}
                  />
                  <span style={{ color: '#94A3B8', fontWeight: 700 }}>to</span>
                  <input
                    type="number"
                    min={2}
                    max={120}
                    value={maxDelay}
                    onChange={e => setMaxDelay(Number(e.target.value))}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Batch Cooldown Pause</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#64748B' }}>Every</span>
                  <input
                    type="number"
                    min={5}
                    value={batchSize}
                    onChange={e => setBatchSize(Number(e.target.value))}
                    style={{ ...inputStyle, width: '80px' }}
                  />
                  <span style={{ fontSize: '12px', color: '#64748B' }}>msgs, wait</span>
                  <input
                    type="number"
                    min={5}
                    value={batchDelay}
                    onChange={e => setBatchDelay(Number(e.target.value))}
                    style={{ ...inputStyle, width: '80px' }}
                  />
                  <span style={{ fontSize: '12px', color: '#64748B' }}>sec</span>
                </div>
              </div>
            </div>
          </div>

          {/* STEP 5: DISPATCH BROADCAST ACTION */}
          <div className="card" style={{ background: '#F8FAFC', border: '1.5px solid #DBEAFE', borderRadius: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h4 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>Ready to Launch Broadcast</h4>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>
                  {numberList.length} recipient numbers will be queued into an instant batch and dispatched with anti-ban safeguards.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleSend}
                  disabled={isSending || numberList.length === 0 || selectedInstances.length === 0}
                  className="btn-primary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 24px',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: 800,
                    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                    cursor: isSending ? 'not-allowed' : 'pointer',
                    opacity: isSending ? 0.7 : 1
                  }}
                >
                  <GlassSendIcon size={18} />
                  <span>{isSending ? 'Creating Batch & Launching...' : 'Launch Broadcast Batch'}</span>
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: LIVE WHATSAPP VECTOR PHONE SIMULATOR */}
        <div>
          <PhoneSimulator
            mode={mode}
            message={message}
            mediaUrl={mediaUrl}
            headerType={headerType}
            headerText={headerText}
            headerImageUrl={headerImageUrl}
            body={body}
            footer={footer}
            buttons={buttons}
          />
        </div>

      </div>

    </div>
  );
};
