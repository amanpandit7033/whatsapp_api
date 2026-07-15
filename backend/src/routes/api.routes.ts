import { Router } from 'express';
import { prisma } from '../server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createInstance, sendMessage, sendInteractiveMessage, deleteInstanceSession, InteractivePayload } from '../services/whatsapp.service';
import fs from 'fs';
import multer from 'multer';
import * as XLSX from 'xlsx';

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
    res.json({ token, isAdmin: user.isAdmin, isExpired, permissions: user.permissions });
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

const generateRandomString = (length: number, upperOnly: boolean) => {
    const chars = upperOnly ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
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

    const instanceId = generateRandomString(6, true);
    
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
    const instance_id = req.body.instance_id || req.query.instance_id;
    const api_key = req.body.api_key || req.query.api_key;
    const number = req.body.number || req.query.number;
    const message = req.body.message || req.query.message;
    const media_url = req.body.media_url || req.query.media_url;
    const filename = req.body.filename || req.query.filename;

    if (!instance_id || !api_key || !number) {
        return res.status(400).json({ error: 'Missing required fields: instance_id, api_key, number' });
    }
    if (typeof number !== 'string' || number.includes(',')) {
        return res.status(400).json({ error: 'You can only send to 1 number at a time using this API.' });
    }

    try {
        const user = await prisma.user.findUnique({ where: { apiKey: api_key } });
        if (!user) return res.status(401).json({ error: 'Invalid api_key' });
        
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
    const { instance_id, api_key, number, interactive } = req.body;

    if (!instance_id || !api_key || !number || !interactive) {
        return res.status(400).json({ error: 'Missing required fields: instance_id, api_key, number, interactive' });
    }
    if (typeof number !== 'string' || number.includes(',')) {
        return res.status(400).json({ error: 'You can only send to 1 number at a time using this API.' });
    }

    try {
        const user = await prisma.user.findUnique({ where: { apiKey: api_key } });
        if (!user) return res.status(401).json({ error: 'Invalid api_key' });
        
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
        
        res.json({ stats });
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
        
        // Auto-generate apiKey if missing
        if (!user.apiKey) {
            const newKey = require('crypto').randomBytes(16).toString('hex');
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
        
        res.json({ username: user.username, apiKey: user.apiKey, isAdmin: user.isAdmin, maxInstances: user.maxInstances, messageLimit: user.messageLimit, messagesSentThisMonth, permissions: user.permissions });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

// --- ADMIN MANAGEMENT ---
router.post('/admin/users', adminAuthenticate, async (req: any, res: any) => {
    try {
        const { username, password, maxInstances, messageLimit, expiresAt, permissions } = req.body;
        const passwordHash = await bcrypt.hash(password, 10);
        const data: any = { username, passwordHash, maxInstances: Number(maxInstances) || 1, messageLimit: Number(messageLimit) || 1000 };
        if (expiresAt) {
            data.expiresAt = new Date(expiresAt);
        }
        if (permissions) {
            data.permissions = permissions;
        }
        const user = await prisma.user.create({ data });
        res.json({ message: 'User created successfully', user: { id: user.id, username: user.username } });
    } catch (e) {
        res.status(400).json({ error: 'Username already exists' });
    }
});

router.put('/admin/users/:id', adminAuthenticate, async (req: any, res: any) => {
    try {
        const { username, password, maxInstances, isAdmin, messageLimit, expiresAt, permissions } = req.body;
        const data: any = {};
        if (username) data.username = username;
        if (password) data.passwordHash = await bcrypt.hash(password, 10);
        if (maxInstances !== undefined) data.maxInstances = Number(maxInstances);
        if (isAdmin !== undefined) data.isAdmin = Boolean(isAdmin);
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
    } catch (e) {
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
            select: { id: true, username: true, isAdmin: true, maxInstances: true, messageLimit: true, expiresAt: true, permissions: true, createdAt: true, _count: { select: { instances: true } } },
            orderBy: { createdAt: 'desc' }
        }),
        prisma.user.count({ where })
    ]);

    res.json({ users, total, page, totalPages: Math.ceil(total / limit) });
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

        const instanceId = generateRandomString(6, true);
        
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

export default router;
