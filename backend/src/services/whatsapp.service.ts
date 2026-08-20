import makeWASocket, {
    useMultiFileAuthState, DisconnectReason, Browsers,
    prepareWAMessageMedia, proto, generateWAMessageFromContent,
    fetchLatestWaWebVersion
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import * as QRCode from 'qrcode';
import { prisma, socketIo } from '../server';
import pino from 'pino';
import { EventEmitter } from 'events';

export const instances = new Map<string, ReturnType<typeof makeWASocket>>();
export const qrs = new Map<string, string>();
export const lastPolled = new Map<string, number>();
export const lastUsed = new Map<string, number>();
export const intendedClose = new Set<string>();

// --- Advanced Session Manager State ---
export const connectionEvents = new EventEmitter();
export const connectionStatus = new Map<string, string>();
export const messageQueues = new Map<string, any[]>();
export const isDraining = new Map<string, boolean>();

const MAX_CONNECTIONS = 50;
let activeConnections = 0;
const waitingQueue: Array<{ instanceId: string, resolve: Function }> = [];

const freeConnectionSlot = () => {
    activeConnections--;
    if (waitingQueue.length > 0) {
        const next = waitingQueue.shift();
        if (next) {
            activeConnections++;
            next.resolve();
        }
    }
};

// Cleanup abandoned QR sessions every minute
setInterval(() => {
    const now = Date.now();
    for (const [id, time] of lastPolled.entries()) {
        if (now - time > 60000) {
            if (qrs.has(id)) {
                const sock = instances.get(id);
                if (sock) {
                    console.log(`[${id}] Killing abandoned QR session due to inactivity.`);
                    intendedClose.add(id);
                    sock.logout('intentional');
                    instances.delete(id);
                    freeConnectionSlot();
                }
                qrs.delete(id);
            }
            lastPolled.delete(id);
        }
    }
}, 30000);

// Idle timeout reaper (Garbage Collection) for Lazy Loading
setInterval(() => {
    const now = Date.now();
    for (const [id, time] of lastUsed.entries()) {
        // Sleep after 5 minutes of inactivity
        if (now - time > 5 * 60 * 1000) {
            const sock = instances.get(id);
            if (sock) {
                console.log(`[${id}] Sleeping instance due to 5 minutes of inactivity (Lazy Loading).`);
                intendedClose.add(id);
                try { sock.ws.close(); } catch (e) { }
                instances.delete(id);
                connectionStatus.delete(id);
                freeConnectionSlot();
            }
            lastUsed.delete(id);
        }
    }
}, 60000);

export const initWhatsAppService = async () => {
    // Lazy Loading: We no longer connect all instances on startup!
    // Instances will connect on-demand when a message is sent.
    console.log('Lazy Loading mode active: Skipping bulk WhatsApp connections on startup.');
};

export const createInstance = async (instanceId: string, retryCount = 0) => {
    const { state, saveCreds } = await useMultiFileAuthState(`sessions/${instanceId}`);

    // Always fetch the latest WhatsApp Web version to avoid 428 errors
    let version: [number, number, number] = [2, 3000, 1042626022];
    try {
        const result = await fetchLatestWaWebVersion();
        if (result?.version) version = result.version as [number, number, number];
        console.log(`[${instanceId}] Using WA Web version: ${version.join('.')}`);
    } catch (e) {
        console.warn(`[${instanceId}] Could not fetch latest WA version, using fallback.`);
    }

    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        browser: Browsers.ubuntu('Chrome'),
        syncFullHistory: false, // Prevents downloading years of chat history, reducing RAM & CPU load
        markOnlineOnConnect: true,
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 25000,
        generateHighQualityLinkPreview: false,
        logger: pino({ level: 'silent' }),
        getMessage: async () => undefined
    });

    instances.set(instanceId, sock);

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update: any) => {
        const { connection, lastDisconnect, qr } = update;
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;

        if (qr) {
            console.log(`[WA] 📸 [${instanceId}] QR code generated — waiting for scan...`);
            const qrUrl = await QRCode.toDataURL(qr);
            qrs.set(instanceId, qrUrl);
            socketIo.emit(`qr-${instanceId}`, qrUrl);
            try {
                const inst = await prisma.instance.findUnique({ where: { id: instanceId } });
                if (inst && inst.status === 'connected') {
                    await prisma.instance.update({ where: { id: instanceId }, data: { status: 'disconnected' } });
                }
            } catch (e) { }
        }

        if (connection === 'close') {
            connectionStatus.set(instanceId, 'close');
            qrs.delete(instanceId);

            if (intendedClose.has(instanceId)) {
                console.log(`[WA] 💤 [${instanceId}] Connection closed intentionally (Lazy Loading idle mode).`);
                intendedClose.delete(instanceId);
                instances.delete(instanceId);
                return;
            }

            if (statusCode === 515) {
                console.log(`[WA] 🔄 [${instanceId}] QR scanned! Finalizing secure multi-device session...`);
            } else if (statusCode === DisconnectReason.loggedOut) {
                console.log(`[WA] 🚪 [${instanceId}] Logged out from WhatsApp.`);
            } else if (statusCode) {
                console.log(`[WA] ⚠️ [${instanceId}] Connection interrupted (Status: ${statusCode}).`);
            }

            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                // Exponential backoff: 5s, 10s, 20s, 40s ... max 60s — prevents IP rate-limiting
                const delay = Math.min(5000 * Math.pow(2, retryCount), 60000);
                console.log(`[WA] ⏳ [${instanceId}] Reconnecting in ${delay / 1000}s (attempt ${retryCount + 1})...`);
                setTimeout(() => createInstance(instanceId, retryCount + 1), delay);
            } else {
                try {
                    await prisma.instance.update({ where: { id: instanceId }, data: { status: 'disconnected', phoneNumber: null } });
                } catch (e) { }
                instances.delete(instanceId);
                socketIo.emit(`status-${instanceId}`, 'disconnected');
            }
            dispatchWebhook(instanceId, 'connection.update', { status: 'disconnected' });
        } else if (connection === 'open') {
            connectionStatus.set(instanceId, 'open');
            connectionEvents.emit(`open-${instanceId}`);
            qrs.delete(instanceId);
            lastPolled.delete(instanceId);
            const phoneNumber = sock.user?.id?.split(':')[0] || null;
            console.log(`[WA] ✅ [${instanceId}] Successfully Connected! Phone: +${phoneNumber || 'Unknown'}`);

            let profilePicUrl: string | null = null;
            try {
                const jid = sock.user?.id ? (sock.user.id.split(':')[0] + '@s.whatsapp.net') : null;
                if (jid) {
                    profilePicUrl = await sock.profilePictureUrl(jid, 'image');
                    console.log(`[WA] 🖼️ [${instanceId}] Profile Picture loaded: ${profilePicUrl}`);
                }
            } catch (dpErr: any) {
                console.log(`[WA] ℹ️ [${instanceId}] Profile picture not set or privacy restricted.`);
            }

            try {
                await (prisma as any).instance.update({
                    where: { id: instanceId },
                    data: { status: 'connected', phoneNumber, profilePicUrl }
                });
            } catch (e) { }
            socketIo.emit(`status-${instanceId}`, 'connected');
            dispatchWebhook(instanceId, 'connection.update', { status: 'connected', phoneNumber, profilePicUrl });
        }
    });

    // Listen for incoming messages to trigger Webhook
    sock.ev.on('messages.upsert', async (m: any) => {
        if (m.type === 'notify' && m.messages) {
            for (const msg of m.messages) {
                if (!msg.key.fromMe) {
                    const sender = msg.key.remoteJid?.split('@')[0] || '';
                    const pushName = msg.pushName || '';
                    const messageText = msg.message?.conversation || 
                                       msg.message?.extendedTextMessage?.text || 
                                       msg.message?.imageMessage?.caption || 
                                       msg.message?.videoMessage?.caption || 
                                       msg.message?.documentMessage?.caption || '';
                    
                    dispatchWebhook(instanceId, 'messages.upsert', {
                        key: msg.key,
                        sender,
                        pushName,
                        message: messageText,
                        messageTimestamp: msg.messageTimestamp,
                        rawMessage: msg
                    });
                }
            }
        }
    });

    instances.set(instanceId, sock);
    return sock;
};

