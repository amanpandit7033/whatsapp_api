import { Router } from 'express';
import { prisma } from '../server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createInstance, sendMessage, sendInteractiveMessage, deleteInstanceSession, InteractivePayload } from '../services/whatsapp.service';
import fs from 'fs';
import multer from 'multer';
import * as XLSX from 'xlsx';
import dns from 'dns';
import { exec } from 'child_process';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
const upload = multer({ dest: 'uploads/' });

// --- AUTHENTICATION ---
// Registration disabled for public
// Use seed script or admin panel to create users.

// --- HELPER ---
const checkMessageLimit = async (userId: string): Promise<boolean> => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return false;
    const currentMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
    if ((user as any).lastMessageMonth !== currentMonth) {
        // Reset counter for new month
        await prisma.user.update({
            where: { id: userId },
            data: { messagesSentThisMonth: 0, lastMessageMonth: currentMonth }
        });
        return user.messageLimit > 0;
    }
    
    return (user as any).messagesSentThisMonth < user.messageLimit;
};

router.post('/auth/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    const isExpired = !user.isAdmin && user.expiresAt && new Date(user.expiresAt) < new Date();
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1d' });
    const userPermissions = user.isAdmin 
        ? 'instances,broadcast,filter,groups,reports,docs' 
        : (user.permissions || 'instances,broadcast,filter,groups,reports,docs');
    const isReseller = !!user.isReseller || user.role === 'reseller';
    const role = user.isAdmin ? 'admin' : (isReseller ? 'reseller' : 'user');
    res.json({ token, isAdmin: user.isAdmin, isReseller, role, isExpired, permissions: userPermissions, username: user.username });
});

// Middleware for user auth
const authenticate = async (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const decoded: any = jwt.verify(token, JWT_SECRET);
        const dbUser = await prisma.user.findUnique({ where: { id: decoded.userId } });
        
        if (!dbUser) return res.status(401).json({ error: 'User not found' });
        
        if (!dbUser.isAdmin && dbUser.expiresAt && new Date(dbUser.expiresAt) < new Date()) {
            return res.status(403).json({ error: 'Account has expired. Please contact admin.' });
        }
        
        req.user = { userId: decoded.userId, isAdmin: dbUser.isAdmin };
        next();
    } catch {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// --- USER PROFILE & PASSWORD ---
router.get('/auth/profile', authenticate, async (req: any, res: any) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.userId },
            select: {
                id: true,
                username: true,
                isAdmin: true,
                maxInstances: true,
                messageLimit: true,
                messagesSentThisMonth: true,
                expiresAt: true,
                createdAt: true,
                permissions: true,
                _count: { select: { instances: true } }
            }
        });
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ user });
    } catch (e: any) {
        res.status(500).json({ error: e.message || 'Failed to fetch profile' });
    }
});

router.put('/auth/profile', authenticate, async (req: any, res: any) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (newPassword) {
            if (!currentPassword) {
                return res.status(400).json({ error: 'Current password is required to change password' });
            }
            const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
            if (!isMatch) {
                return res.status(400).json({ error: 'Incorrect current password' });
            }
            const passwordHash = await bcrypt.hash(newPassword, 10);
            await prisma.user.update({
                where: { id: req.user.userId },
                data: { passwordHash }
            });
        }

        res.json({ success: true, message: 'Profile updated successfully' });
    } catch (e: any) {
        res.status(500).json({ error: e.message || 'Failed to update profile' });
    }
});

const generateRandomString = (length: number, upperOnly: boolean) => {
    const chars = upperOnly ? '0123456789ABCDEF' : '0123456789abcdef';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

// --- INSTANCE MANAGEMENT ---
router.post('/instances/create', authenticate, async (req: any, res: any) => {
    // Check user limits
    const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        include: { _count: { select: { instances: true } } }
    });
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user._count.instances >= user.maxInstances) {
        return res.status(403).json({ error: `Instance limit reached. Maximum allowed: ${user.maxInstances}` });
    }

    // Prevent spam by reusing existing initializing instance if one exists
    const existing = await prisma.instance.findFirst({
        where: { userId: req.user.userId, status: 'initializing' }
    });
    
    if (existing) {
        const { instances } = require('../services/whatsapp.service');
        if (!instances?.has(existing.id)) {
            await createInstance(existing.id);
        }
        return res.json({ instanceId: existing.id });
    }

    const instanceId = generateRandomString(13, true);
    
    await prisma.instance.create({
        data: {
            id: instanceId,
            userId: req.user.userId,
            status: 'initializing'
        }
    });
    
    // Trigger creation
    await createInstance(instanceId);
    
    // Garbage collection for abandoned QR scans (3 minutes)
    setTimeout(async () => {
        try {
            const inst = await prisma.instance.findUnique({ where: { id: instanceId } });
            if (inst && inst.status === 'initializing') {
                await deleteInstanceSession(instanceId);
                await prisma.instance.delete({ where: { id: instanceId } });
                const fs = require('fs');
                try { fs.rmSync(`sessions/${instanceId}`, { recursive: true, force: true }); } catch (e) {}
                console.log(`[${instanceId}] Abandoned instance garbage collected.`);
            }
        } catch (e) {}
    }, 3 * 60 * 1000);
    
    res.json({ instanceId });
});

router.get('/instances', authenticate, async (req: any, res: any) => {
    const instances = await prisma.instance.findMany({ where: { userId: req.user.userId } });
    res.json({ instances });
});

router.get('/instances/:id/qr', authenticate, async (req: any, res: any) => {
    const { qrs, lastPolled } = require('../services/whatsapp.service');
    lastPolled.set(req.params.id, Date.now());
    const qr = qrs.get(req.params.id);
    res.json({ qr: qr || null });
});


router.post('/instances/:id/logout', authenticate, async (req: any, res: any) => {
    const instanceId = req.params.id;
    const instance = await prisma.instance.findUnique({ where: { id: instanceId } });
    if (!instance || instance.userId !== req.user.userId) {
        return res.status(404).json({ error: 'Instance not found' });
    }
    
    // Send logout command to kill session
    await deleteInstanceSession(instanceId);
    
    // Wipe session folder
    try {
        fs.rmSync(`sessions/${instanceId}`, { recursive: true, force: true });
    } catch (e) {}
    
    // Update DB
    await prisma.instance.update({
        where: { id: instanceId },
        data: { status: 'disconnected', phoneNumber: null }
    });
    
    res.json({ success: true });
});

router.post('/instances/:id/start', authenticate, async (req: any, res: any) => {
    const instanceId = req.params.id;
    const instance = await prisma.instance.findUnique({ where: { id: instanceId } });
    if (!instance || instance.userId !== req.user.userId) {
        return res.status(404).json({ error: 'Instance not found' });
    }
    
    const { instances } = require('../services/whatsapp.service');
    // If not already running, start it
    if (!instances?.has(instanceId)) {
        await createInstance(instanceId);
    }
    
    res.json({ success: true });
});

router.delete('/instances/:id', authenticate, async (req: any, res: any) => {
    const instanceId = req.params.id;
    const instance = await prisma.instance.findUnique({ where: { id: instanceId } });
    if (!instance || instance.userId !== req.user.userId) {
        return res.status(404).json({ error: 'Instance not found' });
    }
    
    await deleteInstanceSession(instanceId);
    await prisma.instance.delete({ where: { id: instanceId } });
    
    try {
        fs.rmSync(`sessions/${instanceId}`, { recursive: true, force: true });
    } catch (e) {
        console.error('Could not delete session folder:', e);
    }
    
    res.json({ success: true });
});

router.post('/instances/:id/sync', authenticate, async (req: any, res: any) => {
    const instanceId = req.params.id;
    const instance = await prisma.instance.findUnique({ where: { id: instanceId } });
    if (!instance || instance.userId !== req.user.userId) {
        return res.status(404).json({ error: 'Instance not found' });
    }

    try {
        const { getSocket, waitUntilConnected } = require('../services/whatsapp.service');
        await getSocket(instanceId);
        const isOpen = await waitUntilConnected(instanceId);
        
        const updatedInst = await prisma.instance.findUnique({ where: { id: instanceId } });
        res.json({ success: true, status: updatedInst?.status || 'disconnected' });
    } catch (e: any) {
        res.json({ success: true, status: 'disconnected' });
    }
});

// --- AUTHENTICATED SEND (used by dashboard broadcast) ---
router.post('/instances/:id/send', authenticate, upload.single('file'), async (req: any, res: any) => {
    const instanceId = req.params.id;
    let number, message, media, interactive;

    if (req.body.payload) {
        try {
            const p = JSON.parse(req.body.payload);
            number = p.number;
            message = p.message;
            media = p.media;
            interactive = p.interactive;
        } catch (e) {
            return res.status(400).json({ error: 'Invalid payload JSON' });
        }
    } else {
        number = req.body.number;
        message = req.body.message;
        media = req.body.media;
        interactive = req.body.interactive;
    }

    if (req.file) {
        if (interactive && interactive.headerType === 'image') {
            interactive.headerImageUrl = req.file.path;
            interactive.isLocalFile = true;
        } else {
            media = {
                url: req.file.path,
                filename: req.file.originalname,
                isLocalFile: true
            };
        }
    }

    if (!number) return res.status(400).json({ error: 'number is required' });
    if (typeof number !== 'string' || number.includes(',')) {
        return res.status(400).json({ error: 'You can only send to 1 number at a time using this API.' });
    }

    const inst = await prisma.instance.findUnique({ where: { id: instanceId } });
    if (!inst || inst.userId !== req.user.userId) return res.status(404).json({ error: 'Instance not found' });
    if (inst.status !== 'connected') return res.status(400).json({ error: 'Instance not connected' });

    if (!(await checkMessageLimit(inst.userId))) {
        return res.status(403).json({ error: 'Monthly message limit exceeded' });
    }

    // Create DB record immediately as 'pending'
    let messageVal = message || '';
    if (interactive) {
        messageVal = JSON.stringify({
            type: 'interactive',
            body: interactive.body,
            headerType: interactive.headerType || 'none',
            headerText: interactive.headerText || '',
            headerImageUrl: interactive.headerImageUrl || '',
            isLocalFile: interactive.isLocalFile || false,
            footer: interactive.footer || '',
            buttons: interactive.buttons || [],
            usedFallback: false
        });
    } else if (media?.url) {
        messageVal = JSON.stringify({
            type: 'media',
            url: media.url,
            message: message || '',
            filename: media.filename || media.url.split('/').pop()
        });
    }

    let logRecord: any = null;
    try {
        logRecord = await prisma.messageLog.create({
            data: {
                instanceId,
                userId: req.user.userId,
                toNumber: number,
                message: messageVal,
                status: 'pending'
            }
        });

        // Increment the usage counter
        const currentMonth = new Date().toISOString().slice(0, 7);
        await prisma.user.update({
            where: { id: req.user.userId },
            data: { 
                messagesSentThisMonth: { increment: 1 }, 
                lastMessageMonth: currentMonth 
            }
        });
    } catch (dbErr) { console.error('Log error:', dbErr); }

    // Background processing
    (async () => {
        let finalStatus = 'sent';
        let usedFallback = false;

        try {
            if (interactive) {
                try {
                    await sendInteractiveMessage(instanceId, number, interactive as InteractivePayload);
                } catch (interactiveErr: any) {
                    if (interactiveErr?.message === 'Non-Whatsapp') {
                        throw interactiveErr;
                    }
                    console.error(`[${instanceId}] ❌ Interactive message FAILED — falling back to text. Reason:`, interactiveErr?.message || interactiveErr);
                    usedFallback = true;
                    const ip = interactive as InteractivePayload;
                    const fallbackLines: string[] = [];
                    if (ip.headerText) fallbackLines.push(`*${ip.headerText}*`);
                    fallbackLines.push(ip.body);
                    if (ip.footer) fallbackLines.push(`_${ip.footer}_`);
                    if (ip.buttons?.length) {
                        fallbackLines.push('');
                        ip.buttons.forEach((b: any, i: number) => {
                            if (b.type === 'cta_url') fallbackLines.push(`${i + 1}. ${b.label}: ${b.url}`);
                            else if (b.type === 'cta_call') fallbackLines.push(`${i + 1}. ${b.label}: ${b.phone}`);
                            else fallbackLines.push(`${i + 1}. ${b.label}`);
                        });
                    }
                    await sendMessage(instanceId, number, fallbackLines.join('\n'));
                }
            } else if (media?.url) {
                const lowerUrl = media.url.toLowerCase();
                let mimetype = 'application/octet-stream';
                if (lowerUrl.endsWith('.png')) mimetype = 'image/png';
                else if (lowerUrl.endsWith('.jpg') || lowerUrl.endsWith('.jpeg')) mimetype = 'image/jpeg';
                else if (lowerUrl.endsWith('.mp4')) mimetype = 'video/mp4';
                else if (lowerUrl.endsWith('.pdf')) mimetype = 'application/pdf';
                await sendMessage(instanceId, number, message || '', { url: media.url, mimetype, fileName: media.filename || media.url.split('/').pop() || 'file', isLocalFile: media.isLocalFile });
            } else {
                await sendMessage(instanceId, number, message || '');
            }
        } catch (err: any) {
            console.error('Send error:', err);
            finalStatus = err?.message === 'Non-Whatsapp' ? 'Non-Whatsapp' : 'failed';
        }

        if (logRecord) {
            try {
                // If fallback was used, update the message JSON to reflect it
                let updatedMessageVal = messageVal;
                if (interactive && usedFallback) {
                    const parsed = JSON.parse(messageVal);
                    parsed.usedFallback = true;
                    updatedMessageVal = JSON.stringify(parsed);
                }
                await prisma.messageLog.update({
                    where: { id: logRecord.id },
                    data: { status: finalStatus, message: updatedMessageVal }
                });
            } catch (updateErr) { console.error('Failed to update log status:', updateErr); }
        }
    })();

    res.json({ success: true, message: 'Message queued', message_id: logRecord?.id });
});

