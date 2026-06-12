import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CopyIcon, CheckIcon, BookIcon, SendIcon, DeviceIcon } from '../components/Icons';

const S: Record<string, React.CSSProperties> = {
  container: { maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' },
  card: { background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '24px', boxShadow: 'var(--shadow-soft)', minWidth: 0 },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' },
  badge: { padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' },
  paramTable: { width: '100%', fontSize: '13px', borderCollapse: 'collapse', textAlign: 'left', marginTop: '8px' },
  th: { padding: '8px 12px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', fontWeight: 600, color: '#64748B' },
  td: { padding: '10px 12px', borderBottom: '1px solid #F1F5F9', color: '#0F172A', verticalAlign: 'top' },
  codeContainer: { background: '#0F172A', borderRadius: '12px', padding: '20px', color: '#F8FAFC', fontFamily: 'var(--font-mono)', fontSize: '13px', lineHeight: '1.6', overflowX: 'auto' },
  label: { display: 'block', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' },
};

const METHOD_STYLES: Record<string, { bg: string; color: string }> = {
  GET: { bg: '#E0F2FE', color: '#0369A1' },
  POST: { bg: '#D1FAE5', color: '#047857' },
  DELETE: { bg: '#FEE2E2', color: '#B91C1C' },
};

const CodeBlock = ({ title, code }: { title: string; code: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</span>
        <button 
          onClick={handleCopy} 
          style={{ background: 'none', border: 'none', color: copied ? '#10B981' : '#7C3AED', fontWeight: 700, fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          {copied ? <CheckIcon size={12} color="#10B981" /> : <CopyIcon size={12} color="#7C3AED" />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <div style={S.codeContainer}>
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontFamily: 'var(--font-mono)' }}>{code}</pre>
      </div>
    </div>
  );
};

interface IEndpoint {
  method: string;
  path: string;
  title: string;
  desc: string;
  params?: { name: string; type: string; req: boolean; desc: string }[];
  reqExample: { title: string; code: string };
  resExample: { title: string; code: string };
}

const EndpointDoc = ({ method, path, title, desc, params, reqExample, resExample }: IEndpoint) => {
  const mStyle = METHOD_STYLES[method] || METHOD_STYLES.GET;
  return (
    <div style={{ ...S.card, display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title / Badges */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ ...S.badge, ...mStyle }}>{method}</span>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>{title}</h3>
        </div>
        <div style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', background: '#F8FAFC', padding: '6px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', color: '#334155', wordBreak: 'break-all' }}>
          {import.meta.env.VITE_API_URL}{path}
        </div>
      </div>

      <p style={{ margin: 0, fontSize: '14px', color: '#64748B', lineHeight: '1.6', fontWeight: 500 }}>{desc}</p>

      {/* Two Column Layout: Specs vs Code */}
      <div className="api-doc-grid">
        {/* Left Column: Specs / Parameters */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
          {params && params.length > 0 ? (
            <div>
              <span style={S.label}>Parameters</span>
              <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
                <table style={S.paramTable}>
                  <thead>
                    <tr>
                      <th style={S.th}>Name</th>
                      <th style={S.th}>Type</th>
                      <th style={S.th}>Required</th>
                      <th style={S.th}>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {params.map(p => (
                      <tr key={p.name}>
                        <td style={{ ...S.td, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{p.name}</td>
                        <td style={{ ...S.td, color: '#7C3AED', fontWeight: 600 }}>{p.type}</td>
                        <td style={S.td}>
                          {p.req ? (
                            <span style={{ color: '#EF4444', fontWeight: 700 }}>Yes</span>
                          ) : (
                            <span style={{ color: '#94A3B8', fontWeight: 500 }}>No</span>
                          )}
                        </td>
                        <td style={{ ...S.td, color: '#64748B', fontWeight: 500 }}>{p.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div style={{ padding: '24px', textAlign: 'center', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', color: '#94A3B8', fontSize: '13px', fontWeight: 500 }}>
              No parameters required.
            </div>
          )}
        </div>

        {/* Right Column: Code examples */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
          <CodeBlock title={reqExample.title} code={reqExample.code} />
          <CodeBlock title={resExample.title} code={resExample.code} />
        </div>
      </div>
    </div>
  );
};

export const ApiDocs = () => {
  const [apiKey, setApiKey] = useState<string>('Loading...');
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
    fetch(`${import.meta.env.VITE_API_URL}/api/me`, { headers }).then(r => {
      if (r.status === 401) { navigate('/login'); return; }
      r.json().then(d => setApiKey(d.apiKey));
    });
  }, [navigate]);

  const copyKey = () => {
    navigator.clipboard.writeText(apiKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const messagingEndpoints: IEndpoint[] = [
    {
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
        code: JSON.stringify({
          api_key: "YOUR_SECRET_API_KEY",
          instance_id: "INSTANCE_ID",
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
      method: 'GET',
      path: '/api/message/send',
      title: 'Send Message (GET Webhook)',
      desc: 'Send plain text or media messages using simple query URL parameters. Ideal for Zapier/webhooks integrations.',
      params: [
        { name: 'api_key', type: 'string', req: true, desc: 'Your Secrets API Key.' },
        { name: 'instance_id', type: 'string', req: true, desc: 'Linked instance ID.' },
        { name: 'number', type: 'string', req: true, desc: 'Recipient phone number (e.g., 919876543210).' },
        { name: 'message', type: 'string', req: false, desc: 'Plain text message content.' },
        { name: 'media_url', type: 'string', req: false, desc: 'Public URL to file attachment.' },
        { name: 'filename', type: 'string', req: false, desc: 'Attachment filename.' }
      ],
      reqExample: {
        title: 'GET REQUEST URL',
        code: `GET ${import.meta.env.VITE_API_URL}/api/message/send?api_key=YOUR_KEY&instance_id=INST_ID&number=919876543210&message=Hello+Standard+Text`
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
      method: 'POST',
      path: '/api/message/send-interactive',
      title: 'Send Interactive Message (Buttons)',
      desc: 'Send rich interactive messages featuring text/image headers, footers, and up to 3 quick reply or CTA (URL/Call) buttons.',
      params: [
        { name: 'api_key', type: 'string', req: true, desc: 'Your Secrets API Key.' },
        { name: 'instance_id', type: 'string', req: true, desc: 'Linked instance ID.' },
        { name: 'number', type: 'string', req: true, desc: 'Recipient phone number (e.g., 919876543210).' },
        { name: 'interactive', type: 'object', req: true, desc: 'Interactive payload configs.' },
        { name: 'interactive.headerType', type: 'string', req: false, desc: '"none" | "text" | "image"' },
        { name: 'interactive.headerText', type: 'string', req: false, desc: 'Header text label.' },
        { name: 'interactive.headerImageUrl', type: 'string', req: false, desc: 'Header banner image link.' },
        { name: 'interactive.body', type: 'string', req: true, desc: 'Main text message content.' },
        { name: 'interactive.footer', type: 'string', req: false, desc: 'Subtext footer description.' },
        { name: 'interactive.buttons', type: 'array', req: true, desc: 'Up to 3 button configurations: type ("quick_reply" | "cta_url" | "cta_call"), label, and type properties.' }
      ],
      reqExample: {
        title: 'POST REQUEST JSON BODY',
        code: JSON.stringify({
          api_key: "YOUR_SECRET_API_KEY",
          instance_id: "INSTANCE_ID",
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
      method: 'GET',
      path: '/api/message/status',
      title: 'Check Message Status',
      desc: 'Verify if a queued message was successfully sent, failed, or was a Non-Whatsapp number.',
      params: [
        { name: 'api_key', type: 'string', req: true, desc: 'Your Secrets API Key.' },
        { name: 'message_id', type: 'string', req: true, desc: 'The message_id returned when you sent the message.' }
      ],
      reqExample: {
        title: 'GET REQUEST URL',
        code: `GET ${import.meta.env.VITE_API_URL}/api/message/status?api_key=YOUR_KEY&message_id=75e01b44-934c-4235-b283-abcdef123456`
      },
      resExample: {
        title: 'RESPONSE JSON',
        code: JSON.stringify({
          success: true,
          message_id: "75e01b44-934c-4235-b283-abcdef123456",
          number: "919876543210",
          status: "Non-Whatsapp",
          created_at: "2024-06-12T12:00:00.000Z"
        }, null, 2)
      }
    }
  ];

  const sdkEndpoints: IEndpoint[] = [
    {
      method: 'POST',
      path: '/api/client/instance/create',
      title: 'Programmatic Create Instance',
      desc: 'Creates a brand new initializing instance session under your account.',
      params: [
        { name: 'api_key', type: 'string', req: true, desc: 'Your Secrets API Key.' }
      ],
      reqExample: {
        title: 'POST REQUEST URL',
        code: `POST ${import.meta.env.VITE_API_URL}/api/client/instance/create?api_key=YOUR_SECRET_API_KEY`
      },
      resExample: {
        title: 'RESPONSE JSON',
        code: JSON.stringify({
          instance_id: "ABCDEF"
        }, null, 2)
      }
    },
    {
      method: 'GET',
      path: '/api/client/instance/qr',
      title: 'Fetch Connection QR Code',
      desc: 'Poll this endpoint every 3 seconds to fetch the active Base64 QR code payload to link WhatsApp to the instance.',
      params: [
        { name: 'api_key', type: 'string', req: true, desc: 'Your Secrets API Key.' },
        { name: 'instance_id', type: 'string', req: true, desc: 'Initializing instance ID.' }
      ],
      reqExample: {
        title: 'GET REQUEST URL',
        code: `GET ${import.meta.env.VITE_API_URL}/api/client/instance/qr?api_key=YOUR_KEY&instance_id=ABCDEF`
      },
      resExample: {
        title: 'RESPONSE JSON',
        code: JSON.stringify({
          qr: "data:image/png;base64,iVBORw0KGgoAAA..."
        }, null, 2)
      }
    },
    {
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
        code: `GET ${import.meta.env.VITE_API_URL}/api/client/instance/status?api_key=YOUR_KEY&instance_id=ABCDEF`
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
        code: `POST ${import.meta.env.VITE_API_URL}/api/client/instance/logout?api_key=YOUR_KEY&instance_id=ABCDEF`
      },
      resExample: {
        title: 'RESPONSE JSON',
        code: JSON.stringify({
          success: true,
          message: "Instance logged out successfully"
        }, null, 2)
      }
    },
    {
      method: 'DELETE',
      path: '/api/client/instance/delete',
      title: 'Delete Instance Session',
      desc: 'Permanently remove the instance session from the server database and clear cached session directories.',
      params: [
        { name: 'api_key', type: 'string', req: true, desc: 'Your Secrets API Key.' },
        { name: 'instance_id', type: 'string', req: true, desc: 'Target instance ID.' }
      ],
      reqExample: {
        title: 'DELETE REQUEST URL',
        code: `DELETE ${import.meta.env.VITE_API_URL}/api/client/instance/delete?api_key=YOUR_KEY&instance_id=ABCDEF`
      },
      resExample: {
        title: 'RESPONSE JSON',
        code: JSON.stringify({
          success: true,
          message: "Instance deleted"
        }, null, 2)
      }
    }
  ];

  return (
    <div className="animate-in" style={S.container}>
      {/* Top Banner: Page Intro & API Key Display */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>Developer API Reference</h2>
          <p style={{ color: '#64748B', fontSize: '14px', margin: 0, fontWeight: 500 }}>
            Use the following HTTP client endpoints to programmatically manage WhatsApp instances and dispatch text, media, or interactive button templates.
          </p>
        </div>

        {/* API Details Panel */}
        <div style={{ ...S.card, display: 'flex', flexDirection: 'column', gap: '20px', background: 'linear-gradient(135deg, #1e1b4b, #312e81)', border: 'none', color: '#FFFFFF' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookIcon size={24} color="#FBBF24" />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>Secrets Key & Integration Credentials</h4>
              <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#94A3B8', fontWeight: 500 }}>
                Base Request URL: <code style={{ color: '#FBBF24', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{import.meta.env.VITE_API_URL}</code>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '14px 18px' }}>
            <code style={{ flex: 1, fontSize: '14px', fontFamily: 'var(--font-mono)', color: '#FBBF24', fontWeight: 700, letterSpacing: '0.05em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {apiKey}
            </code>
            <button onClick={copyKey} style={{
              background: copied ? '#10B981' : 'rgba(255, 255, 255, 0.1)', border: 'none', borderRadius: '8px',
              padding: '8px 14px', color: 'white', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s', flexShrink: 0
            }}>
              {copied ? <CheckIcon size={14} color="white" /> : <CopyIcon size={14} color="white" />}
              {copied ? 'Copied!' : 'Copy Key'}
            </button>
          </div>
        </div>
      </div>

      {/* Section 1: Messaging APIs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ borderBottom: '2px solid #E2E8F0', paddingBottom: '8px', marginTop: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <SendIcon size={20} color="#7C3AED" /> Messaging Integration APIs
          </h3>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {messagingEndpoints.map(ep => (
            <EndpointDoc key={ep.method + ep.path} {...ep} />
          ))}
        </div>
      </div>

      {/* Section 2: Instance APIs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ borderBottom: '2px solid #E2E8F0', paddingBottom: '8px', marginTop: '24px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <DeviceIcon size={20} color="#7C3AED" /> Instance Management SDK
          </h3>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {sdkEndpoints.map(ep => (
            <EndpointDoc key={ep.method + ep.path} {...ep} />
          ))}
        </div>
      </div>
    </div>
  );
};
