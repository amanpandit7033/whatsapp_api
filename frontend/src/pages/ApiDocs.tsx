import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  GlassDocsIcon,
  GlassBookIcon,
  GlassSendIcon,
  GlassInstanceIcon,
  GlassDeviceIcon,
  GlassSearchIcon,
  GlassUsersGroupIcon,
  GlassRefreshIcon,
  GlassCopyIcon,
  GlassCheckCircleIcon
} from '../components/GlassIcons';
import { copyToClipboard } from '../utils/clipboard';
import { getBaseApiUrl } from '../utils/apiUrl';

const METHOD_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  GET: { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  POST: { bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
  DELETE: { bg: '#FEF2F2', color: '#DC2626', border: '#FEE2E2' },
};

interface ICodeTab {
  language: string;
  label: string;
  code: string;
}

const CodeViewer = ({ tabs, defaultTab = 0, title }: { tabs: ICodeTab[]; defaultTab?: number; title?: string }) => {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [copied, setCopied] = useState(false);

  const currentTab = tabs[activeTab] || tabs[0];

  const handleCopy = async () => {
    if (!currentTab) return;
    const success = await copyToClipboard(currentTab.code);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div style={{ borderRadius: '14px', overflow: 'hidden', border: '1px solid #334155', background: '#0F172A', boxShadow: '0 10px 30px rgba(0,0,0,0.15)' }}>
      {/* Editor Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', padding: '8px 14px', background: '#1E293B', borderBottom: '1px solid #334155' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {tabs.length > 1 ? (
            <div style={{ display: 'flex', background: '#0F172A', padding: '3px', borderRadius: '8px', gap: '2px' }}>
              {tabs.map((t, idx) => (
                <button
                  key={t.label}
                  onClick={() => setActiveTab(idx)}
                  style={{
                    border: 'none',
                    background: activeTab === idx ? '#3B82F6' : 'transparent',
                    color: activeTab === idx ? '#FFFFFF' : '#94A3B8',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          ) : (
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
              {title || currentTab.label}
            </span>
          )}
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
          {copied ? <GlassCheckCircleIcon size={13} /> : <GlassCopyIcon size={13} />}
          {copied ? 'Copied!' : 'Copy Code'}
        </button>
      </div>

      {/* Code Text Area */}
      <div style={{ padding: '16px 18px', color: '#F8FAFC', fontFamily: 'var(--font-mono)', fontSize: '12px', lineHeight: '1.6', overflowX: 'auto', maxHeight: '380px' }} className="custom-scrollbar">
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{currentTab.code}</pre>
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
  snippets: ICodeTab[];
  resExample: { title: string; code: string };
}

const EndpointDoc = ({ method, path, title, desc, params, snippets, resExample, baseApiUrl }: IEndpoint & { baseApiUrl: string }) => {
  const mStyle = METHOD_STYLES[method] || METHOD_STYLES.GET;
  return (
    <div className="card" style={{ padding: '24px', borderRadius: '18px', display: 'flex', flexDirection: 'column', gap: '20px', border: '1px solid #E2E8F0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', transition: 'all 0.2s ease', background: '#FFFFFF' }}>
      {/* Title / Badges */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ background: mStyle.bg, color: mStyle.color, border: `1px solid ${mStyle.border}`, padding: '5px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 800, letterSpacing: '0.04em' }}>
            {method}
          </span>
          <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.01em' }}>{title}</h3>
        </div>
        <div style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', background: '#F8FAFC', padding: '6px 14px', borderRadius: '10px', border: '1px solid #E2E8F0', color: '#334155', fontWeight: 700, wordBreak: 'break-all' }}>
          {baseApiUrl}{path}
        </div>
      </div>

      <p style={{ margin: 0, fontSize: '14px', color: '#64748B', lineHeight: '1.6', fontWeight: 500 }}>{desc}</p>

      {/* Grid: Parameters vs Code Examples */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
        {/* Left Column: Specs / Parameters */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Parameters & Inputs</span>
          {params && params.length > 0 ? (
            <div style={{ border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden', background: '#FFFFFF' }}>
              <table style={{ width: '100%', fontSize: '12.5px', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                    <th style={{ padding: '10px 12px', fontWeight: 700, color: '#475569', fontSize: '11px' }}>PARAMETER</th>
                    <th style={{ padding: '10px 12px', fontWeight: 700, color: '#475569', fontSize: '11px' }}>TYPE</th>
                    <th style={{ padding: '10px 12px', fontWeight: 700, color: '#475569', fontSize: '11px' }}>DESCRIPTION</th>
                  </tr>
                </thead>
                <tbody>
                  {params.map(p => (
                    <tr key={p.name} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#0F172A', fontSize: '12px' }}>{p.name}</div>
                        {p.req ? (
                          <span style={{ display: 'inline-block', marginTop: '2px', background: '#FEF2F2', color: '#DC2626', fontSize: '9.5px', fontWeight: 800, padding: '1px 5px', borderRadius: '4px' }}>REQUIRED</span>
                        ) : (
                          <span style={{ display: 'inline-block', marginTop: '2px', background: '#F1F5F9', color: '#64748B', fontSize: '9.5px', fontWeight: 600, padding: '1px 5px', borderRadius: '4px' }}>OPTIONAL</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px', color: '#7C3AED', fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: '11.5px', verticalAlign: 'top' }}>
                        {p.type}
                      </td>
                      <td style={{ padding: '10px 12px', color: '#475569', fontWeight: 500, fontSize: '12px', lineHeight: '1.5', verticalAlign: 'top' }}>
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

        {/* Right Column: Code snippets (Multi-language) & Response */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', minWidth: 0 }}>
          <CodeViewer tabs={snippets} />
          <CodeViewer tabs={[{ label: 'RESPONSE JSON', language: 'json', code: resExample.code }]} title={resExample.title} />
        </div>
      </div>
    </div>
  );
};

export const ApiDocs = () => {
  const [apiKey, setApiKey] = useState<string>('Loading...');
  const [instances, setInstances] = useState<any[]>([]);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedInst, setCopiedInst] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'messaging' | 'groups' | 'instance' | 'public'>('all');
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const baseApiUrl = getBaseApiUrl();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/login'); return; }
    const headers = { 'Authorization': `Bearer ${token}` };

    // Fetch user details (API Key)
    fetch(`${import.meta.env.VITE_API_URL || ''}/api/me`, { headers }).then(r => {
      if (r.status === 401) { navigate('/login'); return; }
      r.json().then(d => {
        if (d.apiKey) setApiKey(d.apiKey);
      });
    }).catch(() => {});

    // Fetch user instances
    fetch(`${import.meta.env.VITE_API_URL || ''}/api/instances`, { headers }).then(r => {
      if (r.ok) {
        r.json().then(d => {
          const instList = d.instances || [];
          setInstances(instList);
          const connected = instList.find((i: any) => i.status === 'connected');
          if (connected) {
            setSelectedInstanceId(connected.id);
          } else if (instList.length > 0) {
            setSelectedInstanceId(instList[0].id);
          }
        });
      }
    }).catch(() => {});
  }, [navigate]);

  const activeInstanceId = selectedInstanceId || (instances[0]?.id || 'YOUR_INSTANCE_ID');

  const copyKey = async () => {
    const success = await copyToClipboard(apiKey);
    if (success) {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const copyInst = async () => {
    const success = await copyToClipboard(activeInstanceId);
    if (success) {
      setCopiedInst(true);
      setTimeout(() => setCopiedInst(false), 2000);
    }
  };

  const copyApiUrl = async () => {
    const url = `${baseApiUrl}/api/send?number=91XXXXXXXXXX&type=text&message=Hello+World&instance_id=${activeInstanceId}&access_token=${apiKey}`;
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
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/me/regenerate-token`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (data.apiKey) setApiKey(data.apiKey);
    } catch { alert('Failed to regenerate token'); }
    setRegenerating(false);
  };

  const allEndpoints: IEndpoint[] = [
    // 0. Dedicated High-Priority OTP & Authentication API (POST /api/send/otp)
    {
      category: 'messaging',
      method: 'POST',
      path: '/api/send/otp',
      title: 'Send OTP & 2FA Code (High-Priority Anti-Ban & Multi-SIM Pool)',
      desc: 'Dedicated high-speed endpoint for Authentication OTPs and custom login codes. Clients can pass any custom message template of their choice (supporting {{otp}} variables). Includes Multi-SIM load balancing with auto-failover, invisible anti-hash protection, and optional 1-tap "Copy Code" interactive button.',
      params: [
        { name: 'number', type: 'string', req: true, desc: 'Recipient phone number with country code (e.g. 91XXXXXXXXXX).' },
        { name: 'message', type: 'string', req: false, desc: 'Your custom message template (e.g. "Your verification code is: {{otp}}. Do not share with anyone.").' },
        { name: 'otp', type: 'string', req: false, desc: 'The 4-8 digit verification code (e.g. "849201"). Automatically substitutes {{otp}} in message.' },
        { name: 'copy_button', type: 'boolean', req: false, desc: 'Set to true to attach an interactive 1-tap "Copy Code" button.' },
        { name: 'copy_button_label', type: 'string', req: false, desc: 'Button display text (default: "Copy Code").' },
        { name: 'footer', type: 'string', req: false, desc: 'Optional subtle footer text.' },
        { name: 'pool', type: 'string', req: false, desc: 'Name or slug of your created SIM pool (e.g. "marketing", "otp-gateway"). The gateway rotates across all SIMs in this pool automatically.' },
        { name: 'instance_id', type: 'string', req: false, desc: 'Single specific WhatsApp instance ID (optional).' },
        { name: 'api_key', type: 'string', req: true, desc: 'API Key (or pass in x-api-key / Bearer header).' },
      ],
      snippets: [
        {
          label: 'cURL',
          language: 'bash',
          code: `curl -X POST "${baseApiUrl}/api/send/otp" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${apiKey}" \\
  -d '{
    "number": "91XXXXXXXXXX",
    "otp": "849201",
    "message": "*AcmeCorp Security*\nYour login OTP is: *{{otp}}*\n\nValid for 5 minutes. Do not share this code.",
    "copy_button": true,
    "footer": "Sent via Acme Secure Portal"
  }'`
        },
        {
          label: 'Node.js',
          language: 'javascript',
          code: `const axios = require('axios');

async function sendWhatsAppOtp() {
  const response = await axios.post('${baseApiUrl}/api/send/otp', {
    number: '91XXXXXXXXXX',
    otp: '849201',
    message: 'Your verification code is: {{otp}}',
    copy_button: true
  }, {
    headers: { 'x-api-key': '${apiKey}' }
  });

  console.log(response.data);
}

sendWhatsAppOtp();`
        },
        {
          label: 'Python',
          language: 'python',
          code: `import requests

url = "${baseApiUrl}/api/send/otp"
headers = {"x-api-key": "${apiKey}", "Content-Type": "application/json"}
payload = {
    "number": "91XXXXXXXXXX",
    "otp": "849201",
    "message": "Your verification code is: {{otp}}",
    "copy_button": True
}

response = requests.post(url, json=payload, headers=headers)
print(response.json())`
        },
        {
          label: 'PHP (cURL)',
          language: 'php',
          code: `<?php
$curl = curl_init();

$payload = json_encode([
    "number" => "91XXXXXXXXXX",
    "otp" => "849201",
    "message" => "Your verification code is: {{otp}}",
    "copy_button" => true
]);

curl_setopt_array($curl, [
    CURLOPT_URL => "${baseApiUrl}/api/send/otp",
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $payload,
    CURLOPT_HTTPHEADER => [
        "Content-Type: application/json",
        "x-api-key: ${apiKey}"
    ]
]);

$response = curl_exec($curl);
curl_close($curl);
echo $response;`
        },
        {
          label: 'Direct URL (GET)',
          language: 'http',
          code: `${baseApiUrl}/api/send/otp?api_key=${apiKey}&number=91XXXXXXXXXX&otp=849201&message=Your+verification+code+is:+{{otp}}&copy_button=true`
        }
      ],
      resExample: {
        title: 'RESPONSE JSON (< 1s Latency with Multi-SIM Failover)',
        code: JSON.stringify({
          success: true,
          status: "sent",
          has_copy_button: true,
          instance_id: activeInstanceId,
          pool_size: 3,
          message_id: "cm7a920b12345678",
          to: "91XXXXXXXXXX",
          latency_ms: 365,
          timestamp: 1740042710
        }, null, 2)
      }
    },

    // 1. Quick Send API (GET /api/send)
    {
      category: 'messaging',
      method: 'GET',
      path: '/api/send',
      title: 'Quick Send API (1-Click URL & cURL)',
      desc: 'The fastest way to send a WhatsApp message — simply call the URL directly in your browser, cURL, or any webhook without formatting a JSON payload.',
      params: [
        { name: 'number', type: 'string', req: true, desc: 'Recipient phone number with country code (e.g. 91XXXXXXXXXX).' },
        { name: 'message', type: 'string', req: true, desc: 'Message body text (URL-encoded).' },
        { name: 'instance_id', type: 'string', req: false, desc: 'Your connected WhatsApp instance ID (optional if using pool).' },
        { name: 'pool', type: 'string', req: false, desc: 'Name or slug of your Multi-SIM pool (e.g. "marketing", "otp-gateway").' },
        { name: 'access_token', type: 'string', req: true, desc: 'Your API Access Token / API Key.' },
        { name: 'type', type: 'string', req: false, desc: '"text" (default) or "media".' },
        { name: 'media_url', type: 'string', req: false, desc: 'Public URL of file/image/PDF when type=media.' },
      ],
      snippets: [
        {
          label: 'Direct URL (GET)',
          language: 'http',
          code: `${baseApiUrl}/api/send?number=91XXXXXXXXXX&type=text&message=Hello+from+WhatsApp+Gateway&instance_id=${activeInstanceId}&access_token=${apiKey}`
        },
        {
          label: 'cURL',
          language: 'bash',
          code: `curl -X GET "${baseApiUrl}/api/send?number=91XXXXXXXXXX&type=text&message=Hello+from+cURL&instance_id=${activeInstanceId}&access_token=${apiKey}"`
        },
        {
          label: 'Python',
          language: 'python',
          code: `import requests

url = "${baseApiUrl}/api/send"
params = {
    "number": "91XXXXXXXXXX",
    "type": "text",
    "message": "Hello from Python!",
    "instance_id": "${activeInstanceId}",
    "access_token": "${apiKey}"
}

response = requests.get(url, params=params)
print(response.json())`
        },
        {
          label: 'Node.js',
          language: 'javascript',
          code: `const url = "${baseApiUrl}/api/send?number=91XXXXXXXXXX&type=text&message=Hello&instance_id=${activeInstanceId}&access_token=${apiKey}";

fetch(url)
  .then(res => res.json())
  .then(data => console.log(data));`
        },
        {
          label: 'PHP',
          language: 'php',
          code: `<?php
$url = "${baseApiUrl}/api/send?" . http_build_query([
    "number" => "91XXXXXXXXXX",
    "type" => "text",
    "message" => "Hello from PHP!",
    "instance_id" => "${activeInstanceId}",
    "access_token" => "${apiKey}"
]);

$response = file_get_contents($url);
echo $response;`
        }
      ],
      resExample: {
        title: 'RESPONSE JSON',
        code: JSON.stringify({
          status: "success",
          message: "Message queued",
          messageTimestamp: "1786498000"
        }, null, 2)
      }
    },

    // 2. Send Message (POST /api/message/send)
    {
      category: 'messaging',
      method: 'POST',
      path: '/api/message/send',
      title: 'Send Message (JSON Body & Direct URL)',
      desc: 'Send a plain text message or media attachment via standard HTTP POST with JSON body, or directly via GET URL in browser/webhook.',
      params: [
        { name: 'api_key', type: 'string', req: true, desc: 'Your Secrets API Key (or pass in access_token / Bearer header).' },
        { name: 'instance_id', type: 'string', req: true, desc: 'Your linked WhatsApp Instance ID.' },
        { name: 'number', type: 'string', req: true, desc: 'Recipient phone number with country code (e.g. 91XXXXXXXXXX).' },
        { name: 'message', type: 'string', req: false, desc: 'Plain text message content or caption.' },
        { name: 'media_url', type: 'string', req: false, desc: 'Direct URL to PDF, Image, Video, or Audio file.' },
        { name: 'filename', type: 'string', req: false, desc: 'Custom display filename for documents (e.g. invoice.pdf).' }
      ],
      snippets: [
        {
          label: 'Direct URL (GET)',
          language: 'http',
          code: `${baseApiUrl}/api/message/send?number=91XXXXXXXXXX&message=Hello+from+Direct+URL&instance_id=${activeInstanceId}&api_key=${apiKey}`
        },
        {
          label: 'cURL (Postman)',
          language: 'bash',
          code: `curl -X POST "${baseApiUrl}/api/message/send" \\
  -H "Content-Type: application/json" \\
  -d '{
    "api_key": "${apiKey}",
    "instance_id": "${activeInstanceId}",
    "number": "91XXXXXXXXXX",
    "message": "Hello from Postman!"
  }'`
        },
        {
          label: 'JSON Payload',
          language: 'json',
          code: JSON.stringify({
            api_key: apiKey,
            instance_id: activeInstanceId,
            number: "91XXXXXXXXXX",
            message: "Hello from API!"
          }, null, 2)
        },
        {
          label: 'Python',
          language: 'python',
          code: `import requests

url = "${baseApiUrl}/api/message/send"
payload = {
    "api_key": "${apiKey}",
    "instance_id": "${activeInstanceId}",
    "number": "91XXXXXXXXXX",
    "message": "Hello from Python!"
}

response = requests.post(url, json=payload)
print(response.json())`
        },
        {
          label: 'Node.js',
          language: 'javascript',
          code: `fetch("${baseApiUrl}/api/message/send", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    api_key: "${apiKey}",
    instance_id: "${activeInstanceId}",
    number: "91XXXXXXXXXX",
    message: "Hello from Node.js!"
  })
})
.then(res => res.json())
.then(data => console.log(data));`
        },
        {
          label: 'PHP',
          language: 'php',
          code: `<?php
$curl = curl_init();
curl_setopt_array($curl, [
  CURLOPT_URL => "${baseApiUrl}/api/message/send",
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_POST => true,
  CURLOPT_POSTFIELDS => json_encode([
    "api_key" => "${apiKey}",
    "instance_id" => "${activeInstanceId}",
    "number" => "91XXXXXXXXXX",
    "message" => "Hello from PHP!"
  ]),
  CURLOPT_HTTPHEADER => ["Content-Type: application/json"],
]);
$response = curl_exec($curl);
curl_close($curl);
echo $response;`
        }
      ],
      resExample: {
        title: 'RESPONSE JSON',
        code: JSON.stringify({
          success: true,
          message: "Message queued",
          message_id: "c8f12a34-5b67-4890-a1b2-c3d4e5f67890"
        }, null, 2)
      }
    },

    // 3. Send Media & Attachments (POST & GET /api/send)
    {
      category: 'messaging',
      method: 'POST',
      path: '/api/send',
      title: 'Send Media, Images & PDF Documents',
      desc: 'Send PDFs, images (JPG/PNG), videos (MP4), or audio files directly to WhatsApp with custom captions and file names via POST JSON or direct GET URL.',
      params: [
        { name: 'access_token', type: 'string', req: true, desc: 'Your API Access Token / API Key.' },
        { name: 'instance_id', type: 'string', req: true, desc: 'Your linked WhatsApp Instance ID.' },
        { name: 'number', type: 'string', req: true, desc: 'Recipient phone number (e.g. 91XXXXXXXXXX).' },
        { name: 'type', type: 'string', req: true, desc: 'Must be set to "media".' },
        { name: 'media_url', type: 'string', req: true, desc: 'Public HTTPS direct URL of media or document.' },
        { name: 'filename', type: 'string', req: false, desc: 'Display filename (e.g. Invoice_August_2026.pdf).' },
        { name: 'message', type: 'string', req: false, desc: 'Optional caption text under the attachment.' }
      ],
      snippets: [
        {
          label: 'Direct URL (GET)',
          language: 'http',
          code: `${baseApiUrl}/api/send?number=91XXXXXXXXXX&type=media&media_url=https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf&filename=Invoice.pdf&message=Your+Invoice&instance_id=${activeInstanceId}&access_token=${apiKey}`
        },
        {
          label: 'cURL',
          language: 'bash',
          code: `curl -X POST "${baseApiUrl}/api/send" \\
  -H "Content-Type: application/json" \\
  -d '{
    "access_token": "${apiKey}",
    "instance_id": "${activeInstanceId}",
    "number": "91XXXXXXXXXX",
    "type": "media",
    "media_url": "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    "filename": "Invoice.pdf",
    "message": "Here is your invoice for this month!"
  }'`
        },
        {
          label: 'JSON Payload',
          language: 'json',
          code: JSON.stringify({
            access_token: apiKey,
            instance_id: activeInstanceId,
            number: "91XXXXXXXXXX",
            type: "media",
            media_url: "https://example.com/invoice.pdf",
            filename: "Invoice.pdf",
            message: "Here is your invoice!"
          }, null, 2)
        },
        {
          label: 'Python',
          language: 'python',
          code: `import requests

url = "${baseApiUrl}/api/send"
payload = {
    "access_token": "${apiKey}",
    "instance_id": "${activeInstanceId}",
    "number": "91XXXXXXXXXX",
    "type": "media",
    "media_url": "https://example.com/invoice.pdf",
    "filename": "Invoice.pdf",
    "message": "Here is your monthly invoice!"
}

res = requests.post(url, json=payload)
print(res.json())`
        }
      ],
      resExample: {
        title: 'RESPONSE JSON',
        code: JSON.stringify({
          status: "success",
          message: "Message queued",
          messageTimestamp: "1786498120"
        }, null, 2)
      }
    },

    // 4. Interactive Buttons (POST & GET /api/send-button)
    {
      category: 'messaging',
      method: 'POST',
      path: '/api/send-button',
      title: 'Send Interactive Buttons & CTA Messages',
      desc: 'Send rich interactive messages featuring text/image headers, body, footers, and up to 3 clickable buttons (Quick Reply, Website Link, or Phone Call). Usable via Direct URL or JSON payload.',
      params: [
        { name: 'api_key', type: 'string', req: true, desc: 'Your Secrets API Key (or access_token).' },
        { name: 'instance_id', type: 'string', req: true, desc: 'Your connected Instance ID.' },
        { name: 'number', type: 'string', req: true, desc: 'Recipient phone number (e.g. 91XXXXXXXXXX).' },
        { name: 'message', type: 'string', req: true, desc: 'Main text message content.' },
        { name: 'url_btn', type: 'string', req: false, desc: 'URL Button format: "Label|https://website.com"' },
        { name: 'call_btn', type: 'string', req: false, desc: 'Call Button format: "Label|+91XXXXXXXXXX"' },
        { name: 'reply_btn', type: 'string', req: false, desc: 'Quick Reply button text label.' }
      ],
      snippets: [
        {
          label: 'Direct URL (GET)',
          language: 'http',
          code: `${baseApiUrl}/api/send-button?number=91XXXXXXXXXX&message=Exclusive+Special+Offer!&header=Special+Deal&footer=Powered+by+Gateway&url_btn=Visit+Website|${baseApiUrl}&call_btn=Call+Support|+91XXXXXXXXXX&reply_btn=Claim+Discount&instance_id=${activeInstanceId}&api_key=${apiKey}`
        },
        {
          label: 'cURL (JSON Payload)',
          language: 'bash',
          code: `curl -X POST "${baseApiUrl}/api/message/send-interactive" \\
  -H "Content-Type: application/json" \\
  -d '{
    "api_key": "${apiKey}",
    "instance_id": "${activeInstanceId}",
    "number": "91XXXXXXXXXX",
    "interactive": {
      "headerType": "text",
      "headerText": "Exclusive Special Offer!",
      "body": "Tap one of the options below to explore our services or connect with our support team:",
      "footer": "Powered by WhatsApp Gateway",
      "buttons": [
        { "type": "cta_url", "label": "Visit Portal", "url": "${baseApiUrl}" },
        { "type": "cta_call", "label": "Call Support", "phone": "+91XXXXXXXXXX" },
        { "type": "quick_reply", "label": "Help & FAQs", "id": "btn_help" }
      ]
    }
  }'`
        },
        {
          label: 'JSON Payload',
          language: 'json',
          code: JSON.stringify({
            api_key: apiKey,
            instance_id: activeInstanceId,
            number: "91XXXXXXXXXX",
            interactive: {
              headerType: "text",
              headerText: "Exclusive Special Offer!",
              body: "Tap an option below:",
              footer: "Powered by WhatsApp Gateway",
              buttons: [
                { type: "cta_url", label: "Visit Website", url: baseApiUrl },
                { type: "cta_call", label: "Call Us", phone: "+91XXXXXXXXXX" },
                { type: "quick_reply", label: "Chat Support", id: "chat_support" }
              ]
            }
          }, null, 2)
        }
      ],
      resExample: {
        title: 'RESPONSE JSON',
        code: JSON.stringify({
          success: true,
          message: "Message queued",
          message_id: "75e01b44-934c-4235-b283-abcdef123456"
        }, null, 2)
      }
    },

    // 5. WhatsApp Number Validator API (GET & POST /api/check-number)
    {
      category: 'messaging',
      method: 'POST',
      path: '/api/check-number',
      title: 'WhatsApp Number Filter / Validator API',
      desc: 'Instantly check if single or bulk phone numbers exist and are active on WhatsApp before dispatching messages. Supports single numbers or arrays up to 5,000 numbers.',
      params: [
        { name: 'access_token', type: 'string', req: true, desc: 'Your API Access Token / API Key.' },
        { name: 'instance_id', type: 'string', req: true, desc: 'Your connected WhatsApp instance ID.' },
        { name: 'numbers', type: 'array | string', req: true, desc: 'Single number or array of numbers with country code (e.g. ["91XXXXXXXXXX", "919507066372"]).' },
        { name: 'delay', type: 'number', req: false, desc: 'Delay in milliseconds between checks (default: 100ms).' }
      ],
      snippets: [
        {
          label: 'cURL (Bulk POST)',
          language: 'bash',
          code: `curl -X POST "${baseApiUrl}/api/check-number" \\
  -H "Content-Type: application/json" \\
  -d '{
    "access_token": "${apiKey}",
    "instance_id": "${activeInstanceId}",
    "numbers": ["91XXXXXXXXXX", "919507066372"]
  }'`
        },
        {
          label: 'Direct GET URL (Single Number)',
          language: 'http',
          code: `${baseApiUrl}/api/check-number?number=91XXXXXXXXXX&instance_id=${activeInstanceId}&access_token=${apiKey}`
        },
        {
          label: 'Python',
          language: 'python',
          code: `import requests

url = "${baseApiUrl}/api/check-number"
payload = {
    "access_token": "${apiKey}",
    "instance_id": "${activeInstanceId}",
    "numbers": ["91XXXXXXXXXX", "919507066372"]
}

res = requests.post(url, json=payload)
print(res.json())`
        }
      ],
      resExample: {
        title: 'RESPONSE JSON',
        code: JSON.stringify({
          status: "success",
          total: 2,
          validCount: 1,
          invalidCount: 1,
          results: [
            { number: "91XXXXXXXXXX", exists: true, jid: "91XXXXXXXXXX@s.whatsapp.net" },
            { number: "919507066372", exists: false, jid: null }
          ]
        }, null, 2)
      }
    },

    // 6. Check Message Status (GET /api/message/status)
    {
      category: 'messaging',
      method: 'GET',
      path: '/api/message/status',
      title: 'Check Message Delivery Status',
      desc: 'Verify the delivery status ("sent", "pending", "failed", "Non-Whatsapp") of any dispatched message ID.',
      params: [
        { name: 'api_key', type: 'string', req: true, desc: 'Your Secrets API Key.' },
        { name: 'message_id', type: 'string', req: true, desc: 'The message_id returned when the message was sent.' }
      ],
      snippets: [
        {
          label: 'Direct URL (GET)',
          language: 'http',
          code: `${baseApiUrl}/api/message/status?api_key=${apiKey}&message_id=YOUR_MESSAGE_ID`
        },
        {
          label: 'cURL',
          language: 'bash',
          code: `curl -X GET "${baseApiUrl}/api/message/status?api_key=${apiKey}&message_id=YOUR_MESSAGE_ID"`
        }
      ],
      resExample: {
        title: 'RESPONSE JSON',
        code: JSON.stringify({
          success: true,
          message_id: "c8f12a34-5b67-4890-a1b2-c3d4e5f67890",
          number: "91XXXXXXXXXX",
          status: "sent",
          created_at: new Date().toISOString()
        }, null, 2)
      }
    },

    // 7. Group List API (GET /api/group_list)
    {
      category: 'groups',
      method: 'GET',
      path: '/api/group_list',
      title: 'List All WhatsApp Groups',
      desc: 'Retrieves all WhatsApp groups the connected instance is currently a member or admin of, with group JIDs, titles, member counts, and announcement permissions.',
      params: [
        { name: 'access_token', type: 'string', req: true, desc: 'Your API Access Token / API Key.' },
        { name: 'instance_id', type: 'string', req: true, desc: 'Your connected WhatsApp instance ID.' },
      ],
      snippets: [
        {
          label: 'Direct URL (GET)',
          language: 'http',
          code: `${baseApiUrl}/api/group_list?instance_id=${activeInstanceId}&access_token=${apiKey}`
        },
        {
          label: 'cURL',
          language: 'bash',
          code: `curl -X GET "${baseApiUrl}/api/group_list?instance_id=${activeInstanceId}&access_token=${apiKey}"`
        }
      ],
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
              isAnnounce: false
            }
          ]
        }, null, 2)
      }
    },

    // 8. Group Members API (GET /api/group_participants)
    {
      category: 'groups',
      method: 'GET',
      path: '/api/group_participants',
      title: 'Fetch Group Participants & Admins',
      desc: 'Extract member phone numbers, admin statuses, and metadata for any specific WhatsApp group JID.',
      params: [
        { name: 'access_token', type: 'string', req: true, desc: 'Your API Access Token / API Key.' },
        { name: 'instance_id', type: 'string', req: true, desc: 'Your connected WhatsApp instance ID.' },
        { name: 'group_id', type: 'string', req: true, desc: 'Target Group JID (e.g. 120363405275458276@g.us).' }
      ],
      snippets: [
        {
          label: 'Direct URL (GET)',
          language: 'http',
          code: `${baseApiUrl}/api/group_participants?instance_id=${activeInstanceId}&group_id=120363405275458276@g.us&access_token=${apiKey}`
        },
        {
          label: 'cURL',
          language: 'bash',
          code: `curl -X GET "${baseApiUrl}/api/group_participants?instance_id=${activeInstanceId}&group_id=120363405275458276@g.us&access_token=${apiKey}"`
        }
      ],
      resExample: {
        title: 'RESPONSE JSON',
        code: JSON.stringify({
          status: "success",
          group: {
            id: "120363405275458276@g.us",
            subject: "VIP Customers Club",
            participantsCount: 3,
            participants: [
              { id: "140415768506447@lid", number: "919905264689", admin: "admin" },
              { id: "247463751487539@lid", number: "919507066372", admin: "admin" }
            ]
          }
        }, null, 2)
      }
    },

    // 9. Send Group Message (POST /api/send_group)
    {
      category: 'groups',
      method: 'POST',
      path: '/api/send_group',
      title: 'Send Message / Media to WhatsApp Group',
      desc: 'Send an announcement, notification, image, or document directly to a WhatsApp Group JID.',
      params: [
        { name: 'access_token', type: 'string', req: true, desc: 'Your API Access Token / API Key.' },
        { name: 'instance_id', type: 'string', req: true, desc: 'Your connected WhatsApp instance ID.' },
        { name: 'group_id', type: 'string', req: true, desc: 'Target Group JID (e.g. 120363405275458276@g.us).' },
        { name: 'message', type: 'string', req: true, desc: 'Text message content or caption.' },
        { name: 'type', type: 'string', req: false, desc: '"text" (default) or "media".' },
        { name: 'media_url', type: 'string', req: false, desc: 'Direct URL to media when type=media.' }
      ],
      snippets: [
        {
          label: 'cURL',
          language: 'bash',
          code: `curl -X POST "${baseApiUrl}/api/send_group" \\
  -H "Content-Type: application/json" \\
  -d '{
    "access_token": "${apiKey}",
    "instance_id": "${activeInstanceId}",
    "group_id": "120363405275458276@g.us",
    "type": "text",
    "message": "Hello everyone! This is an automated announcement."
  }'`
        },
        {
          label: 'Direct URL (GET)',
          language: 'http',
          code: `${baseApiUrl}/api/send_group?group_id=120363405275458276@g.us&type=text&message=Hello+Team&instance_id=${activeInstanceId}&access_token=${apiKey}`
        }
      ],
      resExample: {
        title: 'RESPONSE JSON',
        code: JSON.stringify({
          status: "success",
          message: "Message sent to group",
          group_id: "120363405275458276@g.us",
          messageTimestamp: "1786498300"
        }, null, 2)
      }
    },

    // 10. Programmatic Create Instance (POST /api/create_instance)
    {
      category: 'public',
      method: 'POST',
      path: '/api/create_instance',
      title: 'Programmatic Create Instance',
      desc: 'Create a brand new WhatsApp instance programmatically and receive an instance_id to poll its QR code.',
      params: [
        { name: 'access_token', type: 'string', req: true, desc: 'Your personal API Access Token.' },
      ],
      snippets: [
        {
          label: 'Direct URL (GET)',
          language: 'http',
          code: `${baseApiUrl}/api/create_instance?access_token=${apiKey}`
        },
        {
          label: 'cURL',
          language: 'bash',
          code: `curl -X POST "${baseApiUrl}/api/create_instance?access_token=${apiKey}"`
        }
      ],
      resExample: {
        title: 'RESPONSE JSON',
        code: JSON.stringify({
          status: "success",
          message: "Instance ID generated successfully",
          instance_id: "2730E940D4697"
        }, null, 2)
      }
    },

    // 11. Fetch QR Code (GET & POST /api/get_qrcode)
    {
      category: 'public',
      method: 'GET',
      path: '/api/get_qrcode',
      title: 'Fetch Connection QR Code (Base64)',
      desc: 'Retrieve the active Base64 QR code image string for scanning with the WhatsApp mobile app.',
      params: [
        { name: 'access_token', type: 'string', req: true, desc: 'Your personal API Access Token.' },
        { name: 'instance_id', type: 'string', req: true, desc: 'The initializing instance ID.' }
      ],
      snippets: [
        {
          label: 'Direct URL (GET)',
          language: 'http',
          code: `${baseApiUrl}/api/get_qrcode?instance_id=${activeInstanceId}&access_token=${apiKey}`
        },
        {
          label: 'cURL',
          language: 'bash',
          code: `curl -X GET "${baseApiUrl}/api/get_qrcode?instance_id=${activeInstanceId}&access_token=${apiKey}"`
        }
      ],
      resExample: {
        title: 'RESPONSE JSON',
        code: JSON.stringify({
          status: "success",
          message: "Success",
          base64: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
        }, null, 2)
      }
    },

    // 12. Reboot / Restart Instance Session (POST /api/reboot)
    {
      category: 'public',
      method: 'POST',
      path: '/api/reboot',
      title: 'Reboot Instance Session',
      desc: 'Disconnect and cleanly restart an instance socket connection to generate a fresh QR code.',
      params: [
        { name: 'access_token', type: 'string', req: true, desc: 'Your personal API Access Token.' },
        { name: 'instance_id', type: 'string', req: true, desc: 'Target Instance ID.' }
      ],
      snippets: [
        {
          label: 'Direct URL (GET)',
          language: 'http',
          code: `${baseApiUrl}/api/reboot?instance_id=${activeInstanceId}&access_token=${apiKey}`
        },
        {
          label: 'cURL',
          language: 'bash',
          code: `curl -X POST "${baseApiUrl}/api/reboot?instance_id=${activeInstanceId}&access_token=${apiKey}"`
        }
      ],
      resExample: {
        title: 'RESPONSE JSON',
        code: JSON.stringify({
          status: "success",
          message: "Success"
        }, null, 2)
      }
    },

    // 13. Clear Session & Reconnect (GET /api/reconnect)
    {
      category: 'public',
      method: 'GET',
      path: '/api/reconnect',
      title: 'Clear Session & Reconnect (Hard Reset)',
      desc: 'Clears the saved session for an instance and resets its status, preparing it for a clean re-scan via /api/reboot.',
      params: [
        { name: 'access_token', type: 'string', req: true, desc: 'Your personal API Access Token.' },
        { name: 'instance_id', type: 'string', req: true, desc: 'Target Instance ID.' }
      ],
      snippets: [
        {
          label: 'Direct URL (GET)',
          language: 'http',
          code: `${baseApiUrl}/api/reconnect?instance_id=${activeInstanceId}&access_token=${apiKey}`
        },
        {
          label: 'cURL',
          language: 'bash',
          code: `curl -X GET "${baseApiUrl}/api/reconnect?instance_id=${activeInstanceId}&access_token=${apiKey}"`
        }
      ],
      resExample: {
        title: 'RESPONSE JSON',
        code: JSON.stringify({
          success: true,
          message: "Instance session cleared. Use /api/reboot to start a fresh QR."
        }, null, 2)
      }
    },

    // 14. Reset Instance API (POST & GET /api/reset_instance)
    {
      category: 'public',
      method: 'POST',
      path: '/api/reset_instance',
      title: 'Reset Instance (Change ID & Delete Old Data)',
      desc: 'Logs out WhatsApp Web, completely deletes all old instance data and message logs, terminates the old instance, and generates a fresh new instance ID ready for QR scanning.',
      params: [
        { name: 'access_token', type: 'string', req: true, desc: 'Your personal API Access Token (or api_key).' },
        { name: 'instance_id', type: 'string', req: true, desc: 'The old/current instance ID to reset.' }
      ],
      snippets: [
        {
          label: 'Direct URL (GET)',
          language: 'http',
          code: `${baseApiUrl}/api/reset_instance?instance_id=${activeInstanceId}&access_token=${apiKey}`
        },
        {
          label: 'cURL (POST)',
          language: 'bash',
          code: `curl -X POST "${baseApiUrl}/api/reset_instance?instance_id=${activeInstanceId}&access_token=${apiKey}"`
        },
        {
          label: 'cURL (JSON Body)',
          language: 'bash',
          code: `curl -X POST "${baseApiUrl}/api/reset_instance" \\
  -H "Content-Type: application/json" \\
  -d '{
    "access_token": "${apiKey}",
    "instance_id": "${activeInstanceId}"
  }'`
        },
        {
          label: 'Python',
          language: 'python',
          code: `import requests

url = "${baseApiUrl}/api/reset_instance"
params = {
    "instance_id": "${activeInstanceId}",
    "access_token": "${apiKey}"
}

response = requests.post(url, params=params)
print(response.json())`
        },
        {
          label: 'PHP',
          language: 'php',
          code: `<?php
$url = "${baseApiUrl}/api/reset_instance?" . http_build_query([
    "instance_id" => "${activeInstanceId}",
    "access_token" => "${apiKey}"
]);

$response = file_get_contents($url);
echo $response;`
        }
      ],
      resExample: {
        title: 'RESPONSE JSON',
        code: JSON.stringify({
          status: "success",
          message: "Instance reset successfully. Old instance and data deleted, new instance initialized.",
          old_instance_id: activeInstanceId,
          instance_id: "NEW1234567890"
        }, null, 2)
      }
    },

    // 15. Set Webhook API (POST & GET /api/set_webhook)
    {
      category: 'public',
      method: 'POST',
      path: '/api/set_webhook',
      title: 'Set Receiving Webhook URL',
      desc: 'Configure an HTTP POST Webhook URL to receive live callbacks from WhatsApp for incoming messages, outgoing delivery statuses, and connection updates.',
      params: [
        { name: 'access_token', type: 'string', req: true, desc: 'Your personal API Access Token (or api_key).' },
        { name: 'instance_id', type: 'string', req: true, desc: 'Target connected WhatsApp instance ID.' },
        { name: 'webhook_url', type: 'string', req: true, desc: 'Your server callback URL (e.g. https://yourdomain.com/webhook.php).' },
        { name: 'enable', type: 'boolean | string', req: false, desc: '"true" (default) or "false" to enable/disable webhook delivery.' }
      ],
      snippets: [
        {
          label: 'Direct URL (GET)',
          language: 'http',
          code: `${baseApiUrl}/api/set_webhook?webhook_url=${encodeURIComponent('https://yourdomain.com/webhook.php')}&enable=true&instance_id=${activeInstanceId}&access_token=${apiKey}`
        },
        {
          label: 'cURL (POST)',
          language: 'bash',
          code: `curl -X POST "${baseApiUrl}/api/set_webhook" \\
  -H "Content-Type: application/json" \\
  -d '{
    "access_token": "${apiKey}",
    "instance_id": "${activeInstanceId}",
    "webhook_url": "https://yourdomain.com/webhook.php",
    "enable": true
  }'`
        },
        {
          label: 'PHP',
          language: 'php',
          code: `<?php
$url = "${baseApiUrl}/api/set_webhook?" . http_build_query([
    "webhook_url" => "https://yourdomain.com/webhook.php",
    "enable" => "true",
    "instance_id" => "${activeInstanceId}",
    "access_token" => "${apiKey}"
]);

$response = file_get_contents($url);
echo $response;`
        }
      ],
      resExample: {
        title: 'RESPONSE JSON',
        code: JSON.stringify({
          status: "success",
          message: "Webhook updated successfully",
          instance_id: activeInstanceId,
          webhook_url: "https://yourdomain.com/webhook.php",
          enable: true
        }, null, 2)
      }
    },

    // 16. Get Webhook API (POST & GET /api/get_webhook)
    {
      category: 'public',
      method: 'GET',
      path: '/api/get_webhook',
      title: 'Get Current Webhook Settings',
      desc: 'Retrieve the currently configured Webhook URL and its active status for an instance.',
      params: [
        { name: 'access_token', type: 'string', req: true, desc: 'Your personal API Access Token.' },
        { name: 'instance_id', type: 'string', req: true, desc: 'Target instance ID.' }
      ],
      snippets: [
        {
          label: 'Direct URL (GET)',
          language: 'http',
          code: `${baseApiUrl}/api/get_webhook?instance_id=${activeInstanceId}&access_token=${apiKey}`
        },
        {
          label: 'cURL',
          language: 'bash',
          code: `curl -X GET "${baseApiUrl}/api/get_webhook?instance_id=${activeInstanceId}&access_token=${apiKey}"`
        }
      ],
      resExample: {
        title: 'RESPONSE JSON',
        code: JSON.stringify({
          status: "success",
          instance_id: activeInstanceId,
          webhook_url: "https://yourdomain.com/webhook.php",
          enable: true
        }, null, 2)
      }
    }
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
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
            Developer API Reference & 1-Click Code Hub
          </h2>
          <p style={{ color: '#64748B', fontSize: '14px', margin: 0, fontWeight: 500 }}>
            Programmatically dispatch WhatsApp messages, images, PDFs, interactive button templates, group broadcasts, and validate phone numbers via REST APIs.
          </p>
        </div>
      </div>

      {/* API Key & Active Instance Dynamic Credentials Card */}
      <div 
        className="card" 
        style={{ 
          padding: '28px', 
          borderRadius: '20px', 
          background: '#FFFFFF', 
          border: '1px solid #E2E8F0', 
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
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <GlassBookIcon size={26} />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.01em' }}>
                Your Live API Credentials & Endpoint Host
              </h4>
              <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#64748B', fontWeight: 500 }}>
                Base Host URL: <code style={{ color: '#2563EB', fontFamily: 'var(--font-mono)', fontWeight: 800, background: '#EFF6FF', padding: '2px 8px', borderRadius: '6px' }}>{baseApiUrl}</code>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={copyKey}
              className="btn-primary"
              style={{ padding: '10px 18px', fontSize: '13px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {copiedKey ? <GlassCheckCircleIcon size={16} /> : <GlassCopyIcon size={16} />}
              {copiedKey ? 'Token Copied!' : 'Copy Access Token'}
            </button>

            <button
              onClick={regenerateToken}
              disabled={regenerating}
              className="btn-outline"
              style={{
                padding: '10px 16px',
                fontSize: '13px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: regenerating ? 'not-allowed' : 'pointer'
              }}
            >
              <GlassRefreshIcon
                size={16}
                style={{
                  animation: regenerating ? 'spin 0.8s linear infinite' : 'none',
                  transition: 'transform 0.2s ease'
                }}
              />
              <span>{regenerating ? 'Regenerating...' : 'Regenerate Token'}</span>
            </button>
          </div>
        </div>

        {/* Credentials Grid: Access Token & Selected Instance ID */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {/* Access Token Box */}
          <div 
            style={{ 
              background: '#0F172A', 
              borderRadius: '14px', 
              padding: '16px 18px', 
              border: '1px solid #1E293B', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '6px' 
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                PERSONAL ACCESS TOKEN (SECRET KEY)
              </span>
              <button 
                onClick={copyKey}
                style={{ background: 'transparent', border: 'none', color: '#38BDF8', cursor: 'pointer', fontSize: '11px', fontWeight: 700, padding: 0 }}
              >
                {copiedKey ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <code style={{ fontSize: '15px', fontFamily: 'var(--font-mono)', color: '#FBBF24', fontWeight: 700, letterSpacing: '0.04em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {apiKey}
            </code>
          </div>

          {/* Active Instance ID Selector Box */}
          <div 
            style={{ 
              background: '#0F172A', 
              borderRadius: '14px', 
              padding: '16px 18px', 
              border: '1px solid #1E293B', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '6px' 
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                ACTIVE SENDER INSTANCE ID
              </span>
              <button 
                onClick={copyInst}
                style={{ background: 'transparent', border: 'none', color: '#38BDF8', cursor: 'pointer', fontSize: '11px', fontWeight: 700, padding: 0 }}
              >
                {copiedInst ? '✓ Copied' : 'Copy ID'}
              </button>
            </div>
            {instances.length > 1 ? (
              <select
                value={activeInstanceId}
                onChange={e => setSelectedInstanceId(e.target.value)}
                style={{
                  background: '#1E293B',
                  color: '#38BDF8',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  fontSize: '13px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {instances.map((inst: any) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.id} ({inst.phoneNumber ? `+${inst.phoneNumber}` : inst.status})
                  </option>
                ))}
              </select>
            ) : (
              <code style={{ fontSize: '15px', fontFamily: 'var(--font-mono)', color: '#38BDF8', fontWeight: 700, letterSpacing: '0.04em' }}>
                {activeInstanceId}
              </code>
            )}
          </div>
        </div>

        {/* Ready-to-use 1-Click Quick Send URL */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              READY-TO-TEST QUICK SEND URL (PASTE DIRECTLY IN BROWSER OR POSTMAN)
            </span>
            <span style={{ fontSize: '11px', color: '#059669', fontWeight: 700 }}>
              ● Credentials auto-injected
            </span>
          </div>
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
              {baseApiUrl}/api/send?number=91XXXXXXXXXX&type=text&message=Hello+World&instance_id={activeInstanceId}&access_token={apiKey}
            </code>
            <button
              onClick={copyApiUrl}
              style={{
                background: copiedUrl ? '#10B981' : '#2563EB',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
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
        <div style={{ display: 'flex', background: '#FFFFFF', padding: '5px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: 'var(--shadow-soft)', gap: '4px', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'All Endpoints', icon: GlassBookIcon },
            { id: 'messaging', label: 'Messaging & Filter APIs', icon: GlassSendIcon },
            { id: 'groups', label: 'WhatsApp Groups', icon: GlassUsersGroupIcon },
            { id: 'public', label: 'Instance & QR APIs', icon: GlassDeviceIcon },
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
                  background: isActive ? '#2563EB' : 'transparent',
                  color: isActive ? '#FFFFFF' : '#64748B',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <TabIcon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search Input Filter */}
        <div style={{ position: 'relative', width: '280px' }}>
          <div style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)' }}>
            <GlassSearchIcon size={16} />
          </div>
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
          <EndpointDoc key={ep.method + ep.path} {...ep} baseApiUrl={baseApiUrl} />
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