// --- API TO SEND MESSAGE ---
const handleSendMessage = async (req: any, res: any) => {
    const instance_id = req.body?.instance_id || req.query?.instance_id || req.body?.instanceId || req.query?.instanceId || req.body?.instance || req.query?.instance;
    const api_key = req.body?.api_key || req.query?.api_key || req.body?.apiKey || req.query?.apiKey || req.body?.access_token || req.query?.access_token || req.headers?.['x-api-key'] || (req.headers?.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : undefined);
    let number = req.body?.number || req.query?.number || req.body?.phone || req.query?.phone || req.body?.to || req.query?.to;
    const message = req.body?.message !== undefined ? req.body.message : (req.query?.message !== undefined ? req.query.message : (req.body?.body || req.query?.body));
    const media_url = req.body?.media_url || req.query?.media_url || req.body?.mediaUrl || req.query?.mediaUrl || req.body?.url || req.query?.url;
    const filename = req.body?.filename || req.query?.filename || req.body?.fileName || req.query?.fileName;

    if (!instance_id || !api_key || !number) {
        return res.status(400).json({ error: 'Missing required fields: instance_id, api_key (or access_token), number' });
    }
    number = String(number).trim();
    if (number.includes(',')) {
        return res.status(400).json({ error: 'You can only send to 1 number at a time using this API.' });
    }

    try {
        const user = await prisma.user.findFirst({ where: { OR: [{ apiKey: api_key }, { id: api_key }] } });
        if (!user) return res.status(401).json({ error: 'Invalid api_key or access_token' });
        
        if (!user.isAdmin && user.expiresAt && new Date(user.expiresAt) < new Date()) {
            return res.status(403).json({ error: 'Account has expired. Please contact admin.' });
        }

        const inst = await prisma.instance.findFirst({ where: { id: instance_id, userId: user.id } });
        if (!inst) return res.status(404).json({ error: 'Instance not found or unauthorized' });
        if (inst.status !== 'connected') {
            return res.status(400).json({ error: 'Instance is not connected' });
        }

        if (!(await checkMessageLimit(user.id))) {
            return res.status(403).json({ error: 'Monthly message limit exceeded' });
        }
        
        let fileObj = undefined;
        if (media_url) {
            let mimetype = 'application/octet-stream';
            const lowerUrl = media_url.toLowerCase();
            if (lowerUrl.endsWith('.png')) mimetype = 'image/png';
            else if (lowerUrl.endsWith('.jpg') || lowerUrl.endsWith('.jpeg')) mimetype = 'image/jpeg';
            else if (lowerUrl.endsWith('.mp4')) mimetype = 'video/mp4';
            else if (lowerUrl.endsWith('.pdf')) mimetype = 'application/pdf';
            
            fileObj = {
                url: media_url,
                mimetype,
                fileName: filename || media_url.split('/').pop() || 'attachment'
            };
        }

        let logRecord: any = null;
        try {
            logRecord = await prisma.messageLog.create({
                data: {
                    instanceId: instance_id,
                    userId: inst.userId,
                    toNumber: number,
                    message: media_url ? JSON.stringify({
                        type: 'media',
                        url: media_url,
                        message: message || '',
                        filename: filename || media_url.split('/').pop()
                    }) : (message || ''),
                    status: 'pending'
                }
            });
        } catch (dbErr) { console.error('Log error:', dbErr); }

        // Background processing
        (async () => {
            let finalStatus = 'sent';
            try {
                await sendMessage(instance_id, number, message || '', fileObj);
            } catch (err: any) {
                console.error('SEND MESSAGE ERROR:', err);
                finalStatus = err?.message === 'Non-Whatsapp' ? 'Non-Whatsapp' : 'failed';
            }
            
            if (logRecord) {
                try {
                    await prisma.messageLog.update({
                        where: { id: logRecord.id },
                        data: { status: finalStatus }
                    });
                } catch (updateErr) { console.error('Update log error:', updateErr); }
            }
        })();

        res.json({ success: true, message: 'Message queued', message_id: logRecord?.id });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
};

router.post('/message/send', handleSendMessage);
router.get('/message/send', handleSendMessage);

// --- API TO SEND INTERACTIVE MESSAGE ---
const handleSendInteractiveMessage = async (req: any, res: any) => {
    const instance_id = req.body?.instance_id || req.query?.instance_id || req.body?.instanceId || req.query?.instanceId || req.body?.instance || req.query?.instance;
    const api_key = req.body?.api_key || req.query?.api_key || req.body?.apiKey || req.query?.apiKey || req.body?.access_token || req.query?.access_token || req.headers?.['x-api-key'] || (req.headers?.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : undefined);
    let number = req.body?.number || req.query?.number || req.body?.phone || req.query?.phone || req.body?.to || req.query?.to;
    let interactive = req.body?.interactive || req.body?.payload || req.query?.interactive || req.query?.payload;

    if (typeof interactive === 'string') {
        try {
            interactive = JSON.parse(interactive);
        } catch (e) {}
    }

    // Direct URL Query Parameter Builder for Buttons
    if (!interactive || typeof interactive !== 'object') {
        const bodyText = req.query?.message || req.query?.body || req.body?.message || req.body?.body;
        if (bodyText) {
            const headerText = req.query?.header || req.body?.header || '';
            const footerText = req.query?.footer || req.body?.footer || '';
            const buttons: any[] = [];

            // URL button (e.g. url_btn=Website|https://domain.com or url=https://domain.com&url_label=Website)
            const urlBtn = req.query?.url_btn || req.body?.url_btn;
            const url = req.query?.url || req.body?.url;
            const urlLabel = req.query?.url_label || req.body?.url_label || 'Visit Website';
            if (urlBtn && typeof urlBtn === 'string' && urlBtn.includes('|')) {
                const [l, u] = urlBtn.split('|');
                buttons.push({ type: 'cta_url', label: l.trim(), url: u.trim() });
            } else if (url) {
                buttons.push({ type: 'cta_url', label: urlLabel, url });
            }

            // Call button (e.g. call_btn=Call+Us|+919876543210 or call_phone=+919876543210)
            const callBtn = req.query?.call_btn || req.body?.call_btn;
            const callPhone = req.query?.call_phone || req.body?.call_phone;
            const callLabel = req.query?.call_label || req.body?.call_label || 'Call Support';
            if (callBtn && typeof callBtn === 'string' && callBtn.includes('|')) {
                const [l, p] = callBtn.split('|');
                buttons.push({ type: 'cta_call', label: l.trim(), phone: p.trim() });
            } else if (callPhone) {
                buttons.push({ type: 'cta_call', label: callLabel, phone: callPhone });
            }

            // Quick reply button
            const replyBtn = req.query?.reply_btn || req.body?.reply_btn || req.query?.btn || req.body?.btn;
            if (replyBtn) {
                buttons.push({ type: 'quick_reply', label: String(replyBtn), id: 'quick_reply_1' });
            }

            if (buttons.length > 0) {
                interactive = {
                    headerType: headerText ? 'text' : 'none',
                    headerText,
                    body: bodyText,
                    footer: footerText,
                    buttons
                };
            }
        }
    }

    if (!instance_id || !api_key || !number || !interactive) {
        return res.status(400).json({ error: 'Missing required fields: instance_id, api_key (or access_token), number, interactive (or message + url_btn/call_btn/reply_btn)' });
    }
    number = String(number).trim();
    if (number.includes(',')) {
        return res.status(400).json({ error: 'You can only send to 1 number at a time using this API.' });
    }

    try {
        const user = await prisma.user.findFirst({ where: { OR: [{ apiKey: api_key }, { id: api_key }] } });
        if (!user) return res.status(401).json({ error: 'Invalid api_key or access_token' });
        
        if (!user.isAdmin && user.expiresAt && new Date(user.expiresAt) < new Date()) {
            return res.status(403).json({ error: 'Account has expired. Please contact admin.' });
        }

        const inst = await prisma.instance.findFirst({ where: { id: instance_id, userId: user.id } });
        if (!inst) return res.status(404).json({ error: 'Instance not found or unauthorized' });
        if (inst.status !== 'connected') {
            return res.status(400).json({ error: 'Instance is not connected' });
        }

        if (!(await checkMessageLimit(user.id))) {
            return res.status(403).json({ error: 'Monthly message limit exceeded' });
        }

        let logRecord: any = null;
        try {
            logRecord = await prisma.messageLog.create({
                data: {
                    instanceId: instance_id,
                    userId: inst.userId,
                    toNumber: number,
                    message: JSON.stringify({
                        type: 'interactive',
                        body: interactive.body,
                        headerType: interactive.headerType || 'none',
                        headerText: interactive.headerText || '',
                        headerImageUrl: interactive.headerImageUrl || '',
                        footer: interactive.footer || '',
                        buttons: interactive.buttons || [],
                        usedFallback: false
                    }),
                    status: 'pending'
                }
            });
        } catch (dbErr) { console.error('Log error:', dbErr); }

        // Background processing
        (async () => {
            let finalStatus = 'sent';
            let usedFallback = false;
            try {
                await sendInteractiveMessage(instance_id, number, interactive as InteractivePayload);
            } catch (interactiveErr: any) {
                if (interactiveErr?.message === 'Non-Whatsapp') {
                    finalStatus = 'Non-Whatsapp';
                } else {
                    console.error(`[${instance_id}] Interactive message FAILED via API — falling back to text. Reason:`, interactiveErr?.message || interactiveErr);
                    usedFallback = true;
                    // Build a plain-text fallback from the interactive payload
                    const ip = interactive as InteractivePayload;
                    const fallbackLines: string[] = [];
                    if (ip.headerText) fallbackLines.push(`*${ip.headerText}*`);
                    fallbackLines.push(ip.body);
                    if (ip.footer) fallbackLines.push(`_${ip.footer}_`);
                    if (ip.buttons?.length) {
                        fallbackLines.push('');
                        ip.buttons.forEach((b: any, i: number) => {
                            if (b.type === 'cta_url') fallbackLines.push(`${i + 1}. ${b.label}: ${b.url}`);
                            else if (b.type === 'cta_call') fallbackLines.push(`${i + 1}. ${b.label}: ${b.phone}`);
                            else fallbackLines.push(`${i + 1}. ${b.label}`);
                        });
                    }
                    try {
                        await sendMessage(instance_id, number, fallbackLines.join('\n'));
                    } catch (fallbackErr: any) {
                        console.error('Fallback SEND MESSAGE ERROR:', fallbackErr);
                        finalStatus = fallbackErr?.message === 'Non-Whatsapp' ? 'Non-Whatsapp' : 'failed';
                    }
                }
            }
            
            if (logRecord) {
                try {
                    let updatedMessageVal = JSON.stringify({
                        type: 'interactive',
                        body: interactive.body,
                        headerType: interactive.headerType || 'none',
                        headerText: interactive.headerText || '',
                        headerImageUrl: interactive.headerImageUrl || '',
                        footer: interactive.footer || '',
                        buttons: interactive.buttons || [],
                        usedFallback
                    });
                    
                    await prisma.messageLog.update({
                        where: { id: logRecord.id },
                        data: { status: finalStatus, message: updatedMessageVal }
                    });
                } catch (updateErr) { console.error('Update log error:', updateErr); }
            }
        })();

        res.json({ success: true, message: 'Message queued', message_id: logRecord?.id });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
};

router.post('/message/send-interactive', handleSendInteractiveMessage);
router.get('/message/send-interactive', handleSendInteractiveMessage);
router.post('/send-button', handleSendInteractiveMessage);
router.get('/send-button', handleSendInteractiveMessage);
router.post('/send_button', handleSendInteractiveMessage);
router.get('/send_button', handleSendInteractiveMessage);

// --- API TO CHECK MESSAGE STATUS ---
const handleMessageStatus = async (req: any, res: any) => {
    const api_key = req.query.api_key || req.body.api_key;
    const message_id = req.query.message_id || req.body.message_id;

    if (!api_key || !message_id) {
        return res.status(400).json({ error: 'Missing required fields: api_key, message_id' });
    }

    try {
        const user = await prisma.user.findUnique({ where: { apiKey: api_key } });
        if (!user) return res.status(401).json({ error: 'Invalid api_key' });

        const log = await prisma.messageLog.findFirst({
            where: { id: message_id, userId: user.id },
            select: { id: true, toNumber: true, status: true, createdAt: true }
        });

        if (!log) {
            return res.status(404).json({ error: 'Message not found or unauthorized' });
        }

        res.json({ success: true, message_id: log.id, number: log.toNumber, status: log.status, created_at: log.createdAt });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
};

router.get('/message/status', handleMessageStatus);
router.post('/message/status', handleMessageStatus);

router.post('/message/broadcast', authenticate, upload.single('file'), async (req: any, res: any) => {
    try {
        const { instances, numbers, message } = req.body;
        const instanceIds = JSON.parse(instances);
        const targetNumbers = JSON.parse(numbers);
        
        const file = req.file ? {
            url: req.file.path,
            mimetype: req.file.mimetype,
            fileName: req.file.originalname
        } : undefined;

        if (!instanceIds.length || !targetNumbers.length) {
            return res.status(400).json({ error: 'Instances and numbers are required' });
        }

        let sentCount = 0;
        const failed: string[] = [];

        const userLimit = await prisma.user.findUnique({ where: { id: req.user.userId } });
        const currentMonth = new Date().toISOString().slice(0, 7);
        let currentMonthCount = (userLimit as any)?.messagesSentThisMonth || 0;
        if ((userLimit as any)?.lastMessageMonth !== currentMonth) {
            currentMonthCount = 0;
        }

        // Round-robin distribution
        for (let i = 0; i < targetNumbers.length; i++) {
            if (userLimit && currentMonthCount >= userLimit.messageLimit) {
                failed.push(targetNumbers[i] + ' (Limit Exceeded)');
                continue;
            }
            currentMonthCount++;
            const number = targetNumbers[i];
            const instanceId = instanceIds[i % instanceIds.length];
            
            let status = 'sent';
            try {
                await sendMessage(instanceId, number, message || '', file);
                sentCount++;
            } catch (err: any) {
                console.error(`Failed to send to ${number} via ${instanceId}:`, err);
                if (err?.message === 'Non-Whatsapp') {
                    failed.push(`${number} (Non-Whatsapp)`);
                    status = 'Non-Whatsapp';
                } else {
                    failed.push(number);
                    status = 'failed';
                }
            }

            // Log it
            try {
                await prisma.messageLog.create({
                    data: {
                        instanceId,
                        userId: req.user.userId,
                        toNumber: number,
                        message: file ? JSON.stringify({
                            type: 'media',
                            url: file.url,
                            message: message || '',
                            filename: file.fileName || 'file'
                        }) : (message || ''),
                        status
                    }
                });
            } catch (dbErr) {
                console.error('Failed to log message:', dbErr);
            }
        }

        res.json({ success: true, sentCount, failed });
    } catch (err) {
        console.error('Broadcast error:', err);
        res.status(500).json({ error: 'Broadcast failed' });
    }
});

// --- REPORTS ---
router.get('/reports', authenticate, async (req: any, res: any) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const searchNumber = req.query.searchNumber || '';
        const searchMessage = req.query.searchMessage || '';
        const searchUsername = req.query.searchUsername || '';
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;

        const where: any = req.user.isAdmin ? {} : { userId: req.user.userId };

        if (searchUsername && req.user.isAdmin) {
            where.user = { username: { contains: searchUsername } };
        }

        if (searchNumber) {
            where.toNumber = { contains: searchNumber };
        }
        if (searchMessage) {
            where.message = { contains: searchMessage };
        }
        
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                where.createdAt.lte = end;
            }
        }

        const totalCount = await prisma.messageLog.count({ where });
        const logs = await prisma.messageLog.findMany({
            where,
            include: { instance: true, user: { select: { username: true } } },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit
        });

        res.json({ reports: logs, totalCount, page, limit });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch reports' });
    }
});