export const dispatchWebhook = async (instanceId: string, event: string, data: any) => {
    try {
        const inst = await prisma.instance.findUnique({ where: { id: instanceId } });
        if (!inst || !inst.webhookEnabled || !inst.webhookUrl) return;

        const body = {
            event,
            instance_id: instanceId,
            phone_number: inst.phoneNumber,
            timestamp: Math.floor(Date.now() / 1000),
            data
        };

        const fetchFn = (globalThis as any).fetch;
        if (fetchFn) {
            await fetchFn(inst.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                signal: AbortSignal.timeout(8000)
            }).catch((err: any) => {
                console.warn(`[Webhook ${instanceId}] Failed to post to ${inst.webhookUrl}:`, err?.message || err);
            });
        }
    } catch (e) {}
};

export const waitUntilConnected = (instanceId: string): Promise<boolean> => {
    return new Promise((resolve) => {
        if (connectionStatus.get(instanceId) === 'open') {
            return resolve(true);
        }

        let resolved = false;
        const timeout = setTimeout(() => {
            if (!resolved) {
                resolved = true;
                connectionEvents.off(`open-${instanceId}`, onOpen);
                resolve(false);
            }
        }, 10000);

        const onOpen = () => {
            if (!resolved) {
                resolved = true;
                clearTimeout(timeout);
                resolve(true);
            }
        };

        connectionEvents.once(`open-${instanceId}`, onOpen);
    });
};

