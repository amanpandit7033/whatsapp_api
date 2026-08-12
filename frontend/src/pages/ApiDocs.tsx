import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CopyIcon, CheckIcon, BookIcon, SendIcon, DeviceIcon, SearchIcon, UsersGroupIcon } from '../components/Icons';
import { copyToClipboard } from '../utils/clipboard';

const METHOD_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  GET: { bg: '#F0F9FF', color: '#0284C7', border: '#BAE6FD' },
  POST: { bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0' },
  DELETE: { bg: '#FEF2F2', color: '#DC2626', border: '#FEE2E2' },
};

const CodeBlock = ({ title, code, language = 'json' }: { title: string; code: string; language?: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    const success = await copyToClipboard(code);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div style={{ borderRadius: '14px', overflow: 'hidden', border: '1px solid #334155', background: '#0F172A', boxShadow: '0 10px 30px rgba(0,0,0,0.15)' }}>
      {/* Editor Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: '#1E293B', borderBottom: '1px solid #334155' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#FF5F56' }} />
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#FFBD2E' }} />
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#27C93F' }} />
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', fontFamily: 'var(--font-mono)', marginLeft: '6px', textTransform: 'uppercase' }}>
            {title} ({language})
          </span>
        </div>
        <button
          onClick={handleCopy}
          style={{
            background: copied ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.08)',
            border: copied ? '1px solid #10B981' : '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '6px',
            padding: '4px 10px',
            color: copied ? '#34D399' : '#CBD5E1',
            fontWeight: 700,
            fontSize: '11px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'all 0.2s ease',
          }}
        >
          {copied ? <CheckIcon size={12} color="#34D399" /> : <CopyIcon size={12} color="#CBD5E1" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      {/* Code Text Area */}
      <div style={{ padding: '18px 20px', color: '#F8FAFC', fontFamily: 'var(--font-mono)', fontSize: '12.5px', lineHeight: '1.6', overflowX: 'auto' }} className="custom-scrollbar">
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{code}</pre>
      </div>
    </div>
  );
};

interface IEndpoint {
  method: string;
  path: string;
  title: string;
  desc: string;
  category: 'messaging' | 'instance' | 'public' | 'groups';
  params?: { name: string; type: string; req: boolean; desc: string }[];
  reqExample: { title: string; code: string; language?: string };
  resExample: { title: string; code: string };
}