router.get('/reports/stats', authenticate, async (req: any, res: any) => {
    try {
        const where: any = req.user.isAdmin ? {} : { userId: req.user.userId };
        const stats = [];
        const today = new Date();
        
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            d.setHours(0, 0, 0, 0);
            
            const start = new Date(d);
            const end = new Date(d);
            end.setHours(23, 59, 59, 999);
            
            const count = await prisma.messageLog.count({
                where: {
                    ...where,
                    createdAt: {
                        gte: start,
                        lte: end
                    }
                }
            });
            
            stats.push({
                day: d.toLocaleDateString('en-US', { weekday: 'short' }),
                count
            });
        }

        // Fetch Real Message Type Breakdown & Delivery SLA
        const totalLogs = await prisma.messageLog.count({ where });
        const sentLogs = await prisma.messageLog.count({ where: { ...where, status: 'sent' } });
        const failedLogs = await prisma.messageLog.count({ where: { ...where, status: { in: ['failed', 'Non-Whatsapp'] } } });

        const mediaLogs = await prisma.messageLog.count({
            where: {
                ...where,
                message: { contains: '"type":"media"' }
            }
        });

        const interactiveLogs = await prisma.messageLog.count({
            where: {
                ...where,
                message: { contains: '"type":"interactive"' }
            }
        });

        const textLogs = Math.max(0, totalLogs - mediaLogs - interactiveLogs);
        const successRate = totalLogs > 0 ? Math.round((sentLogs / totalLogs) * 100) : 100;
        
        res.json({ 
            stats,
            totalLogs,
            messageTypes: { text: textLogs, media: mediaLogs, interactive: interactiveLogs },
            deliverySla: { sent: sentLogs, failed: failedLogs, successRate }
        });
    } catch (err) {
        console.error('Stats fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

router.get('/reports/export', authenticate, async (req: any, res: any) => {
    try {
        const searchNumber = req.query.searchNumber || '';
        const searchMessage = req.query.searchMessage || '';
        const searchUsername = req.query.searchUsername || '';
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;

        const where: any = req.user.isAdmin ? {} : { userId: req.user.userId };

        if (searchUsername && req.user.isAdmin) {
            where.user = { username: { contains: searchUsername } };
        }

        if (searchNumber) where.toNumber = { contains: searchNumber };
        if (searchMessage) where.message = { contains: searchMessage };
        
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                where.createdAt.lte = end;
            }
        }

        const logs = await prisma.messageLog.findMany({
            where,
            include: { instance: true, user: { select: { username: true } } },
            orderBy: { createdAt: 'desc' }
        });

        // Convert to Excel
        const data = logs.map(log => ({
            'Date': new Date(log.createdAt).toLocaleString(),
            'Owner': (log as any).user?.username || 'Unknown',
            'Instance ID': log.instanceId,
            'Sender Number': log.instance?.phoneNumber || 'Unknown',
            'Recipient': log.toNumber,
            'Message': log.message || '',
            'Status': log.status
        }));

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Reports');

        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Disposition', 'attachment; filename="reports.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (err) {
        res.status(500).json({ error: 'Failed to export reports' });
    }
});

// --- ADMIN REPORTS ---
router.delete('/admin/reports/clear', authenticate, async (req: any, res: any) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
        if (!user || !user.isAdmin) return res.status(403).json({ error: 'Admin access required' });

        const searchNumber = req.query.searchNumber || '';
        const searchMessage = req.query.searchMessage || '';
        const searchUsername = req.query.searchUsername || '';
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;

        const where: any = {};

        if (searchUsername) where.user = { username: { contains: searchUsername } };
        if (searchNumber) where.toNumber = { contains: searchNumber };
        if (searchMessage) where.message = { contains: searchMessage };
        
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                where.createdAt.lte = end;
            }
        }

        const deleteResult = await prisma.messageLog.deleteMany({ where });
        res.json({ success: true, message: `Deleted ${deleteResult.count} reports.` });
    } catch (err) {
        res.status(500).json({ error: 'Failed to clear reports' });
    }
});

// --- USER ACCOUNT ---
const adminAuthenticate = async (req: any, res: any, next: any) => {
    authenticate(req, res, async () => {
        const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
        if (!user || !user.isAdmin) return res.status(403).json({ error: 'Admin access required' });
        next();
    });
};