// ─────────────────────────────────────────────
// QUEUE & RETRY LOGIC
// ─────────────────────────────────────────────
const enqueueMessage = (instanceId: string, payload: any): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (!messageQueues.has(instanceId)) {
            messageQueues.set(instanceId, []);
        }
        messageQueues.get(instanceId)!.push({ ...payload, resolve, reject });

        // Boot socket if needed, tracking active load limits
        getSocket(instanceId).then(() => {
            drainQueue(instanceId);
        }).catch((err) => {
            reject(err);
        });
    });
};

/**
 * Injects invisible zero-width unicode characters into message text.
 * 0% visible difference to recipient, 100% unique cryptographic hash to Meta servers.
 */
export const applyInvisibleAntiHash = (text: string): string => {
    if (!text || typeof text !== 'string') return text;
    const zeroWidth = ['\u200B', '\u200C', '\u200D', '\uFEFF'];
    const words = text.split(' ');
    if (words.length <= 1) {
        return text + zeroWidth[Math.floor(Math.random() * zeroWidth.length)];
    }
    const idx1 = Math.floor(Math.random() * words.length);
    const char1 = zeroWidth[Math.floor(Math.random() * zeroWidth.length)];
    words[idx1] = words[idx1] + char1;

    if (words.length > 3) {
        let idx2 = Math.floor(Math.random() * words.length);
        if (idx2 === idx1) idx2 = (idx1 + 1) % words.length;
        const char2 = zeroWidth[Math.floor(Math.random() * zeroWidth.length)];
        words[idx2] = words[idx2] + char2;
    }
    return words.join(' ');
};

