import makeWASocket, {
    useMultiFileAuthState, DisconnectReason, Browsers,
    prepareWAMessageMedia, proto, generateWAMessageFromContent
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
                try { sock.ws.close(); } catch (e) {}
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

export const createInstance = async (instanceId: string) => {
    const { state, saveCreds } = await useMultiFileAuthState(`sessions/${instanceId}`);

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        browser: ['Ubuntu', 'Chrome', '20.0.04'],
        logger: pino({ level: 'silent' })
    });

    instances.set(instanceId, sock);

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update: any) => {
        const { connection, lastDisconnect, qr } = update;
        console.log(`[${instanceId}] Connection update:`, { connection, hasQr: !!qr, error: lastDisconnect?.error });

        if (qr) {
            console.log(`[${instanceId}] QR Code generated!`);
            const qrUrl = await QRCode.toDataURL(qr);
            qrs.set(instanceId, qrUrl);
            socketIo.emit(`qr-${instanceId}`, qrUrl);
            try {
                const inst = await prisma.instance.findUnique({ where: { id: instanceId } });
                if (inst && inst.status === 'connected') {
                    await prisma.instance.update({ where: { id: instanceId }, data: { status: 'disconnected' } });
                }
            } catch (e) {}
        }

        if (connection === 'close') {
            connectionStatus.set(instanceId, 'close');
            qrs.delete(instanceId);
            
            if (intendedClose.has(instanceId)) {
                console.log(`[${instanceId}] Connection closed intentionally (Lazy Loading).`);
                intendedClose.delete(instanceId);
                instances.delete(instanceId);
                return;
            }

            const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                console.log(`[${instanceId}] Reconnecting in 5s...`);
                setTimeout(() => createInstance(instanceId), 5000);
            } else {
                try {
                    await prisma.instance.update({ where: { id: instanceId }, data: { status: 'disconnected', phoneNumber: null } });
                } catch (e) {}
                instances.delete(instanceId);
                socketIo.emit(`status-${instanceId}`, 'disconnected');
            }
        } else if (connection === 'open') {
            connectionStatus.set(instanceId, 'open');
            connectionEvents.emit(`open-${instanceId}`);
            qrs.delete(instanceId);
            lastPolled.delete(instanceId);
            const phoneNumber = sock.user?.id?.split(':')[0] || null;
            try {
                await prisma.instance.update({
                    where: { id: instanceId },
                    data: { status: 'connected', phoneNumber }
                });
            } catch (e) {}
            socketIo.emit(`status-${instanceId}`, 'connected');
        }
    });

    instances.set(instanceId, sock);
    return sock;
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

const doSend = async (sock: any, payload: any, instanceId: string) => {
    const formattedJid = payload.jid.includes('@') ? payload.jid : `${payload.jid}@s.whatsapp.net`;

    try {
        const [result] = await sock.onWhatsApp(formattedJid);
        if (!result || !result.exists) {
            throw new Error('Non-Whatsapp');
        }
    } catch (err: any) {
        if (err.message === 'Non-Whatsapp') throw err;
        console.warn(`[Warning] onWhatsApp check failed for ${formattedJid}, proceeding anyway.`);
    }

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
                const mediaContent = await prepareWAMessageMedia({ image: { url: p.headerImageUrl } }, { upload: sock.waUploadToServer });
                headerContent = { hasMediaAttachment: true, imageMessage: mediaContent.imageMessage };
            } catch (e) {
                console.warn('Could not prepare image header, using no header:', e);
                headerContent = { hasMediaAttachment: false };
            }
        }

        const interactiveMsg = proto.Message.InteractiveMessage.fromObject({
            header:  proto.Message.InteractiveMessage.Header.fromObject(headerContent),
            body:    proto.Message.InteractiveMessage.Body.fromObject({ text: p.body }),
            footer:  proto.Message.InteractiveMessage.Footer.fromObject({ text: p.footer || '' }),
            nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({ buttons: nativeButtons }),
        });

        const waMessage = generateWAMessageFromContent(formattedJid, proto.Message.fromObject({ interactiveMessage: interactiveMsg }), { userJid: sock.user?.id || '' });
        await sock.relayMessage(formattedJid, waMessage.message!, { messageId: waMessage.key?.id! });
        console.log(`[${instanceId}] ✅ Interactive message sent to ${payload.jid} (${nativeButtons.length} button(s))`);
    } else {
        if (payload.file) {
            const caption = payload.text ? payload.text : undefined;
            if (payload.file.mimetype.startsWith('image/')) {
                await sock.sendMessage(formattedJid, { image: { url: payload.file.url }, caption });
            } else if (payload.file.mimetype.startsWith('video/')) {
                await sock.sendMessage(formattedJid, { video: { url: payload.file.url }, caption });
            } else {
                await sock.sendMessage(formattedJid, { document: { url: payload.file.url }, mimetype: payload.file.mimetype, fileName: payload.file.fileName, caption });
            }
        } else {
            if (!payload.text) throw new Error('Message text is required');
            await sock.sendMessage(formattedJid, { text: payload.text });
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
        
        while (attempt <= 3 && !success) {
            try {
                if (connectionStatus.get(instanceId) !== 'open') {
                    const reconnected = await waitUntilConnected(instanceId);
                    if (!reconnected) throw new Error('Socket disconnected during retry wait');
                }
                
                await doSend(sock, payload, instanceId);
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
            payload.resolve();
        } else {
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
    file?: { url: string; mimetype: string; fileName: string }
) => {
    return enqueueMessage(instanceId, { isInteractive: false, jid, text, file });
};

// ─────────────────────────────────────────────
// INTERACTIVE MESSAGE (Buttons, URL, Call, Image Header)
// ─────────────────────────────────────────────

export interface InteractiveButton {
    type: 'quick_reply' | 'cta_url' | 'cta_call';
    label: string;
    id?: string;
    url?: string;
    phone?: string;
}

export interface InteractivePayload {
    headerType: 'none' | 'text' | 'image';
    headerText?: string;
    headerImageUrl?: string;
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

export const requestPairingCode = async (instanceId: string, number: string) => {
    let sock = instances.get(instanceId);
    if (!sock) {
        sock = await createInstance(instanceId);
    }
    
    const cleanNumber = number.replace(/[^0-9]/g, '');
    
    setTimeout(async () => {
        try {
            const code = await sock.requestPairingCode(cleanNumber, '');
            console.log(`[${instanceId}] Pairing code generated: ${code}`);
            socketIo.emit(`pairing-${instanceId}`, code);
        } catch (e) {
            console.error(`[${instanceId}] Pairing code error:`, e);
            socketIo.emit(`pairing-error-${instanceId}`, 'Failed to generate code. Try again.');
        }
    }, 1500);

    return true;
};