router.get('/me', authenticate, async (req: any, res: any) => {
    try {
        let user = await prisma.user.findUnique({ where: { id: req.user.userId } });
        if (!user) return res.status(404).json({ error: 'User not found' });
        
        if (!user.apiKey || user.apiKey.length !== 13) {
            const newKey = require('crypto').randomBytes(7).toString('hex').substring(0, 13);
            user = await prisma.user.update({
                where: { id: user.id },
                data: { apiKey: newKey }
            });
        }
        
        const currentMonth = new Date().toISOString().slice(0, 7);
        let messagesSentThisMonth = (user as any).messagesSentThisMonth || 0;
        if ((user as any).lastMessageMonth !== currentMonth) {
            messagesSentThisMonth = 0;
        }
        
        const userPermissions = user.isAdmin 
            ? 'instances,broadcast,filter,groups,reports,docs' 
            : (user.permissions || 'instances,broadcast,filter,groups,reports,docs');
        const isReseller = !!user.isReseller || user.role === 'reseller';
        const role = user.isAdmin ? 'admin' : (isReseller ? 'reseller' : 'user');
        res.json({ username: user.username, apiKey: user.apiKey, isAdmin: user.isAdmin, isReseller, role, maxInstances: user.maxInstances, messageLimit: user.messageLimit, messagesSentThisMonth, permissions: userPermissions });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

// --- ADMIN MANAGEMENT ---
router.post('/admin/users', adminAuthenticate, async (req: any, res: any) => {
    try {
        const { username, password, maxInstances, messageLimit, expiresAt, permissions, isReseller, role } = req.body;
        const passwordHash = await bcrypt.hash(password, 10);
        const resolvedRole = isReseller ? 'reseller' : (role || 'user');
        const data: any = { 
            username: username.trim(), 
            passwordHash, 
            isReseller: Boolean(isReseller),
            role: resolvedRole,
            maxInstances: Number(maxInstances) || 1, 
            messageLimit: Number(messageLimit) || 1000,
            apiKey: require('crypto').randomBytes(7).toString('hex').substring(0, 13)
        };
        if (expiresAt) {
            data.expiresAt = new Date(expiresAt);
        }
        if (permissions) {
            data.permissions = permissions;
        }
        const user = await prisma.user.create({ data });
        res.json({ message: 'User created successfully', user: { id: user.id, username: user.username } });
    } catch (e: any) {
        res.status(400).json({ error: 'Username already exists' });
    }
});

router.put('/admin/users/:id', adminAuthenticate, async (req: any, res: any) => {
    try {
        const { username, password, maxInstances, isAdmin, isReseller, role, messageLimit, expiresAt, permissions } = req.body;
        const data: any = {};
        if (username) data.username = username.trim();
        if (password) data.passwordHash = await bcrypt.hash(password, 10);
        if (maxInstances !== undefined) data.maxInstances = Number(maxInstances);
        if (isAdmin !== undefined) data.isAdmin = Boolean(isAdmin);
        if (isReseller !== undefined) {
            data.isReseller = Boolean(isReseller);
            data.role = Boolean(isReseller) ? 'reseller' : (role || 'user');
        } else if (role !== undefined) {
            data.role = role;
            data.isReseller = role === 'reseller';
        }
        if (messageLimit !== undefined) data.messageLimit = Number(messageLimit);
        if (expiresAt !== undefined) {
            data.expiresAt = expiresAt ? new Date(expiresAt) : null;
        }
        if (permissions !== undefined) data.permissions = permissions;

        const user = await prisma.user.update({
            where: { id: req.params.id },
            data
        });
        res.json({ message: 'User updated successfully' });
    } catch (e: any) {
        res.status(400).json({ error: 'Failed to update user. Username may already exist.' });
    }
});

router.get('/admin/users', adminAuthenticate, async (req: any, res: any) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = req.query.search || '';
    const skip = (page - 1) * limit;

    const where = search ? { username: { contains: search } } : {};
    
    const [users, total] = await Promise.all([
        prisma.user.findMany({
            where,
            skip,
            take: limit,
            select: { 
                id: true, 
                username: true, 
                isAdmin: true, 
                isReseller: true,
                role: true,
                resellerId: true,
                reseller: { select: { username: true } },
                maxInstances: true, 
                messageLimit: true, 
                expiresAt: true, 
                permissions: true, 
                createdAt: true, 
                _count: { select: { instances: true, clients: true } } 
            },
            orderBy: { createdAt: 'desc' }
        }),
        prisma.user.count({ where })
    ]);

    res.json({ users, total, page, totalPages: Math.ceil(total / limit) });
});

// --- RESELLER MANAGEMENT ENDPOINTS ---

const resellerAuthenticate = async (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const decoded: any = jwt.verify(token, JWT_SECRET);
        const dbUser = await prisma.user.findUnique({ where: { id: decoded.userId } });
        
        if (!dbUser) return res.status(401).json({ error: 'User not found' });
        
        if (!dbUser.isAdmin && dbUser.expiresAt && new Date(dbUser.expiresAt) < new Date()) {
            return res.status(403).json({ error: 'Account has expired. Please contact admin.' });
        }
        
        if (!dbUser.isAdmin && !dbUser.isReseller && dbUser.role !== 'reseller') {
            return res.status(403).json({ error: 'Forbidden: Reseller access required' });
        }
        
        req.user = { userId: dbUser.id, isAdmin: dbUser.isAdmin, isReseller: dbUser.isReseller };
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

// Get Reseller Quotas & Stats
router.get('/reseller/stats', resellerAuthenticate, async (req: any, res: any) => {
    try {
        const reseller = await prisma.user.findUnique({
            where: { id: req.user.userId },
            include: {
                clients: {
                    select: {
                        id: true,
                        maxInstances: true,
                        messageLimit: true,
                        expiresAt: true,
                        _count: { select: { instances: true } }
                    }
                }
            }
        });

        if (!reseller) return res.status(404).json({ error: 'Reseller not found' });

        const totalClients = reseller.clients.length;
        const activeClients = reseller.clients.filter(c => !c.expiresAt || new Date(c.expiresAt) >= new Date()).length;
        const allocatedInstances = reseller.clients.reduce((acc, c) => acc + c.maxInstances, 0);
        const actualActiveInstances = reseller.clients.reduce((acc, c) => acc + c._count.instances, 0);
        const allocatedMessages = reseller.clients.reduce((acc, c) => acc + c.messageLimit, 0);

        res.json({
            masterMaxInstances: reseller.maxInstances,
            masterMessageLimit: reseller.messageLimit,
            allocatedInstances,
            remainingInstances: Math.max(0, reseller.maxInstances - allocatedInstances),
            actualActiveInstances,
            allocatedMessages,
            remainingMessages: Math.max(0, reseller.messageLimit - allocatedMessages),
            totalClients,
            activeClients
        });
    } catch (e: any) {
        console.error('Reseller stats error:', e);
        res.status(500).json({ error: 'Failed to fetch reseller stats' });
    }
});

// List Reseller's Clients
router.get('/reseller/clients', resellerAuthenticate, async (req: any, res: any) => {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;
        const search = req.query.search || '';
        const skip = (page - 1) * limit;

        const where: any = {
            resellerId: req.user.userId,
            ...(search ? { username: { contains: search } } : {})
        };

        const [clients, total] = await Promise.all([
            prisma.user.findMany({
                where,
                skip,
                take: limit,
                select: {
                    id: true,
                    username: true,
                    maxInstances: true,
                    messageLimit: true,
                    expiresAt: true,
                    permissions: true,
                    createdAt: true,
                    _count: { select: { instances: true } }
                },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.user.count({ where })
        ]);

        res.json({
            clients,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        });
    } catch (e: any) {
        console.error('Reseller clients fetch error:', e);
        res.status(500).json({ error: 'Failed to fetch clients' });
    }
});

// Create Client under Reseller
router.post('/reseller/clients', resellerAuthenticate, async (req: any, res: any) => {
    try {
        const { username, password, maxInstances, messageLimit, expiresAt, permissions } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });

        const reqInstances = Number(maxInstances) || 1;
        const reqMessages = Number(messageLimit) || 1000;

        // Check reseller quota pool
        const reseller = await prisma.user.findUnique({
            where: { id: req.user.userId },
            include: { clients: { select: { maxInstances: true, messageLimit: true } } }
        });

        if (!reseller) return res.status(404).json({ error: 'Reseller not found' });

        if (!reseller.isAdmin) {
            const currentAllocatedInstances = reseller.clients.reduce((acc, c) => acc + c.maxInstances, 0);
            if (currentAllocatedInstances + reqInstances > reseller.maxInstances) {
                return res.status(400).json({
                    error: `Instances quota exceeded! You have ${Math.max(0, reseller.maxInstances - currentAllocatedInstances)} instance(s) remaining in your master pool.`
                });
            }

            const currentAllocatedMessages = reseller.clients.reduce((acc, c) => acc + c.messageLimit, 0);
            if (currentAllocatedMessages + reqMessages > reseller.messageLimit) {
                return res.status(400).json({
                    error: `Message limit quota exceeded! You have ${Math.max(0, reseller.messageLimit - currentAllocatedMessages)} message quota remaining in your master pool.`
                });
            }
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const data: any = {
            username: username.trim(),
            passwordHash,
            role: 'user',
            isReseller: false,
            resellerId: req.user.userId,
            maxInstances: reqInstances,
            messageLimit: reqMessages,
            permissions: permissions || 'instances,broadcast,filter,groups,reports,docs',
            apiKey: require('crypto').randomBytes(7).toString('hex').substring(0, 13)
        };

        if (expiresAt) {
            data.expiresAt = new Date(expiresAt);
        }

        const newClient = await prisma.user.create({ data });
        res.json({
            message: 'Client account created successfully',
            client: { id: newClient.id, username: newClient.username }
        });
    } catch (e: any) {
        if (e.code === 'P2002') {
            return res.status(400).json({ error: 'Username already exists' });
        }
        res.status(500).json({ error: e.message || 'Failed to create client' });
    }
});

// Update Client under Reseller
router.put('/reseller/clients/:id', resellerAuthenticate, async (req: any, res: any) => {
    try {
        const { id } = req.params;
        const { username, password, maxInstances, messageLimit, expiresAt, permissions } = req.body;

        const targetClient = await prisma.user.findFirst({
            where: { id, ...(req.user.isAdmin ? {} : { resellerId: req.user.userId }) }
        });

        if (!targetClient) {
            return res.status(404).json({ error: 'Client not found or unauthorized' });
        }

        const data: any = {};
        if (username) data.username = username.trim();
        if (password) data.passwordHash = await bcrypt.hash(password, 10);
        if (expiresAt !== undefined) data.expiresAt = expiresAt ? new Date(expiresAt) : null;
        if (permissions !== undefined) data.permissions = permissions;

        const reseller = await prisma.user.findUnique({
            where: { id: req.user.userId },
            include: { clients: { select: { id: true, maxInstances: true, messageLimit: true } } }
        });

        if (maxInstances !== undefined) {
            const newInst = Number(maxInstances);
            if (!req.user.isAdmin && reseller) {
                const otherAllocated = reseller.clients.filter(c => c.id !== id).reduce((acc, c) => acc + c.maxInstances, 0);
                if (otherAllocated + newInst > reseller.maxInstances) {
                    return res.status(400).json({ error: `Cannot allocate ${newInst} instances. Reseller pool limit exceeded.` });
                }
            }
            data.maxInstances = newInst;
        }

        if (messageLimit !== undefined) {
            const newMsg = Number(messageLimit);
            if (!req.user.isAdmin && reseller) {
                const otherAllocatedMsg = reseller.clients.filter(c => c.id !== id).reduce((acc, c) => acc + c.messageLimit, 0);
                if (otherAllocatedMsg + newMsg > reseller.messageLimit) {
                    return res.status(400).json({ error: `Cannot allocate ${newMsg} messages. Reseller pool limit exceeded.` });
                }
            }
            data.messageLimit = newMsg;
        }

        await prisma.user.update({
            where: { id },
            data
        });

        res.json({ message: 'Client updated successfully' });
    } catch (e: any) {
        if (e.code === 'P2002') {
            return res.status(400).json({ error: 'Username already taken' });
        }
        res.status(500).json({ error: e.message || 'Failed to update client' });
    }
});

// Delete Client (Super Admin Only - Resellers cannot delete users)
router.delete('/reseller/clients/:id', resellerAuthenticate, async (req: any, res: any) => {
    try {
        if (!req.user.isAdmin) {
            return res.status(403).json({ error: 'Permission denied. Resellers cannot delete client accounts. Please contact Super Admin.' });
        }

        const { id } = req.params;
        const targetClient = await prisma.user.findUnique({
            where: { id }
        });

        if (!targetClient) {
            return res.status(404).json({ error: 'Client not found' });
        }

        await prisma.user.delete({ where: { id } });
        res.json({ message: 'Client deleted successfully' });
    } catch (e: any) {
        res.status(500).json({ error: e.message || 'Failed to delete client' });
    }
});

// --- WHITE-LABEL & CUSTOM DOMAIN APIS ---

// Public branding endpoint (detects custom domain hostname and returns white-label branding)
router.get('/branding', async (req: any, res: any) => {
    try {
        const rawHost = req.query.host || req.headers.host || req.hostname || '';
        const host = rawHost.split(':')[0].toLowerCase().trim();

        if (host && host !== 'localhost' && host !== '127.0.0.1') {
            const user = await prisma.user.findFirst({
                where: { customDomain: host, domainStatus: 'active' },
                select: { brandName: true, brandLogoUrl: true, brandThemeColor: true, customDomain: true }
            });

            if (user) {
                return res.json({
                    isCustom: true,
                    brandName: user.brandName || 'WhatsApp Gateway',
                    brandLogoUrl: user.brandLogoUrl || null,
                    brandThemeColor: user.brandThemeColor || '#2563EB',
                    customDomain: user.customDomain
                });
            }
        }

        res.json({
            isCustom: false,
            brandName: 'WhatsApp Gateway',
            brandLogoUrl: null,
            brandThemeColor: '#2563EB',
            customDomain: null
        });
    } catch (e: any) {
        res.json({
            isCustom: false,
            brandName: 'WhatsApp Gateway',
            brandLogoUrl: null,
            brandThemeColor: '#2563EB',
            customDomain: null
        });
    }
});

// Helper to automatically detect server's actual public IPv4 address dynamically
let cachedPublicIp: string | null = null;
const getPublicServerIp = async (): Promise<string> => {
    if (process.env.SERVER_IP) return process.env.SERVER_IP.trim();
    if (cachedPublicIp) return cachedPublicIp;

    try {
        const https = require('https');
        const ip = await new Promise<string>((resolve, reject) => {
            const req = https.get('https://api.ipify.org', { timeout: 4000 }, (res: any) => {
                let data = '';
                res.on('data', (chunk: any) => data += chunk);
                res.on('end', () => resolve(data.trim()));
            });
            req.on('error', reject);
            req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
        });
        if (ip && /^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) {
            cachedPublicIp = String(ip);
            return cachedPublicIp;
        }
    } catch (e) {
        try {
            const os = require('os');
            const interfaces = os.networkInterfaces();
            for (const name of Object.keys(interfaces)) {
                for (const iface of interfaces[name] || []) {
                    if (iface && iface.family === 'IPv4' && !iface.internal && iface.address) {
                        cachedPublicIp = String(iface.address);
                        return cachedPublicIp;
                    }
                }
            }
        } catch {}
    }

    return '104.251.211.226';
};

// ==========================================
// ADMIN WHITE-LABEL & CUSTOM DOMAIN MANAGEMENT
// ==========================================

// Get All Users and Domain Settings (Admin Only)
router.get('/admin/domains', adminAuthenticate, async (req: any, res: any) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                username: true,
                role: true,
                isReseller: true,
                isAdmin: true,
                customDomain: true,
                domainStatus: true,
                domainSslActive: true,
                brandName: true,
                brandLogoUrl: true,
                brandThemeColor: true,
                createdAt: true,
                _count: { select: { instances: true } }
            },
            orderBy: [
                { customDomain: 'desc' },
                { createdAt: 'desc' }
            ]
        });

        const serverIp = await getPublicServerIp();

        res.json({
            serverIp,
            users
        });
    } catch (e: any) {
        res.status(500).json({ error: e.message || 'Failed to fetch domain management data' });
    }
});