const EndpointDoc = ({ method, path, title, desc, params, reqExample, resExample }: IEndpoint) => {
  const mStyle = METHOD_STYLES[method] || METHOD_STYLES.GET;
  return (
    <div className="card" style={{ padding: '24px', borderRadius: '18px', display: 'flex', flexDirection: 'column', gap: '20px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', transition: 'all 0.2s ease' }}>
      {/* Title / Badges */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ background: mStyle.bg, color: mStyle.color, border: `1px solid ${mStyle.border}`, padding: '5px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 800, letterSpacing: '0.04em' }}>
            {method}
          </span>
          <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.01em' }}>{title}</h3>
        </div>
        <div style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', background: '#F8FAFC', padding: '6px 14px', borderRadius: '10px', border: '1px solid #E2E8F0', color: '#475569', fontWeight: 600, wordBreak: 'break-all' }}>
          {import.meta.env.VITE_API_URL}{path}
        </div>
      </div>

      <p style={{ margin: 0, fontSize: '14px', color: '#64748B', lineHeight: '1.6', fontWeight: 500 }}>{desc}</p>

      {/* Grid: Parameters vs Code Examples */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        {/* Left Column: Specs / Parameters */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Parameters & Inputs</span>
          {params && params.length > 0 ? (
            <div style={{ border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden', background: '#FFFFFF' }}>
              <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569', fontSize: '12px' }}>Parameter</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569', fontSize: '12px' }}>Type</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569', fontSize: '12px' }}>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {params.map(p => (
                    <tr key={p.name} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px 14px', verticalAlign: 'top' }}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#0F172A', fontSize: '12.5px' }}>{p.name}</div>
                        {p.req ? (
                          <span style={{ display: 'inline-block', marginTop: '2px', background: '#FEF2F2', color: '#DC2626', fontSize: '10px', fontWeight: 800, padding: '1px 6px', borderRadius: '4px' }}>REQUIRED</span>
                        ) : (
                          <span style={{ display: 'inline-block', marginTop: '2px', background: '#F1F5F9', color: '#64748B', fontSize: '10px', fontWeight: 600, padding: '1px 6px', borderRadius: '4px' }}>OPTIONAL</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', color: '#7C3AED', fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: '12px', verticalAlign: 'top' }}>
                        {p.type}
                      </td>
                      <td style={{ padding: '12px 14px', color: '#475569', fontWeight: 500, fontSize: '12.5px', lineHeight: '1.5', verticalAlign: 'top' }}>
                        {p.desc}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: '24px', textAlign: 'center', background: '#F8FAFC', borderRadius: '12px', border: '1px dashed #CBD5E1', color: '#94A3B8', fontSize: '13px', fontWeight: 600 }}>
              No request parameters required.
            </div>
          )}
        </div>

        {/* Right Column: Code snippets */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
          <CodeBlock title={reqExample.title} code={reqExample.code} language={reqExample.language || 'http'} />
          <CodeBlock title={resExample.title} code={resExample.code} language="json" />
        </div>
      </div>
    </div>
  );
};

export const ApiDocs = () => {
  const [apiKey, setApiKey] = useState<string>('Loading...');
  const [copied, setCopied] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'messaging' | 'instance' | 'public'>('all');
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
    fetch(`${import.meta.env.VITE_API_URL}/api/me`, { headers }).then(r => {
      if (r.status === 401) { navigate('/login'); return; }
      r.json().then(d => setApiKey(d.apiKey));
    });
  }, [navigate]);

  const copyKey = async () => {
    const success = await copyToClipboard(apiKey);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const copyApiUrl = async () => {
    const url = `${import.meta.env.VITE_API_URL}/api/send?number=919876543210&type=text&message=Hello&instance_id=YOUR_INSTANCE_ID&access_token=${apiKey}`;
    const success = await copyToClipboard(url);
    if (success) {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  const regenerateToken = async () => {
    if (!confirm('Regenerate your access token? Existing integrations using the old token will stop working.')) return;
    setRegenerating(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/me/regenerate-token`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (data.apiKey) setApiKey(data.apiKey);
    } catch { alert('Failed to regenerate token'); }
    setRegenerating(false);
  };

  const allEndpoints: IEndpoint[] = [
    // --- MESSAGING ENDPOINTS ---
    {
      category: 'messaging',
      method: 'GET',
      path: '/api/send',
      title: 'Quick Send API (Simple URL)',
      desc: 'The easiest way to send a WhatsApp message — just paste the URL in a browser or call it from any language. No JSON body or JWT token needed, only your access_token.',
      params: [
        { name: 'number', type: 'string', req: true, desc: 'Recipient phone number with country code. E.g. 919876543210' },
        { name: 'type', type: 'string', req: false, desc: 'Message type: text (default), image, video, document' },
        { name: 'message', type: 'string', req: true, desc: 'Text content of the message (also used as caption for media).' },
        { name: 'instance_id', type: 'string', req: true, desc: 'Your connected WhatsApp instance ID.' },
        { name: 'access_token', type: 'string', req: true, desc: 'Your personal API access token (shown on this page).' },
        { name: 'media_url', type: 'string', req: false, desc: 'Public URL of the media file. Required when type is image/video/document.' },
      ],
      reqExample: {
        title: 'GET REQUEST URL',
        language: 'http',
        code: `GET ${import.meta.env.VITE_API_URL}/api/send?number=919876543210&type=text&message=Hello+World&instance_id=YOUR_INSTANCE_ID&access_token=${apiKey}`
      },
      resExample: {
        title: 'RESPONSE JSON',
        code: JSON.stringify({
          success: true,
          message: "Message queued",
          message_id: "uuid-xxxx-xxxx"
        }, null, 2)
      }
    },
    {
      category: 'messaging',
      method: 'POST',
      path: '/api/send',
      title: 'Send Media & File Attachment',
      desc: 'Send images, videos, documents, or audio files with custom captions to any recipient number.',
      params: [
        { name: 'number', type: 'string', req: true, desc: 'Recipient phone number with country code (e.g., 919876543210).' },
        { name: 'type', type: 'string', req: true, desc: 'Must be set to "media".' },
        { name: 'message', type: 'string', req: false, desc: 'Caption text accompanying the media attachment.' },
        { name: 'media_url', type: 'string', req: true, desc: 'Public HTTPS direct URL of media file (image, video, document).' },
        { name: 'filename', type: 'string', req: false, desc: 'Custom display filename for documents (e.g. invoice.pdf).' },
        { name: 'instance_id', type: 'string', req: true, desc: 'Your connected WhatsApp instance ID.' },
        { name: 'access_token', type: 'string', req: true, desc: 'Your personal API access token.' }
      ],
      reqExample: {
        title: 'POST REQUEST JSON BODY',
        language: 'json',
        code: JSON.stringify({
          number: "919876543210",
          type: "media",
          message: "Check out this document!",
          media_url: "https://example.com/sample.pdf",
          filename: "document.pdf",
          instance_id: "YOUR_INSTANCE_ID",
          access_token: apiKey
        }, null, 2)
      },
      resExample: {
        title: 'RESPONSE JSON',
        code: JSON.stringify({
          status: "success",
          message: {
            key: {
              remoteJid: "919876543210@s.whatsapp.net",
              fromMe: true,
              id: "3EB000942D2822315D8255"
            },
            status: "SUCCESS"
          }
        }, null, 2)
      }
    },
    {
      category: 'messaging',
      method: 'POST',
      path: '/api/message/send',
      title: 'Send Message (JSON Payload)',
      desc: 'Send a plain text or media attachment message to a recipient using a POST request.',
      params: [
        { name: 'api_key', type: 'string', req: true, desc: 'Your Secrets API Key.' },
        { name: 'instance_id', type: 'string', req: true, desc: 'The linked instance ID sending the message.' },
        { name: 'number', type: 'string', req: true, desc: 'Recipient phone number with country code (e.g., 919876543210).' },
        { name: 'message', type: 'string', req: false, desc: 'Plain text message content.' },
        { name: 'media_url', type: 'string', req: false, desc: 'Public URL of file to send (image, video, document).' },
        { name: 'filename', type: 'string', req: false, desc: 'Custom file attachment name override.' }
      ],
      reqExample: {
        title: 'POST REQUEST JSON BODY',
        language: 'json',
        code: JSON.stringify({
          api_key: apiKey,
          instance_id: "YOUR_INSTANCE_ID",
          number: "919876543210",
          message: "Hello from API!",
          media_url: "https://example.com/invoice.pdf",
          filename: "invoice.pdf"
        }, null, 2)
      },
      resExample: {
        title: 'RESPONSE JSON',
        code: JSON.stringify({
          success: true,
          message: "Message queued",
          message_id: "75e01b44-934c-4235-b283-abcdef123456"
        }, null, 2)
      }
    },
    {
      category: 'messaging',
      method: 'POST',
      path: '/api/message/send-interactive',
      title: 'Send Interactive Message (Buttons)',
      desc: 'Send rich interactive messages featuring text/image headers, footers, and up to 3 quick reply or CTA (URL/Call) buttons.',
      params: [
        { name: 'api_key', type: 'string', req: true, desc: 'Your Secrets API Key.' },
        { name: 'instance_id', type: 'string', req: true, desc: 'Linked instance ID.' },
        { name: 'number', type: 'string', req: true, desc: 'Recipient phone number (e.g., 919876543210).' },
        { name: 'interactive', type: 'object', req: true, desc: 'Interactive payload configurations.' },
        { name: 'interactive.headerType', type: 'string', req: false, desc: '"none" | "text" | "image"' },
        { name: 'interactive.headerText', type: 'string', req: false, desc: 'Header text label.' },
        { name: 'interactive.body', type: 'string', req: true, desc: 'Main text message content.' },
        { name: 'interactive.footer', type: 'string', req: false, desc: 'Subtext footer description.' },
        { name: 'interactive.buttons', type: 'array', req: true, desc: 'Up to 3 buttons: quick_reply, cta_url, or cta_call.' }
      ],
      reqExample: {
        title: 'POST REQUEST JSON BODY',
        language: 'json',
        code: JSON.stringify({
          api_key: apiKey,
          instance_id: "YOUR_INSTANCE_ID",
          number: "919876543210",
          interactive: {
            headerType: "text",
            headerText: "Limited Time Deal!",
            body: "Choose an option below to claim your discount:",
            footer: "Offer expires in 2 hours",
            buttons: [
              { type: "cta_url", label: "Claim Discount", url: "https://example.com/discount" },
              { type: "cta_call", label: "Call Sales", phone: "1800123456" },
              { type: "quick_reply", label: "Ask a Question", id: "help_reply" }
            ]
          }
        }, null, 2)
      },
      resExample: {
        title: 'RESPONSE JSON',
        code: JSON.stringify({
          success: true,
          message: "Message queued",
          message_id: "75e01b44-934c-4235-b283-abcdef123456"
        }, null, 2)
      }
    },
    {
      category: 'messaging',
      method: 'GET',
      path: '/api/check-number',
      title: 'WhatsApp Number Validator API',
      desc: 'Verify whether one or more phone numbers exist and are active on WhatsApp before sending campaigns.',
      params: [
        { name: 'number', type: 'string', req: true, desc: 'Phone number with country code (e.g. 919876543210) or comma-separated numbers.' },
        { name: 'instance_id', type: 'string', req: true, desc: 'Your connected WhatsApp instance ID.' },
        { name: 'access_token', type: 'string', req: true, desc: 'Your personal API access token.' },
        { name: 'delay', type: 'number', req: false, desc: 'Safety delay between multiple queries in ms (default: 100ms).' }
      ],
      reqExample: {
        title: 'GET REQUEST URL',
        language: 'http',
        code: `GET ${import.meta.env.VITE_API_URL}/api/check-number?number=919876543210&instance_id=YOUR_INSTANCE_ID&access_token=${apiKey}`
      },
      resExample: {
        title: 'RESPONSE JSON',
        code: JSON.stringify({
          status: "success",
          number: "919876543210",
          exists: true,
          jid: "919876543210@s.whatsapp.net"
        }, null, 2)
      }
    },
    {
      category: 'messaging',
      method: 'GET',
      path: '/api/message/status',
      title: 'Check Message Status',
      desc: 'Verify if a queued message was successfully sent, failed, or was sent to a Non-WhatsApp number.',
      params: [
        { name: 'api_key', type: 'string', req: true, desc: 'Your Secrets API Key.' },
        { name: 'message_id', type: 'string', req: true, desc: 'The message_id returned when you sent the message.' }
      ],
      reqExample: {
        title: 'GET REQUEST URL',
        language: 'http',
        code: `GET ${import.meta.env.VITE_API_URL}/api/message/status?api_key=${apiKey}&message_id=75e01b44-934c-4235-b283-abcdef123456`
      },
      resExample: {
        title: 'RESPONSE JSON',
        code: JSON.stringify({
          success: true,
          message_id: "75e01b44-934c-4235-b283-abcdef123456",
          number: "919876543210",
          status: "sent",
          created_at: new Date().toISOString()
        }, null, 2)
      }
    },

    // --- PUBLIC INSTANCE ENDPOINTS ---
    {
      category: 'public',
      method: 'POST',
      path: '/api/create_instance',
      title: 'Programmatic Create Instance',
      desc: 'Create a new WhatsApp instance programmatically. Returns an instance_id you can use to poll the QR code. Respects your account instance limit.',
      params: [
        { name: 'access_token', type: 'string', req: true, desc: 'Your personal API access token.' },
      ],
      reqExample: {
        title: 'POST REQUEST URL',
        language: 'http',
        code: `POST ${import.meta.env.VITE_API_URL}/api/create_instance?access_token=${apiKey}`
      },
      resExample: {
        title: 'RESPONSE JSON',
        code: JSON.stringify({ 
          status: "success", 
          message: "Instance ID generated successfully", 
          instance_id: 'ABC123XXX' 
        }, null, 2)
      }
    },
    {
      category: 'public',
      method: 'POST',
      path: '/api/get_qrcode',
      title: 'Fetch Connection QR Code',
      desc: 'Poll this endpoint every 3 seconds after creating an instance to retrieve the Base64 QR code image for scanning. Returns null if QR is not yet ready.',
      params: [
        { name: 'instance_id', type: 'string', req: true, desc: 'The instance ID returned by /api/create_instance.' },
        { name: 'access_token', type: 'string', req: true, desc: 'Your personal API access token.' },
      ],
      reqExample: {
        title: 'POST REQUEST URL',
        language: 'http',
        code: `POST ${import.meta.env.VITE_API_URL}/api/get_qrcode?instance_id=ABC123XXX&access_token=${apiKey}`
      },
      resExample: {
        title: 'RESPONSE JSON',
        code: JSON.stringify({ 
          status: "success", 
          message: "Success", 
          base64: 'data:image/png;base64,iVBORw0KGgo...' 
        }, null, 2)
      }
    },
    {
      category: 'public',
      method: 'POST',
      path: '/api/reboot',
      title: 'Reboot Instance Session',
      desc: 'Restart WhatsApp Web socket connection and generate a fresh QR code for scanning.',
      params: [
        { name: 'instance_id', type: 'string', req: true, desc: 'Target instance ID.' },
        { name: 'access_token', type: 'string', req: true, desc: 'Your personal API access token.' },
      ],
      reqExample: {
        title: 'POST REQUEST URL',
        language: 'http',
        code: `POST ${import.meta.env.VITE_API_URL}/api/reboot?instance_id=ABC123XXX&access_token=${apiKey}`
      },
      resExample: {
        title: 'RESPONSE JSON',
        code: JSON.stringify({ status: "success", message: 'Success' }, null, 2)
      }
    },

    // --- WHATSAPP GROUP ENDPOINTS ---
    {
      category: 'groups',
      method: 'GET',
      path: '/api/group_list',
      title: 'Fetch All WhatsApp Groups',
      desc: 'Retrieves all WhatsApp groups the connected instance is currently a member or admin of, including group JIDs, titles, member counts, and permissions.',
      params: [
        { name: 'instance_id', type: 'string', req: true, desc: 'Your connected WhatsApp instance ID.' },
        { name: 'access_token', type: 'string', req: true, desc: 'Your personal API access token.' },
      ],
      reqExample: {
        title: 'GET REQUEST URL',
        language: 'http',
        code: `GET ${import.meta.env.VITE_API_URL}/api/group_list?instance_id=ABC123XXX&access_token=${apiKey}`
      },
      resExample: {
        title: 'RESPONSE JSON',
        code: JSON.stringify({
          status: "success",
          count: 2,
          groups: [
            {
              id: "120363405275458276@g.us",
              subject: "VIP Customers Club",
              participantsCount: 142,
              isAdmin: true,
              isAnnounce: false,
              creation: 1766672615
            },
            {
              id: "120363405288888888@g.us",
              subject: "Product Announcements",
              participantsCount: 512,
              isAdmin: false,
              isAnnounce: true,
              creation: 1766600000
            }
          ]
        }, null, 2)
      }
    },
    {
      category: 'groups',
      method: 'GET',
      path: '/api/group_participants',
      title: 'Get Group Members & Metadata',
      desc: 'Fetches the full list of member phone numbers, admin statuses, and metadata for a specific WhatsApp group.',
      params: [
        { name: 'instance_id', type: 'string', req: true, desc: 'Target connected WhatsApp instance ID.' },
        { name: 'group_id', type: 'string', req: true, desc: 'Group JID (e.g. 120363405275458276@g.us).' },
        { name: 'access_token', type: 'string', req: true, desc: 'Your personal API access token.' },
      ],
      reqExample: {
        title: 'GET REQUEST URL',
        language: 'http',
        code: `GET ${import.meta.env.VITE_API_URL}/api/group_participants?instance_id=ABC123XXX&group_id=120363405275458276@g.us&access_token=${apiKey}`
      },
      resExample: {
        title: 'RESPONSE JSON',
        code: JSON.stringify({
          status: "success",
          group: {
            id: "120363405275458276@g.us",
            subject: "VIP Customers Club",
            participantsCount: 3,
            participants: [
              { id: "140415768506447@lid", number: "919905264689", admin: "admin", isMe: false },
              { id: "247463751487539@lid", number: "919507066372", admin: "admin", isMe: true },
              { id: "227354832072918@lid", number: "919279706788", admin: "superadmin", isMe: false }
            ]
          }
        }, null, 2)
      }
    },
    {
      category: 'groups',
      method: 'POST',
      path: '/api/send_group',
      title: 'Send Message to WhatsApp Group',
      desc: 'Send a plain text message or media attachment (image, video, document) directly to any WhatsApp group JID.',
      params: [
        { name: 'instance_id', type: 'string', req: true, desc: 'Target connected WhatsApp instance ID.' },
        { name: 'group_id', type: 'string', req: true, desc: 'Target Group JID (e.g. 120363405275458276@g.us).' },
        { name: 'type', type: 'string', req: false, desc: 'Message type: "text" (default) or "media".' },
        { name: 'message', type: 'string', req: false, desc: 'The text message or media caption.' },
        { name: 'media_url', type: 'string', req: false, desc: 'Direct URL to image/video/doc (when type=media).' },
        { name: 'access_token', type: 'string', req: true, desc: 'Your personal API access token.' },
      ],
      reqExample: {
        title: 'POST REQUEST URL (TEXT)',
        language: 'http',
        code: `POST ${import.meta.env.VITE_API_URL}/api/send_group?group_id=120363405275458276@g.us&type=text&message=Hello+Team!&instance_id=ABC123XXX&access_token=${apiKey}`
      },
      resExample: {
        title: 'RESPONSE JSON',
        code: JSON.stringify({
          status: "success",
          message: "Message sent to group",
          group_id: "120363405275458276@g.us",
          messageTimestamp: "1786468900"
        }, null, 2)
      }
    },

    // --- SDK INSTANCE ENDPOINTS ---
    {
      category: 'instance',
      method: 'POST',
      path: '/api/client/instance/create',
      title: 'Create Instance (SDK)',
      desc: 'Creates a brand new initializing instance session under your account.',
      params: [
        { name: 'api_key', type: 'string', req: true, desc: 'Your Secrets API Key.' }
      ],
      reqExample: {
        title: 'POST REQUEST URL',
        language: 'http',
        code: `POST ${import.meta.env.VITE_API_URL}/api/client/instance/create?api_key=${apiKey}`
      },
      resExample: {
        title: 'RESPONSE JSON',
        code: JSON.stringify({
          instance_id: "ABCDEF"
        }, null, 2)
      }
    },
    {
      category: 'instance',
      method: 'GET',
      path: '/api/client/instance/status',
      title: 'Check Instance Status',
      desc: 'Verify if the instance is connected or disconnected, and see the linked phone number.',
      params: [
        { name: 'api_key', type: 'string', req: true, desc: 'Your Secrets API Key.' },
        { name: 'instance_id', type: 'string', req: true, desc: 'Target instance ID.' }
      ],
      reqExample: {
        title: 'GET REQUEST URL',
        language: 'http',
        code: `GET ${import.meta.env.VITE_API_URL}/api/client/instance/status?api_key=${apiKey}&instance_id=ABCDEF`
      },
      resExample: {
        title: 'RESPONSE JSON',
        code: JSON.stringify({
          status: "connected",
          phoneNumber: "919876543210"
        }, null, 2)
      }
    },
    {
      category: 'instance',
      method: 'POST',
      path: '/api/client/instance/logout',
      title: 'Logout Instance Session',
      desc: 'Log out and disconnect the WhatsApp active session from the instance.',
      params: [
        { name: 'api_key', type: 'string', req: true, desc: 'Your Secrets API Key.' },
        { name: 'instance_id', type: 'string', req: true, desc: 'Target instance ID.' }
      ],
      reqExample: {
        title: 'POST REQUEST URL',
        language: 'http',
        code: `POST ${import.meta.env.VITE_API_URL}/api/client/instance/logout?api_key=${apiKey}&instance_id=ABCDEF`
      },
      resExample: {
        title: 'RESPONSE JSON',
        code: JSON.stringify({
          success: true,
          message: "Instance logged out successfully"
        }, null, 2)
      }
    },
  ];

  // Filter endpoints by tab and search
  const filteredEndpoints = allEndpoints.filter(ep => {
    const matchesTab = activeTab === 'all' || ep.category === activeTab;
    const matchesSearch = search === '' || 
      ep.title.toLowerCase().includes(search.toLowerCase()) || 
      ep.path.toLowerCase().includes(search.toLowerCase()) || 
      ep.desc.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="animate-in" style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Header & Title */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', margin: '0 0 6px', letterSpacing: '-0.02em' }}>Developer API Reference</h2>
          <p style={{ color: '#64748B', fontSize: '14px', margin: 0, fontWeight: 500 }}>
            Programmatically control WhatsApp instances, send text/media messages, and dispatch interactive button templates via REST APIs.
          </p>
        </div>
      </div>

      {/* API Key Credentials Card (Shopeers High-Contrast SaaS Style) */}
      <div 
        className="card" 
        style={{ 
          padding: '28px', 
          borderRadius: '20px', 
          background: '#FFFFFF', 
          border: 'none', 
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)', 
          color: '#0F172A', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '20px' 
        }}
      >
        {/* Header Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookIcon size={22} color="#2563EB" />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.01em' }}>
                API Credentials & Endpoint Host
              </h4>
              <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#64748B', fontWeight: 500 }}>
                Base Host URL: <code style={{ color: '#2563EB', fontFamily: 'var(--font-mono)', fontWeight: 700, background: '#EFF6FF', padding: '2px 8px', borderRadius: '6px' }}>{import.meta.env.VITE_API_URL}</code>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={copyKey}
              className="btn-primary"
              style={{ padding: '10px 18px', fontSize: '13px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {copied ? <CheckIcon size={16} color="white" /> : <CopyIcon size={16} color="white" />}
              {copied ? 'Token Copied!' : 'Copy Access Token'}
            </button>

            <button
              onClick={regenerateToken}
              disabled={regenerating}
              className="btn-outline"
              style={{ padding: '10px 16px', fontSize: '13px', borderRadius: '10px' }}
            >
              {regenerating ? 'Regenerating...' : '↻ Regenerate Token'}
            </button>
          </div>
        </div>

        {/* Access Token Box (Midnight High Contrast Code Block) */}
        <div 
          style={{ 
            background: '#0F172A', 
            borderRadius: '14px', 
            padding: '16px 20px', 
            border: '1px solid #1E293B', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '6px' 
          }}
        >
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            YOUR PERSONAL ACCESS TOKEN
          </span>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <code style={{ fontSize: '16px', fontFamily: 'var(--font-mono)', color: '#FBBF24', fontWeight: 700, letterSpacing: '0.04em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {apiKey}
            </code>
            <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, background: 'rgba(255,255,255,0.06)', padding: '3px 8px', borderRadius: '6px' }}>
              SECRET KEY
            </span>
          </div>
        </div>

        {/* Quick Test Send URL */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            1-CLICK QUICK SEND URL (TEST IN BROWSER)
          </span>
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              gap: '14px', 
              background: '#1E293B', 
              padding: '12px 18px', 
              borderRadius: '12px', 
              border: '1px solid #334155' 
            }}
          >
            <code style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: '12.5px', color: '#38BDF8', wordBreak: 'break-all', lineHeight: 1.6 }}>
              {import.meta.env.VITE_API_URL}/api/send?number=919876543210&type=text&message=Hello&instance_id=YOUR_INSTANCE_ID&access_token={apiKey}
            </code>
            <button
              onClick={copyApiUrl}
              style={{
                background: copiedUrl ? '#10B981' : '#2563EB',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 14px',
                color: 'white',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)',
              }}
            >
              {copiedUrl ? '✓ URL Copied!' : 'Copy Test URL'}
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs & Search Filter */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        {/* Category Tabs */}
        <div style={{ display: 'flex', background: '#FFFFFF', padding: '5px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: 'var(--shadow-soft)', gap: '4px' }}>
          {[
            { id: 'all', label: 'All Endpoints', icon: BookIcon },
            { id: 'messaging', label: 'Messaging APIs', icon: SendIcon },
            { id: 'groups', label: 'Group APIs', icon: UsersGroupIcon },
            { id: 'public', label: 'Public Instance APIs', icon: DeviceIcon },
            { id: 'instance', label: 'SDK Endpoints', icon: DeviceIcon },
          ].map(tab => {
            const isActive = activeTab === tab.id;
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  borderRadius: '10px',
                  border: 'none',
                  background: isActive ? '#7C3AED' : 'transparent',
                  color: isActive ? '#FFFFFF' : '#64748B',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <TabIcon size={14} color={isActive ? '#FFFFFF' : '#64748B'} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search Input Filter */}
        <div style={{ position: 'relative', width: '280px' }}>
          <SearchIcon size={16} color="#94A3B8" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search API endpoints..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="rounded-input"
            style={{ paddingRight: '38px', height: '42px', borderRadius: '12px' }}
          />
        </div>
      </div>

      {/* Endpoints Documentation List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {filteredEndpoints.map(ep => (
          <EndpointDoc key={ep.method + ep.path} {...ep} />
        ))}
        {filteredEndpoints.length === 0 && (
          <div className="card" style={{ padding: '48px', textAlign: 'center', color: '#94A3B8', fontWeight: 600, borderRadius: '18px' }}>
            No matching API endpoints found for "{search}"
          </div>
        )}
      </div>

    </div>
  );
};