const doSend = async (sock: any, payload: any, instanceId: string) => {
    const formattedJid = payload.jid.includes('@') ? payload.jid : `${payload.jid}@s.whatsapp.net`;

    // Determine if WhatsApp registration check should be performed
    let shouldCheck = true;
    if (payload.checkWhatsAppNumber !== undefined) {
        shouldCheck = Boolean(payload.checkWhatsAppNumber);
    } else {
        try {
            const instRecord = await prisma.instance.findUnique({
                where: { id: instanceId },
                select: { user: { select: { checkWhatsAppNumber: true } } }
            });
            if (instRecord?.user && instRecord.user.checkWhatsAppNumber === false) {
                shouldCheck = false;
            }
        } catch (e) {}
    }
    payload.usedTurbo = !shouldCheck;

    let targetJid = formattedJid;
    const cleanPhone = formattedJid.split('@')[0].replace(/[^0-9]/g, '');

    if (shouldCheck && !formattedJid.endsWith('@g.us')) {
        try {
            const checkRes = await sock.onWhatsApp(cleanPhone);
            const result = Array.isArray(checkRes) && checkRes.length > 0 ? checkRes[0] : checkRes;
            if (result && result.exists === false) {
                throw new Error('Non-Whatsapp');
            }
            if (result && result.jid) {
                targetJid = result.jid;
            }
        } catch (err: any) {
            if (err.message === 'Non-Whatsapp') throw err;
            console.warn(`[Warning] onWhatsApp check failed for ${cleanPhone}, proceeding anyway.`);
        }
    }

    // Automatic human typing simulation before socket write (snappy 200-500ms range)
    if (!targetJid.endsWith('@g.us')) {
        try {
            // 1. Signal foreground active connection
            await sock.sendPresenceUpdate('available');

            // 2. Select composing or recording presence
            const isMediaAudio = payload.file?.mimetype?.startsWith('audio/');
            const presenceType = isMediaAudio ? 'recording' : 'composing';
            await sock.sendPresenceUpdate(presenceType, targetJid);

            // 3. Fast automated human delay: 200ms - 500ms based on length with random jitter
            const messageLen = (payload.text?.length || payload.interactivePayload?.body?.length || 20);
            const dynamicDelay = Math.min(500, Math.max(200, messageLen * 4 + Math.floor(Math.random() * 120)));
            await new Promise(r => setTimeout(r, dynamicDelay));
        } catch (e) {}
    }

    let sendResult: any = null;
    try {
        if (payload.isInteractive) {
            const p = payload.interactivePayload;
            // ── Build native flow buttons ──────────────────────
            const nativeButtons = p.buttons
                .filter((btn: any) => btn.label?.trim())
                .map((btn: any) => {
                    if (btn.type === 'quick_reply') {
                        return { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: btn.label, id: btn.id || btn.label }) };
                    } else if (btn.type === 'cta_url') {
                        return { name: 'cta_url', buttonParamsJson: JSON.stringify({ display_text: btn.label, url: btn.url || 'https://example.com', merchant_url: btn.url || 'https://example.com' }) };
                    } else if (btn.type === 'cta_call') {
                        return { name: 'cta_call', buttonParamsJson: JSON.stringify({ display_text: btn.label, phone_number: btn.phone || '' }) };
                    } else if (btn.type === 'cta_copy' || btn.type === 'copy_code' || btn.type === 'copy') {
                        return { name: 'cta_copy', buttonParamsJson: JSON.stringify({ display_text: btn.label || 'Copy Code', id: btn.copy_code || btn.code || btn.id || btn.label, copy_code: btn.copy_code || btn.code || btn.id || btn.label }) };
                    }
                    return null;
                })
                .filter(Boolean);

            // ── Build header ───────────────────────────────────
            let headerContent: any = { hasMediaAttachment: false };
            if (p.headerType === 'text' && p.headerText) {
                headerContent = { hasMediaAttachment: false, title: p.headerText };
            } else if (p.headerType === 'image' && p.headerImageUrl) {
                try {
                    let mediaData: any;
                    if (p.isLocalFile) {
                        const fs = require('fs');
                        mediaData = fs.readFileSync(p.headerImageUrl);
                    } else {
                        mediaData = { url: p.headerImageUrl };
                    }
                    const mediaContent = await prepareWAMessageMedia({ image: mediaData }, { upload: sock.waUploadToServer });
                    headerContent = { hasMediaAttachment: true, imageMessage: mediaContent.imageMessage };
                } catch (e) {
                    console.warn('Could not prepare image header, using no header:', e);
                    headerContent = { hasMediaAttachment: false };
                } finally {
                    if (p.isLocalFile) {
                        const fs = require('fs');
                        try { fs.unlinkSync(p.headerImageUrl); } catch (e) { }
                    }
                }
            }

            const mutatedBody = applyInvisibleAntiHash(p.body);
            const interactiveMsg = proto.Message.InteractiveMessage.fromObject({
                header: proto.Message.InteractiveMessage.Header.fromObject(headerContent),
                body: proto.Message.InteractiveMessage.Body.fromObject({ text: mutatedBody }),
                footer: proto.Message.InteractiveMessage.Footer.fromObject({ text: p.footer || '' }),
                nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({ buttons: nativeButtons }),
            });

            const waMessage = generateWAMessageFromContent(targetJid, proto.Message.fromObject({ interactiveMessage: interactiveMsg }), { userJid: sock.user?.id || '' });
            sendResult = await sock.relayMessage(targetJid, waMessage.message!, { messageId: waMessage.key?.id! });
            console.log(`[${instanceId}] ✅ Interactive message sent to ${payload.jid} (${nativeButtons.length} button(s))`);
            return waMessage;
        } else {
            if (payload.file) {
                const caption = payload.text ? applyInvisibleAntiHash(payload.text) : undefined;
                let mediaData: any;

                if (payload.file.isLocalFile) {
                    const fs = require('fs');
                    mediaData = fs.readFileSync(payload.file.url);
                } else {
                    mediaData = { url: payload.file.url };
                }

                try {
                    if (payload.file.mimetype.startsWith('image/')) {
                        sendResult = await sock.sendMessage(targetJid, { image: mediaData, caption });
                        return sendResult;
                    } else if (payload.file.mimetype.startsWith('video/')) {
                        sendResult = await sock.sendMessage(targetJid, { video: mediaData, caption });
                        return sendResult;
                    } else {
                        sendResult = await sock.sendMessage(targetJid, { document: mediaData, mimetype: payload.file.mimetype, fileName: payload.file.fileName, caption });
                        return sendResult;
                    }
                } finally {
                    // Always clean up local file
                    if (payload.file.isLocalFile) {
                        const fs = require('fs');
                        try { fs.unlinkSync(payload.file.url); } catch (e) { console.error('Failed to cleanup local file', e); }
                    }
                }
            } else {
                if (!payload.text) throw new Error('Message text is required');
                const safeText = applyInvisibleAntiHash(payload.text);
                sendResult = await sock.sendMessage(targetJid, { text: safeText });
                return sendResult;
            }
        }
    } finally {
        if (!targetJid.endsWith('@g.us')) {
            try { await sock.sendPresenceUpdate('paused', targetJid); } catch (e) {}
        }
    }
};