// Admin Connect / Verify Custom Domain for Any User
router.post('/admin/domains/verify', adminAuthenticate, async (req: any, res: any) => {
    try {
        const { targetUserId, domain, brandName, brandLogoUrl, brandThemeColor } = req.body;
        if (!targetUserId) {
            return res.status(400).json({ error: 'Target user ID is required' });
        }
        if (!domain || typeof domain !== 'string') {
            return res.status(400).json({ error: 'Domain name is required' });
        }

        const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
        if (!targetUser) {
            return res.status(404).json({ error: 'Target user account not found' });
        }

        // Clean and normalize domain name
        const cleanDomain = domain
            .toLowerCase()
            .trim()
            .replace(/^https?:\/\//i, '')
            .replace(/\/.*$/, '')
            .split(':')[0];

        const domainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/i;
        if (!domainRegex.test(cleanDomain)) {
            return res.status(400).json({ error: 'Invalid domain format. Example: portal.mybrand.com' });
        }

        // Prohibit system domains
        const reservedDomains = ['localhost', '127.0.0.1', 'wap.ut1.in'];
        if (reservedDomains.includes(cleanDomain)) {
            return res.status(400).json({ error: 'This domain name is reserved by the system.' });
        }

        // Check if already claimed by another user
        const existing = await prisma.user.findFirst({
            where: {
                customDomain: cleanDomain,
                id: { not: targetUserId }
            }
        });
        if (existing) {
            return res.status(400).json({ error: `This domain is already assigned to user "${existing.username}".` });
        }

        const serverIp = await getPublicServerIp();

        // Perform real DNS A-Record verification
        let resolvedIps: string[] = [];
        try {
            resolvedIps = await dns.promises.resolve4(cleanDomain);
        } catch (err: any) {
            return res.status(400).json({
                error: `DNS resolution failed for "${cleanDomain}". Please create an A-Record in your DNS provider pointing to ${serverIp}.`
            });
        }

        const isMatch = resolvedIps.includes(serverIp) || process.env.NODE_ENV !== 'production';
        if (!isMatch) {
            return res.status(400).json({
                error: `DNS Mismatch: "${cleanDomain}" points to [${resolvedIps.join(', ')}], but server IP is ${serverIp}. Please update your DNS A-Record.`
            });
        }

        // On Linux production servers, trigger automated Nginx vhost creation & Certbot SSL hook
        if (process.platform === 'linux') {
            try {
                const possiblePaths = [
                    '/var/www/whatsapp_api/frontend/dist',
                    '/var/www/html/dist',
                    '/var/www/html'
                ];
                let webRoot = '/var/www/whatsapp_api/frontend/dist';
                for (const p of possiblePaths) {
                    if (fs.existsSync(p)) {
                        webRoot = p;
                        break;
                    }
                }

                const nginxConf = `server {
    listen 80;
    server_name ${cleanDomain};
    root ${webRoot};
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}`;

                const tempFile = `/tmp/${cleanDomain}.conf`;
                fs.writeFileSync(tempFile, nginxConf);
                const provisionCmd = `sudo cp ${tempFile} /etc/nginx/sites-available/${cleanDomain} && sudo ln -sf /etc/nginx/sites-available/${cleanDomain} /etc/nginx/sites-enabled/${cleanDomain} && sudo systemctl reload nginx && sudo certbot --nginx -d ${cleanDomain} --non-interactive --agree-tos --register-unsafely-without-email --redirect || true`;
                
                exec(provisionCmd, (err, stdout, stderr) => {
                    console.log(`[Auto-Nginx & SSL] Provisioned ${cleanDomain}:`, stdout || stderr);
                    exec('sudo systemctl reload nginx || true');
                });
            } catch (e) {
                console.warn('[SSL Hook Error]:', e);
            }
        }

        const updated = await prisma.user.update({
            where: { id: targetUserId },
            data: {
                customDomain: cleanDomain,
                domainStatus: 'active',
                domainSslActive: true,
                brandName: (brandName || '').trim() || null,
                brandLogoUrl: (brandLogoUrl || '').trim() || null,
                brandThemeColor: (brandThemeColor || '#2563EB').trim()
            }
        });

        res.json({
            message: `Domain "${cleanDomain}" successfully assigned to ${targetUser.username} & SSL activated!`,
            user: updated
        });
    } catch (e: any) {
        res.status(500).json({ error: e.message || 'Failed to verify domain' });
    }
});

// Admin Remove Custom Domain from Any User
router.delete('/admin/domains/:userId', adminAuthenticate, async (req: any, res: any) => {
    try {
        const { userId } = req.params;
        const targetUser = await prisma.user.findUnique({ where: { id: userId } });
        if (targetUser?.customDomain && process.platform === 'linux') {
            try {
                exec(`sudo rm -f /etc/nginx/sites-enabled/${targetUser.customDomain} /etc/nginx/sites-available/${targetUser.customDomain} && sudo systemctl reload nginx || true`);
            } catch (e) {}
        }

        await prisma.user.update({
            where: { id: userId },
            data: {
                customDomain: null,
                domainStatus: 'none',
                domainSslActive: false,
                brandName: null,
                brandLogoUrl: null
            }
        });
        res.json({ message: 'Custom domain removed successfully' });
    } catch (e: any) {
        res.status(500).json({ error: e.message || 'Failed to remove custom domain' });
    }
});

// --- CLIENT APIS ---
const clientAuthenticate = async (req: any, res: any, next: any) => {
    const apiKey = req.query.api_key;
    if (!apiKey) return res.status(401).json({ error: 'API key is required' });
    try {
        const user = await prisma.user.findUnique({ where: { apiKey } });
        if (!user) return res.status(401).json({ error: 'Invalid API key' });
        
        if (!user.isAdmin && user.expiresAt && new Date(user.expiresAt) < new Date()) {
            return res.status(403).json({ error: 'Account has expired. Please contact admin.' });
        }
        
        req.user = { userId: user.id };
        next();
    } catch (e) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

router.post('/client/instance/create', clientAuthenticate, async (req: any, res: any) => {
    try {
        // Check user limits
        const user = await prisma.user.findUnique({
            where: { id: req.user.userId },
            include: { _count: { select: { instances: true } } }
        });
        
        if (!user) return res.status(404).json({ error: 'User not found' });
        if (user._count.instances >= user.maxInstances) {
            return res.status(403).json({ error: `Instance limit reached. Maximum allowed: ${user.maxInstances}` });
        }

        // Prevent spam by reusing existing initializing instance if one exists
        const existing = await prisma.instance.findFirst({
            where: { userId: req.user.userId, status: 'initializing' }
        });
        
        if (existing) {
            const { instances } = require('../services/whatsapp.service');
            if (!instances?.has(existing.id)) {
                await createInstance(existing.id);
            }
            return res.json({ instance_id: existing.id });
        }

        const instanceId = generateRandomString(13, true);
        
        await prisma.instance.create({
            data: {
                id: instanceId,
                userId: req.user.userId,
                status: 'initializing'
            }
        });
        
        await createInstance(instanceId);
        
        // Garbage collection for abandoned client instances (3 minutes)
        setTimeout(async () => {
            try {
                const inst = await prisma.instance.findUnique({ where: { id: instanceId } });
                if (inst && inst.status === 'initializing') {
                    await deleteInstanceSession(instanceId);
                    await prisma.instance.delete({ where: { id: instanceId } });
                    const fs = require('fs');
                    try { fs.rmSync(`sessions/${instanceId}`, { recursive: true, force: true }); } catch (e) {}
                }
            } catch (e) {}
        }, 3 * 60 * 1000);

        res.json({ instance_id: instanceId });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/client/instance/reconnect', clientAuthenticate, async (req: any, res: any) => {
    const { instance_id } = req.body;
    if (!instance_id) return res.status(400).json({ error: 'instance_id required' });

    const inst = await prisma.instance.findFirst({ where: { id: instance_id, userId: req.user.userId } });
    if (!inst) return res.status(404).json({ error: 'Instance not found or unauthorized' });

    const { instances } = require('../services/whatsapp.service');
    // If not already running, start it so QR can be generated
    if (!instances?.has(instance_id)) {
        await createInstance(instance_id);
    }
    
    res.json({ success: true, message: 'Instance reconnect sequence started. Please poll /client/instance/qr for the new QR code.' });
});


router.get('/client/instance/qr', clientAuthenticate, async (req: any, res: any) => {
    const { instance_id } = req.query;
    if (!instance_id) return res.status(400).json({ error: 'instance_id required' });

    const inst = await prisma.instance.findFirst({ where: { id: instance_id, userId: req.user.userId } });
    if (!inst) return res.status(404).json({ error: 'Instance not found or unauthorized' });

    if (inst.status === 'connected') return res.status(400).json({ error: 'Instance already connected' });

    const { qrs } = require('../services/whatsapp.service');
    const qrData = qrs.get(instance_id);
    
    if (!qrData) return res.status(404).json({ error: 'QR code not ready yet, keep polling' });
    res.json({ qr: qrData });
});

router.get('/client/instance/status', clientAuthenticate, async (req: any, res: any) => {
    const { instance_id } = req.query;
    if (!instance_id) return res.status(400).json({ error: 'instance_id required' });

    const inst = await prisma.instance.findFirst({ where: { id: instance_id, userId: req.user.userId } });
    if (!inst) return res.status(404).json({ error: 'Instance not found or unauthorized' });

    res.json({ status: inst.status, phoneNumber: inst.phoneNumber });
});

router.post('/client/instance/logout', clientAuthenticate, async (req: any, res: any) => {
    const { instance_id } = req.query;
    if (!instance_id) return res.status(400).json({ error: 'instance_id required' });

    const inst = await prisma.instance.findFirst({ where: { id: instance_id, userId: req.user.userId } });
    if (!inst) return res.status(404).json({ error: 'Instance not found or unauthorized' });

    try {
        await deleteInstanceSession(instance_id);
        const fs = require('fs');
        try { fs.rmSync(`sessions/${instance_id}`, { recursive: true, force: true }); } catch (e) {}
        
        await prisma.instance.update({
            where: { id: instance_id },
            data: { status: 'disconnected', phoneNumber: null }
        });
        
        res.json({ success: true, message: 'Instance logged out successfully' });
    } catch (e) {
        res.status(500).json({ error: 'Failed to log out instance' });
    }
});

router.delete('/client/instance/delete', clientAuthenticate, async (req: any, res: any) => {
    const { instance_id } = req.query;
    if (!instance_id) return res.status(400).json({ error: 'instance_id required' });

    const inst = await prisma.instance.findFirst({ where: { id: instance_id, userId: req.user.userId } });
    if (!inst) return res.status(404).json({ error: 'Instance not found or unauthorized' });

    try {
        await deleteInstanceSession(instance_id);
        await prisma.instance.delete({ where: { id: instance_id } });
        res.json({ success: true, message: 'Instance deleted' });
    } catch (e) {
        res.status(500).json({ error: 'Failed to delete instance' });
    }
});


// ─────────────────────────────────────────────────────────────
// PUBLIC SEND API  (TechRush-style, no JWT – uses access_token)
// GET  /api/send?number=91XXXXXXXXXX&type=text&message=Hello&instance_id=XXXX&access_token=XXXX
// POST /api/send  (same params in JSON body or query)
// ─────────────────────────────────────────────────────────────
const publicSendHandler = async (req: any, res: any) => {
    console.log('[API SEND] Incoming Request:', { method: req.method, url: req.originalUrl, query: req.query, body: req.body, headers: req.headers });
    // Accept params from query string (GET) or body (POST)
    const p = { ...req.query, ...req.body };
    const { type = 'text', message, media_url, instance_id, access_token } = p;
    let number = p.number;

    if (!access_token) return res.status(401).json({ success: false, error: 'access_token is required' });
    if (!number)       return res.status(400).json({ success: false, error: 'number is required' });
    if (!instance_id)  return res.status(400).json({ success: false, error: 'instance_id is required' });

    number = String(number);

    // Authenticate by API key
    const user = await prisma.user.findUnique({ where: { apiKey: access_token } });
    if (!user) return res.status(401).json({ success: false, error: 'Invalid access_token' });

    // Check account expiry
    if (!user.isAdmin && user.expiresAt && new Date(user.expiresAt) < new Date()) {
        return res.status(403).json({ success: false, error: 'Account has expired' });
    }

    // Verify instance ownership
    const inst = await prisma.instance.findFirst({ where: { id: instance_id, userId: user.id } });
    if (!inst) return res.status(404).json({ success: false, error: 'instance_id not found or does not belong to your account' });
    if (inst.status !== 'connected') return res.status(400).json({ success: false, error: 'Instance is not connected' });

    // Check message limit
    if (!(await checkMessageLimit(user.id))) {
        return res.status(403).json({ success: false, error: 'Monthly message limit exceeded' });
    }

    // Determine media mimetype from URL or type param
    const getMimetype = (url: string, msgType: string) => {
        const lower = (url || '').toLowerCase();
        if (lower.endsWith('.png'))  return 'image/png';
        if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
        if (lower.endsWith('.gif'))  return 'image/gif';
        if (lower.endsWith('.mp4'))  return 'video/mp4';
        if (lower.endsWith('.pdf'))  return 'application/pdf';
        if (msgType === 'image')     return 'image/jpeg';
        if (msgType === 'video')     return 'video/mp4';
        return 'application/octet-stream';
    };

    // Build message log value
    let messageVal = message || '';
    if (type !== 'text' && media_url) {
        messageVal = JSON.stringify({ type: 'media', url: media_url, message: message || '', filename: media_url.split('/').pop() });
    }

    // Save log as pending
    let logRecord: any = null;
    try {
        logRecord = await prisma.messageLog.create({
            data: { instanceId: instance_id, userId: user.id, toNumber: number, message: messageVal, status: 'pending' }
        });
        const currentMonth = new Date().toISOString().slice(0, 7);
        await prisma.user.update({
            where: { id: user.id },
            data: { messagesSentThisMonth: { increment: 1 }, lastMessageMonth: currentMonth }
        });
    } catch (dbErr) { console.error('Public API log error:', dbErr); }

    try {
        let sendResult: any = null;
        if (type === 'text' || !media_url) {
            if (!message) return res.status(400).json({ success: false, error: 'message is required for type=text' });
            sendResult = await sendMessage(instance_id, number, message);
        } else {
            const mimetype = getMimetype(media_url, type);
            const fileName = p.filename || media_url.split('/').pop() || 'file';
            sendResult = await sendMessage(instance_id, number, message || '', { url: media_url, mimetype, fileName });
        }

        if (logRecord) {
            try { await prisma.messageLog.update({ where: { id: logRecord.id }, data: { status: 'sent' } }); } catch {}
        }

        return res.json({
            status: "success",
            message: sendResult,
            messageTimestamp: Math.floor(Date.now() / 1000).toString()
        });

    } catch (err: any) {
        console.error('[PublicAPI] Send error:', err?.message);
        const finalStatus = err?.message === 'Non-Whatsapp' ? 'Non-Whatsapp' : 'failed';
        if (logRecord) {
            try { await prisma.messageLog.update({ where: { id: logRecord.id }, data: { status: finalStatus } }); } catch {}
        }
        return res.status(500).json({ success: false, error: err?.message || 'Failed to send message' });
    }
};

router.get('/send',  publicSendHandler);
router.post('/send', publicSendHandler);

// ─────────────────────────────────────────────────────────────
// PUBLIC INSTANCE MANAGEMENT (TechRush-style, access_token auth)
// ─────────────────────────────────────────────────────────────

// Helper: authenticate by access_token and return user
const getPublicUser = async (access_token: string) => {
    if (!access_token) return null;
    const user = await prisma.user.findUnique({ where: { apiKey: access_token } });
    if (!user) return null;
    if (!user.isAdmin && user.expiresAt && new Date(user.expiresAt) < new Date()) return null;
    return user;
};

const createInstanceHandler = async (req: any, res: any) => {
    const access_token = req.query.access_token || req.body?.access_token;
    const user = await getPublicUser(access_token);
    if (!user) return res.status(401).json({ status: 'failed', message: 'Invalid or expired access_token' });

    // Check instance limit
    const userWithCount = await prisma.user.findUnique({
        where: { id: user.id },
        include: { _count: { select: { instances: true } } }
    });
    if (!userWithCount || userWithCount._count.instances >= userWithCount.maxInstances) {
        return res.status(403).json({ status: 'failed', message: `Instance limit reached. Maximum allowed: ${userWithCount?.maxInstances}` });
    }

    // Reuse existing initializing instance if any
    const existing = await prisma.instance.findFirst({ where: { userId: user.id, status: 'initializing' } });
    if (existing) {
        const { instances } = require('../services/whatsapp.service');
        if (!instances?.has(existing.id)) await createInstance(existing.id);
        return res.json({ status: "success", message: "Instance ID generated successfully", instance_id: existing.id });
    }

    const instanceId = generateRandomString(13, true);
    await prisma.instance.create({ data: { id: instanceId, userId: user.id, status: 'initializing' } });
    await createInstance(instanceId);

    // Auto-cleanup after 3 minutes if never scanned
    setTimeout(async () => {
        try {
            const inst = await prisma.instance.findUnique({ where: { id: instanceId } });
            if (inst && inst.status === 'initializing') {
                await deleteInstanceSession(instanceId);
                await prisma.instance.delete({ where: { id: instanceId } });
                fs.rmSync(`sessions/${instanceId}`, { recursive: true, force: true });
            }
        } catch (e) {}
    }, 3 * 60 * 1000);

    res.json({ status: "success", message: "Instance ID generated successfully", instance_id: instanceId });
};

router.get('/create_instance', createInstanceHandler);
router.post('/create_instance', createInstanceHandler);

const getQrCodeHandler = async (req: any, res: any) => {
    const instance_id = req.query.instance_id || req.body?.instance_id;
    const access_token = req.query.access_token || req.body?.access_token;
    
    const user = await getPublicUser(access_token);
    if (!user) return res.status(401).json({ status: 'failed', message: 'Invalid or expired access_token' });
    if (!instance_id) return res.status(400).json({ status: 'failed', message: 'instance_id is required' });

    const inst = await prisma.instance.findFirst({ where: { id: instance_id, userId: user.id } });
    if (!inst) return res.status(404).json({ status: 'failed', message: 'Instance not found or unauthorized' });

    const { qrs, lastPolled } = require('../services/whatsapp.service');
    lastPolled.set(instance_id, Date.now());

    // Wait up to 15 seconds for the QR code to be generated
    let qr = qrs.get(instance_id);
    let attempts = 0;
    while (!qr && attempts < 15) {
        await new Promise(r => setTimeout(r, 1000));
        qr = qrs.get(instance_id);
        attempts++;
    }

    if (qr) {
        res.json({ status: "success", message: "Success", base64: qr });
    } else {
        res.json({ status: "failed", message: "QR Code not ready yet. Please try again." });
    }
};

router.get('/get_qrcode', getQrCodeHandler);
router.post('/get_qrcode', getQrCodeHandler);

const rebootHandler = async (req: any, res: any) => {
    const instance_id = req.query.instance_id || req.body?.instance_id;
    const access_token = req.query.access_token || req.body?.access_token;
    
    const user = await getPublicUser(access_token);
    if (!user) return res.status(401).json({ status: 'failed', message: 'Invalid or expired access_token' });
    if (!instance_id) return res.status(400).json({ status: 'failed', message: 'instance_id is required' });

    const inst = await prisma.instance.findFirst({ where: { id: instance_id, userId: user.id } });
    if (!inst) return res.status(404).json({ status: 'failed', message: 'Instance not found or unauthorized' });

    // Logout Whatsapp web and do a fresh scan
    await deleteInstanceSession(instance_id);
    try { fs.rmSync(`sessions/${instance_id}`, { recursive: true, force: true }); } catch (e) {}
    await prisma.instance.update({ where: { id: instance_id }, data: { status: 'initializing', phoneNumber: null } });

    await createInstance(instance_id);

    res.json({ status: "success", message: "Success" });
};

router.get('/reboot', rebootHandler);
router.post('/reboot', rebootHandler);

// GET /api/reconnect?instance_id=xxx&access_token=xxx  (Delete / clear instance session)
router.get('/reconnect', async (req: any, res: any) => {
    const { instance_id, access_token } = req.query;
    const user = await getPublicUser(access_token);
    if (!user) return res.status(401).json({ success: false, error: 'Invalid or expired access_token' });
    if (!instance_id) return res.status(400).json({ success: false, error: 'instance_id is required' });

    const inst = await prisma.instance.findFirst({ where: { id: instance_id, userId: user.id } });
    if (!inst) return res.status(404).json({ success: false, error: 'Instance not found or unauthorized' });

    await deleteInstanceSession(instance_id);
    try { fs.rmSync(`sessions/${instance_id}`, { recursive: true, force: true }); } catch (e) {}
    await prisma.instance.update({ where: { id: instance_id }, data: { status: 'disconnected', phoneNumber: null } });

    res.json({ success: true, message: 'Instance session cleared. Use /api/reboot to start a fresh QR.' });
});

// POST & GET /api/reset_instance?instance_id=xxx&access_token=xxx (Logout WhatsApp, change instance ID, delete old data)
const resetInstanceHandler = async (req: any, res: any) => {
    const instance_id = req.query.instance_id || req.body?.instance_id || req.query.instanceId || req.body?.instanceId;
    const access_token = req.query.access_token || req.body?.access_token || req.query.api_key || req.body?.api_key || req.headers?.['x-api-key'] || (req.headers?.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : undefined);
    
    const user = await getPublicUser(access_token);
    if (!user) return res.status(401).json({ status: 'failed', message: 'Invalid or expired access_token' });
    if (!instance_id) return res.status(400).json({ status: 'failed', message: 'instance_id is required' });

    const inst = await prisma.instance.findFirst({ where: { id: instance_id, userId: user.id } });
    if (!inst) return res.status(404).json({ status: 'failed', message: 'Instance not found or unauthorized' });

    // 1. Terminate and logout WhatsApp session
    await deleteInstanceSession(instance_id);

    // 2. Wipe session files on disk
    try {
        fs.rmSync(`sessions/${instance_id}`, { recursive: true, force: true });
    } catch (e) {}

    // 3. Delete all old instance data (message logs & filter batches)
    try {
        await prisma.messageLog.deleteMany({ where: { instanceId: instance_id } });
        await prisma.filterBatch.deleteMany({ where: { instanceId: instance_id } });
    } catch (e) {}

    // 4. Delete the old instance record from DB
    await prisma.instance.delete({ where: { id: instance_id } });

    // 5. Generate a brand new instance ID and create it
    const newInstanceId = generateRandomString(13, true);
    await prisma.instance.create({
        data: {
            id: newInstanceId,
            userId: user.id,
            status: 'initializing'
        }
    });

    // 6. Initialize the new instance session
    await createInstance(newInstanceId);

    // 7. Auto-cleanup after 3 minutes if never scanned
    setTimeout(async () => {
        try {
            const freshInst = await prisma.instance.findUnique({ where: { id: newInstanceId } });
            if (freshInst && freshInst.status === 'initializing') {
                await deleteInstanceSession(newInstanceId);
                await prisma.instance.delete({ where: { id: newInstanceId } });
                fs.rmSync(`sessions/${newInstanceId}`, { recursive: true, force: true });
            }
        } catch (e) {}
    }, 3 * 60 * 1000);

    res.json({
        status: "success",
        message: "Instance reset successfully. Old instance and data deleted, new instance initialized.",
        old_instance_id: instance_id,
        instance_id: newInstanceId
    });
};

router.post('/reset_instance', resetInstanceHandler);
router.get('/reset_instance', resetInstanceHandler);
router.post('/reset-instance', resetInstanceHandler);
router.get('/reset-instance', resetInstanceHandler);

// POST & GET /api/set_webhook (Set Webhook URL & enable status)
const setWebhookHandler = async (req: any, res: any) => {
    const instance_id = req.query.instance_id || req.body?.instance_id || req.query.instanceId || req.body?.instanceId;
    const access_token = req.query.access_token || req.body?.access_token || req.query.api_key || req.body?.api_key || req.headers?.['x-api-key'] || (req.headers?.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : undefined);
    const webhook_url = req.query.webhook_url || req.body?.webhook_url || req.query.webhookUrl || req.body?.webhookUrl;
    const enable = req.query.enable !== undefined ? req.query.enable : (req.body?.enable !== undefined ? req.body.enable : true);

    const user = await getPublicUser(access_token);
    if (!user) return res.status(401).json({ status: 'failed', message: 'Invalid or expired access_token' });
    if (!instance_id) return res.status(400).json({ status: 'failed', message: 'instance_id is required' });

    const inst = await prisma.instance.findFirst({ where: { id: instance_id, userId: user.id } });
    if (!inst) return res.status(404).json({ status: 'failed', message: 'Instance not found or unauthorized' });

    const isEnabled = enable === true || enable === 'true' || enable === 1 || enable === '1';
    
    await prisma.instance.update({
        where: { id: instance_id },
        data: {
            webhookUrl: webhook_url ? String(webhook_url).trim() : null,
            webhookEnabled: isEnabled
        }
    });

    res.json({
        status: "success",
        message: "Webhook updated successfully",
        instance_id,
        webhook_url: webhook_url || "",
        enable: isEnabled
    });
};

router.post('/set_webhook', setWebhookHandler);
router.get('/set_webhook', setWebhookHandler);
router.post('/set-webhook', setWebhookHandler);
router.get('/set-webhook', setWebhookHandler);

// POST & GET /api/get_webhook (Retrieve current Webhook configuration)
const getWebhookHandler = async (req: any, res: any) => {
    const instance_id = req.query.instance_id || req.body?.instance_id || req.query.instanceId || req.body?.instanceId;
    const access_token = req.query.access_token || req.body?.access_token || req.query.api_key || req.body?.api_key || req.headers?.['x-api-key'] || (req.headers?.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : undefined);

    const user = await getPublicUser(access_token);
    if (!user) return res.status(401).json({ status: 'failed', message: 'Invalid or expired access_token' });
    if (!instance_id) return res.status(400).json({ status: 'failed', message: 'instance_id is required' });

    const inst = await prisma.instance.findFirst({ where: { id: instance_id, userId: user.id } });
    if (!inst) return res.status(404).json({ status: 'failed', message: 'Instance not found or unauthorized' });

    res.json({
        status: "success",
        instance_id: inst.id,
        webhook_url: inst.webhookUrl || "",
        enable: inst.webhookEnabled
    });
};

router.post('/get_webhook', getWebhookHandler);
router.get('/get_webhook', getWebhookHandler);
router.post('/get-webhook', getWebhookHandler);
router.get('/get-webhook', getWebhookHandler);

// --- Regenerate API Token ---
router.post('/me/regenerate-token', authenticate, async (req: any, res: any) => {
    try {
        const newKey = require('crypto').randomBytes(7).toString('hex').substring(0, 13);
        const user = await prisma.user.update({ where: { id: req.user.userId }, data: { apiKey: newKey } });
        res.json({ success: true, apiKey: user.apiKey });
    } catch (err) {
        res.status(500).json({ error: 'Failed to regenerate token' });
    }
});

// ─────────────────────────────────────────────
// NUMBER FILTER & BATCH VALIDATOR ENDPOINTS
// ─────────────────────────────────────────────

// Create batch, save all numbers into database first, then process asynchronously in the background
router.post('/filter/batches/create', authenticate, async (req: any, res: any) => {
    try {
        const { instanceId, name, numbers, delayMs } = req.body;
        if (!instanceId) return res.status(400).json({ error: 'instanceId is required' });
        if (!numbers) return res.status(400).json({ error: 'numbers is required' });

        const inst = await prisma.instance.findUnique({ where: { id: instanceId } });
        if (!inst || inst.userId !== req.user.userId) return res.status(404).json({ error: 'Instance not found or unauthorized' });
        if (inst.status !== 'connected') return res.status(400).json({ error: 'Instance is not connected to WhatsApp' });

        let numList: string[] = [];
        if (Array.isArray(numbers)) {
            numList = numbers;
        } else {
            numList = numbers.split(/[\n,;]+/).map((n: string) => n.trim()).filter(Boolean);
        }

        const uniqueNumbers = Array.from(new Set(numList.map(n => n.replace(/\D/g, '')).filter(n => n.length >= 7)));
        if (uniqueNumbers.length === 0) return res.status(400).json({ error: 'No valid phone numbers found' });

        if (uniqueNumbers.length > 10000) {
            return res.status(400).json({ error: 'Maximum 10,000 numbers allowed per batch filter request.' });
        }

        const batchName = (name && name.trim()) ? name.trim() : `Batch Filter - ${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

        // Step 1: Create the batch record in database with status 'processing'
        const batch = await prisma.filterBatch.create({
            data: {
                userId: req.user.userId,
                instanceId,
                name: batchName,
                totalCount: uniqueNumbers.length,
                validCount: 0,
                invalidCount: 0,
                status: 'processing'
            }
        });

        // Step 2: Save ALL raw numbers immediately into FilterItem table
        await prisma.filterItem.createMany({
            data: uniqueNumbers.map((num: string) => ({
                batchId: batch.id,
                number: num,
                exists: false,
                jid: null
            }))
        });

        // Step 3: Respond to client IMMEDIATELY (Zero panel freezing / no timeout)
        res.json({
            success: true,
            batchId: batch.id,
            total: uniqueNumbers.length,
            status: 'processing',
            message: 'All numbers stored successfully. Verification running in background.'
        });

        // Step 4: Background asynchronous verification worker
        (async () => {
            try {
                const { getSocket, waitUntilConnected } = require('../services/whatsapp.service');
                const sock = await getSocket(instanceId);
                const isOpen = await waitUntilConnected(instanceId);
                if (!isOpen || !sock) {
                    console.error(`[BackgroundFilter] Instance ${instanceId} disconnected. Aborting batch ${batch.id}`);
                    await prisma.filterBatch.update({ where: { id: batch.id }, data: { status: 'failed' } });
                    return;
                }

                let validCount = 0;
                let invalidCount = 0;
                const delay = typeof delayMs === 'number' ? Math.max(20, delayMs) : 100;

                const batchItems = await prisma.filterItem.findMany({
                    where: { batchId: batch.id },
                    orderBy: { createdAt: 'asc' }
                });

                for (let i = 0; i < batchItems.length; i++) {
                    const item = batchItems[i];
                    try {
                        const check = await sock.onWhatsApp(item.number);
                        const exists = Array.isArray(check) && check.length > 0 && !!check[0]?.exists;
                        const jid = exists ? check[0].jid : null;

                        if (exists) validCount++;
                        else invalidCount++;

                        await prisma.filterItem.update({
                            where: { id: item.id },
                            data: { exists, jid }
                        });
                    } catch (err: any) {
                        invalidCount++;
                    }

                    // Periodically update batch counts in DB every 10 numbers or at completion
                    if ((i + 1) % 10 === 0 || i === batchItems.length - 1) {
                        await prisma.filterBatch.update({
                            where: { id: batch.id },
                            data: { validCount, invalidCount }
                        });
                    }

                    if (delay > 0 && i < batchItems.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                }

                // Finalize batch status
                await prisma.filterBatch.update({
                    where: { id: batch.id },
                    data: {
                        validCount,
                        invalidCount,
                        status: 'completed'
                    }
                });
                console.log(`[BackgroundFilter] ✅ Batch ${batch.id} completed! (Total: ${batchItems.length}, Valid: ${validCount}, Invalid: ${invalidCount})`);
            } catch (bgError) {
                console.error('[BackgroundFilter] Error processing batch:', bgError);
                await prisma.filterBatch.update({
                    where: { id: batch.id },
                    data: { status: 'completed' }
                });
            }
        })();

    } catch (e: any) {
        console.error('Batch create error:', e);
        res.status(500).json({ error: e.message || 'Failed to process batch filter' });
    }
});

// List all batches for current user
router.get('/filter/batches', authenticate, async (req: any, res: any) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
        const skip = (page - 1) * limit;

        const where = { userId: req.user.userId };

        const [batches, totalCount] = await Promise.all([
            prisma.filterBatch.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            }),
            prisma.filterBatch.count({ where })
        ]);

        res.json({
            batches,
            totalCount,
            page,
            limit,
            totalPages: Math.ceil(totalCount / limit) || 1
        });
    } catch (e: any) {
        res.status(500).json({ error: 'Failed to fetch batches' });
    }
});

// Get specific batch details with paginated numbers
router.get('/filter/batches/:id', authenticate, async (req: any, res: any) => {
    try {
        const { id } = req.params;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 25));
        const status = req.query.status || 'all'; // 'all', 'valid', 'invalid'
        const search = (req.query.search || '').trim();
        const skip = (page - 1) * limit;

        const batch = await prisma.filterBatch.findFirst({
            where: { id, userId: req.user.userId }
        });

        if (!batch) return res.status(404).json({ error: 'Batch not found' });

        const itemWhere: any = { batchId: id };
        if (status === 'valid') itemWhere.exists = true;
        if (status === 'invalid') itemWhere.exists = false;
        if (search) itemWhere.number = { contains: search };

        const [items, totalItems] = await Promise.all([
            prisma.filterItem.findMany({
                where: itemWhere,
                orderBy: { createdAt: 'asc' },
                skip,
                take: limit
            }),
            prisma.filterItem.count({ where: itemWhere })
        ]);

        res.json({
            batch,
            items,
            totalItems,
            page,
            limit,
            totalPages: Math.ceil(totalItems / limit) || 1
        });
    } catch (e: any) {
        res.status(500).json({ error: 'Failed to fetch batch details' });
    }
});

// Export all items of a batch
router.get('/filter/batches/:id/export', authenticate, async (req: any, res: any) => {
    try {
        const { id } = req.params;
        const status = req.query.status || 'all'; // 'all', 'valid', 'invalid'

        const batch = await prisma.filterBatch.findFirst({
            where: { id, userId: req.user.userId }
        });

        if (!batch) return res.status(404).json({ error: 'Batch not found' });

        const itemWhere: any = { batchId: id };
        if (status === 'valid') itemWhere.exists = true;
        if (status === 'invalid') itemWhere.exists = false;

        const items = await prisma.filterItem.findMany({
            where: itemWhere,
            orderBy: { createdAt: 'asc' }
        });

        res.json({ batch, items });
    } catch (e: any) {
        res.status(500).json({ error: 'Failed to export batch' });
    }
});

// Delete a batch
router.delete('/filter/batches/:id', authenticate, async (req: any, res: any) => {
    try {
        const { id } = req.params;
        const batch = await prisma.filterBatch.findFirst({
            where: { id, userId: req.user.userId }
        });

        if (!batch) return res.status(404).json({ error: 'Batch not found' });

        await prisma.filterBatch.delete({ where: { id } });
        res.json({ success: true, message: 'Batch deleted successfully' });
    } catch (e: any) {
        res.status(500).json({ error: 'Failed to delete batch' });
    }
});

// Authenticated fast single/batch filter check
router.post('/filter/check', authenticate, async (req: any, res: any) => {
    try {
        const { instanceId, numbers, delayMs } = req.body;
        if (!instanceId) {
            return res.status(400).json({ error: 'instanceId is required' });
        }
        if (!numbers || (!Array.isArray(numbers) && typeof numbers !== 'string')) {
            return res.status(400).json({ error: 'numbers array or string is required' });
        }

        const inst = await prisma.instance.findUnique({ where: { id: instanceId } });
        if (!inst || inst.userId !== req.user.userId) {
            return res.status(404).json({ error: 'Instance not found or unauthorized' });
        }
        if (inst.status !== 'connected') {
            return res.status(400).json({ error: 'Instance is not connected to WhatsApp' });
        }

        let numList: string[] = [];
        if (Array.isArray(numbers)) {
            numList = numbers;
        } else {
            numList = numbers.split(/[\n,;]+/).map((n: string) => n.trim()).filter(Boolean);
        }

        if (numList.length === 0) {
            return res.status(400).json({ error: 'No valid numbers provided' });
        }

        if (numList.length > 5000) {
            return res.status(400).json({ error: 'Maximum 5,000 numbers allowed per batch filter request.' });
        }

        const { checkWhatsAppNumbers } = require('../services/whatsapp.service');
        const results = await checkWhatsAppNumbers(instanceId, numList, typeof delayMs === 'number' ? delayMs : 100);

        const validCount = results.filter((r: any) => r.exists).length;
        const invalidCount = results.length - validCount;

        res.json({
            success: true,
            total: results.length,
            validCount,
            invalidCount,
            results
        });
    } catch (e: any) {
        console.error('Filter check error:', e);
        res.status(500).json({ error: e.message || 'Failed to verify phone numbers' });
    }
});

// Public Developer REST API: check single or multiple numbers
const checkNumberHandler = async (req: any, res: any) => {
    try {
        const instance_id = req.query.instance_id || req.body?.instance_id;
        const access_token = req.query.access_token || req.body?.access_token;
        const number = req.query.number || req.body?.number || req.query.numbers || req.body?.numbers;
        const delay = req.query.delay || req.body?.delay;

        const user = await getPublicUser(access_token);
        if (!user) return res.status(401).json({ status: 'failed', message: 'Invalid or expired access_token' });
        if (!instance_id) return res.status(400).json({ status: 'failed', message: 'instance_id is required' });
        if (!number) return res.status(400).json({ status: 'failed', message: 'number or numbers is required' });

        const inst = await prisma.instance.findFirst({ where: { id: instance_id, userId: user.id } });
        if (!inst) return res.status(404).json({ status: 'failed', message: 'Instance not found or unauthorized' });
        if (inst.status !== 'connected') return res.status(400).json({ status: 'failed', message: 'Instance is not connected' });

        let numList: string[] = [];
        if (Array.isArray(number)) {
            numList = number;
        } else if (typeof number === 'string') {
            numList = number.split(/[\n,;]+/).map((n: string) => n.trim()).filter(Boolean);
        }

        if (numList.length === 0) {
            return res.status(400).json({ status: 'failed', message: 'No valid numbers provided' });
        }

        const { checkWhatsAppNumbers } = require('../services/whatsapp.service');
        const results = await checkWhatsAppNumbers(instance_id, numList, delay ? parseInt(delay) : 100);

        if (numList.length === 1) {
            const single = results[0];
            return res.json({
                status: 'success',
                number: single.number,
                exists: single.exists,
                jid: single.jid || null
            });
        }

        return res.json({
            status: 'success',
            total: results.length,
            validCount: results.filter((r: any) => r.exists).length,
            invalidCount: results.filter((r: any) => !r.exists).length,
            results
        });
    } catch (e: any) {
        return res.status(500).json({ status: 'failed', message: e.message || 'Failed to check WhatsApp number' });
    }
};

router.get('/check-number', checkNumberHandler);
router.post('/check-number', checkNumberHandler);
router.get('/check_number', checkNumberHandler);
router.post('/check_number', checkNumberHandler);

// ─────────────────────────────────────────────
// WHATSAPP GROUPS API ENDPOINTS
// ─────────────────────────────────────────────

// Dashboard: Get all groups for an instance
router.get('/groups', authenticate, async (req: any, res: any) => {
    try {
        const { instanceId } = req.query;
        if (!instanceId) return res.status(400).json({ error: 'instanceId is required' });

        const inst = await prisma.instance.findUnique({ where: { id: instanceId } });
        if (!inst || inst.userId !== req.user.userId) return res.status(404).json({ error: 'Instance not found or unauthorized' });
        if (inst.status !== 'connected') return res.status(400).json({ error: 'Instance is not connected to WhatsApp' });

        const { fetchInstanceGroups } = require('../services/whatsapp.service');
        const groups = await fetchInstanceGroups(instanceId);

        res.json({
            success: true,
            count: groups.length,
            groups
        });
    } catch (e: any) {
        console.error('Fetch groups error:', e);
        res.status(500).json({ error: e.message || 'Failed to fetch WhatsApp groups' });
    }
});

// Dashboard: Get group metadata and members
router.get('/groups/:groupId/participants', authenticate, async (req: any, res: any) => {
    try {
        const { groupId } = req.params;
        const { instanceId } = req.query;
        if (!instanceId) return res.status(400).json({ error: 'instanceId is required' });
        if (!groupId) return res.status(400).json({ error: 'groupId is required' });

        const inst = await prisma.instance.findUnique({ where: { id: instanceId } });
        if (!inst || inst.userId !== req.user.userId) return res.status(404).json({ error: 'Instance not found or unauthorized' });
        if (inst.status !== 'connected') return res.status(400).json({ error: 'Instance is not connected to WhatsApp' });

        const { fetchGroupMetadata } = require('../services/whatsapp.service');
        const metadata = await fetchGroupMetadata(instanceId, groupId);

        res.json({
            success: true,
            group: metadata
        });
    } catch (e: any) {
        console.error('Fetch group participants error:', e);
        res.status(500).json({ error: e.message || 'Failed to fetch group details' });
    }
});

// Dashboard: Send message to a group
router.post('/groups/send', authenticate, async (req: any, res: any) => {
    try {
        const { instanceId, groupJid, message, mediaUrl, filename } = req.body;
        if (!instanceId) return res.status(400).json({ error: 'instanceId is required' });
        if (!groupJid) return res.status(400).json({ error: 'groupJid is required' });

        const inst = await prisma.instance.findUnique({ where: { id: instanceId } });
        if (!inst || inst.userId !== req.user.userId) return res.status(404).json({ error: 'Instance not found or unauthorized' });
        if (inst.status !== 'connected') return res.status(400).json({ error: 'Instance is not connected to WhatsApp' });

        if (!(await checkMessageLimit(inst.userId))) {
            return res.status(403).json({ error: 'Monthly message limit exceeded' });
        }

        const formattedJid = groupJid.includes('@') ? groupJid : `${groupJid}@g.us`;

        let fileObj = undefined;
        if (mediaUrl) {
            const lower = mediaUrl.toLowerCase();
            let mimetype = 'application/octet-stream';
            if (lower.endsWith('.png')) mimetype = 'image/png';
            else if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) mimetype = 'image/jpeg';
            else if (lower.endsWith('.mp4')) mimetype = 'video/mp4';
            else if (lower.endsWith('.pdf')) mimetype = 'application/pdf';

            fileObj = {
                url: mediaUrl,
                mimetype,
                fileName: filename || mediaUrl.split('/').pop() || 'file'
            };
        }

        // Log message
        let logRecord: any = null;
        try {
            logRecord = await prisma.messageLog.create({
                data: {
                    instanceId,
                    userId: req.user.userId,
                    toNumber: formattedJid,
                    message: message || (mediaUrl ? `[Media: ${mediaUrl}]` : ''),
                    status: 'pending'
                }
            });

            const currentMonth = new Date().toISOString().slice(0, 7);
            await prisma.user.update({
                where: { id: req.user.userId },
                data: { messagesSentThisMonth: { increment: 1 }, lastMessageMonth: currentMonth }
            });
        } catch (dbErr) { console.error('Group log error:', dbErr); }

        const { sendMessage } = require('../services/whatsapp.service');
        const sendResult = await sendMessage(instanceId, formattedJid, message || '', fileObj);

        if (logRecord) {
            try { await prisma.messageLog.update({ where: { id: logRecord.id }, data: { status: 'sent' } }); } catch {}
        }

        res.json({
            success: true,
            messageId: logRecord?.id,
            result: sendResult
        });
    } catch (e: any) {
        console.error('Send group message error:', e);
        res.status(500).json({ error: e.message || 'Failed to send message to group' });
    }
});

// Public Developer REST API: List all groups
const publicGroupListHandler = async (req: any, res: any) => {
    try {
        const instance_id = req.query.instance_id || req.body?.instance_id;
        const access_token = req.query.access_token || req.body?.access_token;

        const user = await getPublicUser(access_token);
        if (!user) return res.status(401).json({ status: 'failed', message: 'Invalid or expired access_token' });
        if (!instance_id) return res.status(400).json({ status: 'failed', message: 'instance_id is required' });

        const inst = await prisma.instance.findFirst({ where: { id: instance_id, userId: user.id } });
        if (!inst) return res.status(404).json({ status: 'failed', message: 'Instance not found or unauthorized' });
        if (inst.status !== 'connected') return res.status(400).json({ status: 'failed', message: 'Instance is not connected' });

        const { fetchInstanceGroups } = require('../services/whatsapp.service');
        const groups = await fetchInstanceGroups(instance_id);

        res.json({
            status: "success",
            count: groups.length,
            groups
        });
    } catch (e: any) {
        return res.status(500).json({ status: 'failed', message: e.message || 'Failed to fetch groups' });
    }
};

router.get('/group_list', publicGroupListHandler);
router.post('/group_list', publicGroupListHandler);
router.get('/group-list', publicGroupListHandler);
router.post('/group-list', publicGroupListHandler);

// Public Developer REST API: Get group participants
const publicGroupParticipantsHandler = async (req: any, res: any) => {
    try {
        const instance_id = req.query.instance_id || req.body?.instance_id;
        const access_token = req.query.access_token || req.body?.access_token;
        const group_id = req.query.group_id || req.body?.group_id;

        const user = await getPublicUser(access_token);
        if (!user) return res.status(401).json({ status: 'failed', message: 'Invalid or expired access_token' });
        if (!instance_id) return res.status(400).json({ status: 'failed', message: 'instance_id is required' });
        if (!group_id) return res.status(400).json({ status: 'failed', message: 'group_id is required' });

        const inst = await prisma.instance.findFirst({ where: { id: instance_id, userId: user.id } });
        if (!inst) return res.status(404).json({ status: 'failed', message: 'Instance not found or unauthorized' });
        if (inst.status !== 'connected') return res.status(400).json({ status: 'failed', message: 'Instance is not connected' });

        const { fetchGroupMetadata } = require('../services/whatsapp.service');
        const groupMeta = await fetchGroupMetadata(instance_id, group_id);

        res.json({
            status: "success",
            group: groupMeta
        });
    } catch (e: any) {
        return res.status(500).json({ status: 'failed', message: e.message || 'Failed to fetch group details' });
    }
};

router.get('/group_participants', publicGroupParticipantsHandler);
router.post('/group_participants', publicGroupParticipantsHandler);
router.get('/group-participants', publicGroupParticipantsHandler);
router.post('/group-participants', publicGroupParticipantsHandler);

// Public Developer REST API: Send message to group
const publicSendGroupHandler = async (req: any, res: any) => {
    try {
        const p = { ...req.query, ...req.body };
        const { type = 'text', message, media_url, filename, instance_id, access_token } = p;
        const group_id = p.group_id || p.group_jid || p.number;

        const user = await getPublicUser(access_token);
        if (!user) return res.status(401).json({ status: 'failed', message: 'Invalid or expired access_token' });
        if (!instance_id) return res.status(400).json({ status: 'failed', message: 'instance_id is required' });
        if (!group_id) return res.status(400).json({ status: 'failed', message: 'group_id is required' });

        const inst = await prisma.instance.findFirst({ where: { id: instance_id, userId: user.id } });
        if (!inst) return res.status(404).json({ status: 'failed', message: 'Instance not found or unauthorized' });
        if (inst.status !== 'connected') return res.status(400).json({ status: 'failed', message: 'Instance is not connected' });

        if (!(await checkMessageLimit(user.id))) {
            return res.status(403).json({ status: 'failed', message: 'Monthly message limit exceeded' });
        }

        const formattedJid = group_id.includes('@') ? group_id : `${group_id}@g.us`;

        let fileObj = undefined;
        if (type !== 'text' && media_url) {
            const lower = media_url.toLowerCase();
            let mimetype = 'application/octet-stream';
            if (lower.endsWith('.png')) mimetype = 'image/png';
            else if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) mimetype = 'image/jpeg';
            else if (lower.endsWith('.mp4')) mimetype = 'video/mp4';
            else if (lower.endsWith('.pdf')) mimetype = 'application/pdf';
            else if (type === 'image') mimetype = 'image/jpeg';
            else if (type === 'video') mimetype = 'video/mp4';

            fileObj = {
                url: media_url,
                mimetype,
                fileName: filename || media_url.split('/').pop() || 'file'
            };
        }

        let logRecord: any = null;
        try {
            logRecord = await prisma.messageLog.create({
                data: {
                    instanceId: instance_id,
                    userId: user.id,
                    toNumber: formattedJid,
                    message: message || (media_url ? `[Media: ${media_url}]` : ''),
                    status: 'pending'
                }
            });

            const currentMonth = new Date().toISOString().slice(0, 7);
            await prisma.user.update({
                where: { id: user.id },
                data: { messagesSentThisMonth: { increment: 1 }, lastMessageMonth: currentMonth }
            });
        } catch (dbErr) { console.error('Public group log error:', dbErr); }

        const { sendMessage } = require('../services/whatsapp.service');
        const sendResult = await sendMessage(instance_id, formattedJid, message || '', fileObj);

        if (logRecord) {
            try { await prisma.messageLog.update({ where: { id: logRecord.id }, data: { status: 'sent' } }); } catch {}
        }

        return res.json({
            status: "success",
            message: "Message sent to group",
            group_id: formattedJid,
            result: sendResult,
            messageTimestamp: Math.floor(Date.now() / 1000).toString()
        });
    } catch (e: any) {
        return res.status(500).json({ status: 'failed', message: e.message || 'Failed to send message to group' });
    }
};

router.get('/send_group', publicSendGroupHandler);
router.post('/send_group', publicSendGroupHandler);
router.get('/send-group', publicSendGroupHandler);
router.post('/send-group', publicSendGroupHandler);

export default router;