const drainQueue = async (instanceId: string) => {
    if (isDraining.get(instanceId)) return;
    isDraining.set(instanceId, true);

    const queue = messageQueues.get(instanceId)!;

    while (queue && queue.length > 0) {
        const payload = queue[0];

        const isOpen = await waitUntilConnected(instanceId);
        if (!isOpen) {
            console.error(`[${instanceId}] Timeout waiting for socket to open. Dropping message.`);
            payload.reject(new Error('Timeout waiting for socket to open'));
            queue.shift();
            continue;
        }

        const sock = instances.get(instanceId);
        if (!sock) {
            console.error(`[${instanceId}] Socket vanished. Dropping message.`);
            payload.reject(new Error('Socket vanished'));
            queue.shift();
            continue;
        }

        let success = false;
        let attempt = 1;
        let lastError: any = null;
        let sendResult: any = null;

        while (attempt <= 3 && !success) {
            try {
                if (connectionStatus.get(instanceId) !== 'open') {
                    const reconnected = await waitUntilConnected(instanceId);
                    if (!reconnected) throw new Error('Socket disconnected during retry wait');
                }

                sendResult = await doSend(sock, payload, instanceId);
                success = true;
            } catch (err: any) {
                lastError = err;
                console.warn(`[${instanceId}] Send failed (attempt ${attempt}/3):`, err.message || err);

                // If it's explicitly a non-whatsapp number, don't retry. Fast-fail it.
                if (err.message === 'Non-Whatsapp') {
                    break;
                }

                if (attempt === 3) {
                    console.error(`[${instanceId}] Failed to send message after 3 attempts. Dropping.`);
                    break;
                }
                await new Promise(r => setTimeout(r, attempt * 1000));
                attempt++;
            }
        }

        queue.shift();

        if (success) {
            const recipient = payload.jid?.split('@')[0] || payload.jid;
            const modeTag = payload.usedTurbo ? '⚡ [Turbo Direct]' : '✓ [Verified Send]';
            console.log(`[MSG] ✉️ ${modeTag} [${instanceId}] Delivered message to +${recipient}`);
            payload.resolve(sendResult);
        } else {
            const recipient = payload.jid?.split('@')[0] || payload.jid;
            const modeTag = payload.usedTurbo ? '⚡ [Turbo Direct]' : '✓ [Verified Send]';
            console.warn(`[MSG] ❌ ${modeTag} [${instanceId}] Failed to send to +${recipient}: ${lastError?.message || 'Unknown error'}`);
            payload.reject(lastError || new Error('Failed to send after 3 attempts'));
        }

        if (queue.length > 0) {
            await new Promise(r => setTimeout(r, 500));
        }
    }

    isDraining.set(instanceId, false);
};

// ─────────────────────────────────────────────
// PLAIN TEXT / MEDIA MESSAGE
// ─────────────────────────────────────────────
export const sendMessage = async (
    instanceId: string,
    jid: string,
    text: string,
    file?: { url: string; mimetype: string; fileName: string; isLocalFile?: boolean }
) => {
    return enqueueMessage(instanceId, { isInteractive: false, jid, text, file });
};

// ─────────────────────────────────────────────
// INTERACTIVE MESSAGE (Buttons, URL, Call, Image Header)
// ─────────────────────────────────────────────

export interface InteractiveButton {
    type: 'quick_reply' | 'cta_url' | 'cta_call' | 'cta_copy' | 'copy_code';
    label: string;
    id?: string;
    url?: string;
    phone?: string;
    copy_code?: string;
    code?: string;
}

export interface InteractivePayload {
    headerType: 'none' | 'text' | 'image';
    headerText?: string;
    headerImageUrl?: string;
    isLocalFile?: boolean;
    body: string;
    footer?: string;
    buttons: InteractiveButton[];
}

export const sendInteractiveMessage = async (
    instanceId: string,
    jid: string,
    payload: InteractivePayload
) => {
    return enqueueMessage(instanceId, { isInteractive: true, jid, interactivePayload: payload });
};

export const getSocket = async (instanceId: string) => {
    lastUsed.set(instanceId, Date.now());
    if (instances.has(instanceId)) {
        return instances.get(instanceId)!;
    }

    if (activeConnections >= MAX_CONNECTIONS) {
        console.log(`[${instanceId}] Connection limit reached. Waiting in queue...`);
        await new Promise((resolve) => waitingQueue.push({ instanceId, resolve }));
    }

    if (instances.has(instanceId)) {
        freeConnectionSlot();
        return instances.get(instanceId)!;
    }

    activeConnections++;
    console.log(`[${instanceId}] Lazy loading instance into memory... (Active: ${activeConnections}/${MAX_CONNECTIONS})`);
    const sock = await createInstance(instanceId);
    return sock;
};

export const deleteInstanceSession = async (instanceId: string) => {
    const sock = instances.get(instanceId);
    if (sock) {
        sock.logout('intentional');
        instances.delete(instanceId);
    }
};

export interface NumberCheckResult {
    number: string;
    exists: boolean;
    jid?: string;
}

export const checkWhatsAppNumbers = async (
    instanceId: string,
    numbers: string[],
    delayMs = 150
): Promise<NumberCheckResult[]> => {
    const sock = await getSocket(instanceId);
    const isOpen = await waitUntilConnected(instanceId);
    if (!isOpen || !sock) {
        throw new Error('WhatsApp instance is not connected');
    }

    const results: NumberCheckResult[] = [];
    const uniqueNumbers = Array.from(new Set(numbers.map(n => n.replace(/\D/g, '').trim()).filter(Boolean)));

    for (const cleanNum of uniqueNumbers) {
        try {
            const check = await sock.onWhatsApp(cleanNum);
            const exists = Array.isArray(check) && check.length > 0 && !!check[0]?.exists;
            results.push({
                number: cleanNum,
                exists,
                jid: exists ? check[0].jid : undefined
            });
        } catch (err: any) {
            results.push({
                number: cleanNum,
                exists: false
            });
        }

        if (delayMs > 0 && uniqueNumbers.length > 1) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }

    return results;
};

// ─────────────────────────────────────────────
// GROUP API SERVICES
// ─────────────────────────────────────────────

export interface GroupInfo {
    id: string; // e.g. 120363048999999999@g.us
    subject: string;
    owner?: string;
    creation?: number;
    desc?: string;
    participantsCount: number;
    isAdmin: boolean;
    isAnnounce?: boolean;
    isCommunity?: boolean;
}

export interface GroupMemberInfo {
    id: string;
    number: string;
    admin: 'admin' | 'superadmin' | null;
    isMe: boolean;
}

export const fetchInstanceGroups = async (instanceId: string): Promise<GroupInfo[]> => {
    const sock = await getSocket(instanceId);
    const isOpen = await waitUntilConnected(instanceId);
    if (!isOpen || !sock) {
        throw new Error('WhatsApp instance is not connected');
    }

    const participating = await sock.groupFetchAllParticipating();
    const myNumber = sock.user?.id ? sock.user.id.split(':')[0].replace(/\D/g, '') : '';
    const myLid = sock.user?.lid ? sock.user.lid.split('@')[0].split(':')[0] : '';

    const groups: GroupInfo[] = [];

    for (const [jid, group] of Object.entries(participating)) {
        const participants = (group as any).participants || [];
        const me = participants.find((p: any) => {
            const rawPhone = p.phoneNumber || (p.id?.endsWith('@s.whatsapp.net') ? p.id : undefined);
            const clean = rawPhone ? rawPhone.split('@')[0].split(':')[0].replace(/\D/g, '') : (p.id || '').split('@')[0].split(':')[0].replace(/\D/g, '');
            const pLid = (p.id || '').split('@')[0].split(':')[0];
            return (myNumber && clean === myNumber) || (myLid && pLid === myLid);
        });
        const isAdmin = me?.admin === 'admin' || me?.admin === 'superadmin';

        groups.push({
            id: jid,
            subject: (group as any).subject || 'Unnamed Group',
            owner: (group as any).owner,
            creation: (group as any).creation,
            desc: (group as any).desc?.toString() || '',
            participantsCount: participants.length,
            isAdmin: !!isAdmin,
            isAnnounce: !!(group as any).announce,
            isCommunity: !!(group as any).isCommunity
        });
    }

    return groups.sort((a, b) => a.subject.localeCompare(b.subject));
};

export const fetchGroupMetadata = async (instanceId: string, groupJid: string) => {
    const sock = await getSocket(instanceId);
    const isOpen = await waitUntilConnected(instanceId);
    if (!isOpen || !sock) {
        throw new Error('WhatsApp instance is not connected');
    }

    const formattedJid = groupJid.includes('@') ? groupJid : `${groupJid}@g.us`;
    const meta = await sock.groupMetadata(formattedJid);
    const myNumber = sock.user?.id ? sock.user.id.split(':')[0].replace(/\D/g, '') : '';
    const myLid = sock.user?.lid ? sock.user.lid.split('@')[0].split(':')[0] : '';

    const participants: GroupMemberInfo[] = (meta.participants || []).map((p: any) => {
        // Prioritize actual phone number JID over internal WhatsApp encrypted LID
        const rawPhoneJid = p.phoneNumber || (p.id?.endsWith('@s.whatsapp.net') ? p.id : undefined);
        const cleanNum = rawPhoneJid 
            ? rawPhoneJid.split('@')[0].split(':')[0].replace(/\D/g, '')
            : (p.id || '').split('@')[0].split(':')[0].replace(/\D/g, '');

        const pLid = (p.id || '').split('@')[0].split(':')[0];
        const isMe = (myNumber && cleanNum === myNumber) || (myLid && pLid === myLid);

        return {
            id: p.id,
            number: cleanNum,
            admin: p.admin || null,
            isMe: !!isMe
        };
    });

    return {
        id: meta.id,
        subject: meta.subject,
        owner: meta.owner,
        creation: meta.creation,
        desc: meta.desc?.toString() || '',
        isAnnounce: !!meta.announce,
        isCommunity: !!(meta as any).isCommunity,
        participantsCount: participants.length,
        participants
    };
};

export const syncInstanceProfilePic = async (instanceId: string): Promise<string | null> => {
    try {
        const sock = await getSocket(instanceId);
        const isOpen = await waitUntilConnected(instanceId);
        if (!isOpen || !sock) return null;

        const inst = await (prisma as any).instance.findUnique({ where: { id: instanceId } });
        const rawPhone = sock.user?.id ? sock.user.id.split(':')[0].replace(/\D/g, '') : (inst?.phoneNumber || '').replace(/\D/g, '');
        if (!rawPhone) return null;

        const jid = `${rawPhone}@s.whatsapp.net`;
        let profilePicUrl: string | null = null;
        try {
            profilePicUrl = await sock.profilePictureUrl(jid, 'image');
            console.log(`[WA] 🖼️ [${instanceId}] Profile Picture loaded for +${rawPhone}:`, profilePicUrl);
        } catch (e: any) {
            console.log(`[WA] ℹ️ [${instanceId}] No DP found or restricted for +${rawPhone}:`, e?.message || e);
        }

        if (profilePicUrl) {
            await (prisma as any).instance.update({
                where: { id: instanceId },
                data: { profilePicUrl }
            });
        }
        return profilePicUrl;
    } catch (e) {
        return null;
    }
};


