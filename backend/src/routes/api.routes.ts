import { Router } from 'express';
import { prisma } from '../server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createInstance, sendMessage, sendInteractiveMessage, deleteInstanceSession, InteractivePayload, applyInvisibleAntiHash } from '../services/whatsapp.service';
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
    const instances = await (prisma as any).instance.findMany({ 
        where: { userId: req.user.userId },
        orderBy: { createdAt: 'desc' }
    });

    // Background opportunistic DP enrichment for connected instances missing DP
    try {
        const { syncInstanceProfilePic } = require('../services/whatsapp.service');
        for (const inst of instances) {
            if (inst.status === 'connected' && !inst.profilePicUrl) {
                syncInstanceProfilePic(inst.id).catch(() => {});
            }
        }
    } catch (e) {}

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
    await (prisma as any).instance.update({
        where: { id: instanceId },
        data: { status: 'disconnected', phoneNumber: null, profilePicUrl: null }
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
    const instance = await (prisma as any).instance.findUnique({ where: { id: instanceId } });
    if (!instance || instance.userId !== req.user.userId) {
        return res.status(404).json({ error: 'Instance not found' });
    }

    try {
        const { getSocket, waitUntilConnected, syncInstanceProfilePic } = require('../services/whatsapp.service');
        await getSocket(instanceId);
        const isOpen = await waitUntilConnected(instanceId);
        if (isOpen) {
            await syncInstanceProfilePic(instanceId);
        }
        
        const updatedInst = await (prisma as any).instance.findUnique({ where: { id: instanceId } });
        res.json({ 
            success: true, 
            status: updatedInst?.status || 'disconnected',
            profilePicUrl: updatedInst?.profilePicUrl || null
        });
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
        await recordDailyUsage(req.user.userId, finalStatus);
    })();

    res.json({ success: true, message: 'Message queued', message_id: logRecord?.id });
});

// --- DEDICATED DAILY USAGE ATOMIC TRACKER ---
// Stores daily total, delivered, and failed counts per user permanently (even if reports/message logs are deleted)
export const recordDailyUsage = async (userId: string, status: string, dateStr?: string) => {
    try {
        const today = dateStr || new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
        const isDelivered = status === 'sent';
        const isFailed = status === 'failed' || status === 'Non-Whatsapp';

        await (prisma as any).dailyUsageStat.upsert({
            where: {
                userId_date: {
                    userId,
                    date: today
                }
            },
            create: {
                userId,
                date: today,
                totalCount: 1,
                deliveredCount: isDelivered ? 1 : 0,
                failedCount: isFailed ? 1 : 0
            },
            update: {
                totalCount: { increment: 1 },
                ...(isDelivered ? { deliveredCount: { increment: 1 } } : {}),
                ...(isFailed ? { failedCount: { increment: 1 } } : {})
            }
        });
    } catch (e: any) {
        console.error('Failed to record daily usage stat:', e?.message || e);
    }
};

export const backfillDailyStats = async () => {
    try {
        const count = await (prisma as any).dailyUsageStat.count();
        if (count === 0) {
            console.log('[DailyUsage] Initializing historical daily stats from existing logs...');
            const logs = await prisma.messageLog.findMany({
                select: { userId: true, status: true, createdAt: true }
            });
            const aggregated: Record<string, { total: number; delivered: number; failed: number }> = {};
            for (const log of logs) {
                const dateStr = log.createdAt.toISOString().split('T')[0];
                const key = `${log.userId}_${dateStr}`;
                if (!aggregated[key]) {
                    aggregated[key] = { total: 0, delivered: 0, failed: 0 };
                }
                aggregated[key].total += 1;
                if (log.status === 'sent') aggregated[key].delivered += 1;
                else if (log.status === 'failed' || log.status === 'Non-Whatsapp') aggregated[key].failed += 1;
            }

            for (const [key, val] of Object.entries(aggregated)) {
                const [userId, date] = key.split('_');
                await (prisma as any).dailyUsageStat.upsert({
                    where: { userId_date: { userId, date } },
                    create: {
                        userId,
                        date,
                        totalCount: val.total,
                        deliveredCount: val.delivered,
                        failedCount: val.failed
                    },
                    update: {
                        totalCount: val.total,
                        deliveredCount: val.delivered,
                        failedCount: val.failed
                    }
                });
            }
            console.log(`[DailyUsage] Initialized ${Object.keys(aggregated).length} daily records into DailyUsageStat!`);
        }
    } catch (e: any) {
        console.error('[DailyUsage] Backfill error:', e?.message || e);
    }
};

// ─────────────────────────────────────────────────────────────
// MULTI-SIM LOAD BALANCER & FAILOVER POOL RESOLVER
// ─────────────────────────────────────────────────────────────
const roundRobinIndices = new Map<string, number>();

/**
/**
 * Resolves target instances for an API or broadcast user.
 * Supports:
 * - Specific pool name / slug (e.g. "marketing", "otp-gateway", "support")
 * - Single instance_id
 * - Auto-Pool (selects from all connected instances of the user)
 */
async function resolveInstancesForUser(
    user: any, 
    requestedInstanceId?: string, 
    requestedPoolName?: string
): Promise<{ primary: any; pool: any[]; poolName?: string }> {
    let candidateIds: string[] = [];
    let matchedPoolName: string | undefined = undefined;

    if (requestedPoolName) {
        const rawPool = String(requestedPoolName).trim();
        const slug = rawPool.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        try {
            const foundPool = await (prisma as any).instancePool.findFirst({
                where: {
                    userId: user.id,
                    OR: [
                        { name: rawPool },
                        { slug: slug },
                        { slug: rawPool.toLowerCase() }
                    ]
                }
            });
            if (foundPool) {
                matchedPoolName = foundPool.name;
                const parsed = JSON.parse(foundPool.instanceIds || '[]');
                if (Array.isArray(parsed) && parsed.length > 0) {
                    candidateIds = parsed;
                }
            } else {
                throw new Error(`Instance pool "${rawPool}" not found for your account.`);
            }
        } catch (dbErr: any) {
            if (dbErr.message?.includes('Instance pool')) throw dbErr;
        }
    }

    if (candidateIds.length === 0 && requestedInstanceId) {
        candidateIds = String(requestedInstanceId).split(',').map(s => s.trim()).filter(Boolean);
    }

    let connectedInstances: any[] = [];
    if (candidateIds.length > 0) {
        connectedInstances = await prisma.instance.findMany({
            where: { id: { in: candidateIds }, userId: user.id, status: 'connected' }
        });
        if (connectedInstances.length === 0) {
            const anyInst = await prisma.instance.findFirst({ where: { id: { in: candidateIds }, userId: user.id } });
            if (!anyInst) {
                throw new Error(matchedPoolName ? `All SIMs in pool "${matchedPoolName}" are disconnected` : 'Specified instance(s) not found or do not belong to your account');
            }
            throw new Error(matchedPoolName ? `All SIMs in pool "${matchedPoolName}" are currently disconnected` : 'Specified instance(s) are currently disconnected');
        }
    } else {
        // Default Auto-Pool: load-balance across all active connected instances
        connectedInstances = await prisma.instance.findMany({
            where: { userId: user.id, status: 'connected' }
        });
        if (connectedInstances.length === 0) {
            throw new Error('No active connected WhatsApp instances found. Please connect a number first.');
        }
    }

    // Round-Robin rotation index per user / candidate group
    const poolKey = candidateIds.length > 0 ? `${user.id}:${candidateIds.sort().join(':')}` : `${user.id}:all`;
    const currentIndex = roundRobinIndices.get(poolKey) || 0;
    const selectedIdx = currentIndex % connectedInstances.length;
    roundRobinIndices.set(poolKey, selectedIdx + 1);

    const primary = connectedInstances[selectedIdx];
    const pool = [primary, ...connectedInstances.filter(i => i.id !== primary.id)];

    return { primary, pool, poolName: matchedPoolName };
}

/**
 * Executes a send action with instant failover across the instance pool.
 */
async function executeWithFailover(
    pool: any[], 
    sendFn: (instanceId: string) => Promise<any>
): Promise<{ result: any; usedInstanceId: string }> {
    let lastErr: any = null;
    for (const inst of pool) {
        try {
            const result = await sendFn(inst.id);
            return { result, usedInstanceId: inst.id };
        } catch (err: any) {
            lastErr = err;
            if (err?.message === 'Non-Whatsapp') {
                throw err;
            }
            console.warn(`[MultiSIM Failover] Instance ${inst.id} failed (${err?.message || err}), trying next instance in pool...`);
        }
    }
    throw lastErr || new Error('All instances in pool failed to send message');
}

// ─────────────────────────────────────────────────────────────
// INSTANCE POOL MANAGEMENT REST APIS
// ─────────────────────────────────────────────────────────────
router.get('/pools', authenticate, async (req: any, res: any) => {
    try {
        const userId = req.user.userId;
        const pools = await (prisma as any).instancePool.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });
        const userInstances = await prisma.instance.findMany({
            where: { userId },
            select: { id: true, phoneNumber: true, status: true }
        });
        const instMap = new Map(userInstances.map(i => [i.id, i]));

        const formatted = pools.map((p: any) => {
            let ids: string[] = [];
            try { ids = JSON.parse(p.instanceIds || '[]'); } catch { ids = []; }
            const members = ids.map(id => instMap.get(id)).filter(Boolean);
            const connectedCount = members.filter(m => m?.status === 'connected').length;
            return {
                id: p.id,
                name: p.name,
                slug: p.slug,
                instanceIds: ids,
                totalCount: ids.length,
                connectedCount,
                members,
                createdAt: p.createdAt
            };
        });
        res.json({ success: true, pools: formatted });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

router.post('/pools', authenticate, async (req: any, res: any) => {
    try {
        const userId = req.user.userId;
        const { id, name, instanceIds } = req.body;
        if (!name || typeof name !== 'string' || !name.trim()) {
            return res.status(400).json({ success: false, error: 'Pool name is required' });
        }
        if (!Array.isArray(instanceIds) || instanceIds.length === 0) {
            return res.status(400).json({ success: false, error: 'Select at least 1 instance for this pool' });
        }

        const cleanName = name.trim();
        const slug = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        const jsonIds = JSON.stringify(instanceIds.map(String).map(s => s.trim()));

        let pool: any;
        if (id) {
            pool = await (prisma as any).instancePool.update({
                where: { id, userId },
                data: { name: cleanName, slug, instanceIds: jsonIds }
            });
        } else {
            pool = await (prisma as any).instancePool.upsert({
                where: { userId_slug: { userId, slug } },
                create: { userId, name: cleanName, slug, instanceIds: jsonIds },
                update: { name: cleanName, instanceIds: jsonIds }
            });
        }

        res.json({ success: true, pool });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

router.delete('/pools/:id', authenticate, async (req: any, res: any) => {
    try {
        const userId = req.user.userId;
        await (prisma as any).instancePool.delete({
            where: { id: req.params.id, userId }
        });
        res.json({ success: true, message: 'Pool deleted successfully' });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// --- API TO SEND MESSAGE ---
const handleSendMessage = async (req: any, res: any) => {
    const instance_id = req.body?.instance_id || req.query?.instance_id || req.body?.instanceId || req.query?.instanceId || req.body?.instance || req.query?.instance;
    const pool_name = req.body?.pool || req.query?.pool || req.body?.pool_name || req.query?.pool_name || req.body?.poolName || req.query?.poolName;
    const api_key = req.body?.api_key || req.query?.api_key || req.body?.apiKey || req.query?.apiKey || req.body?.access_token || req.query?.access_token || req.headers?.['x-api-key'] || (req.headers?.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : undefined);
    let number = req.body?.number || req.query?.number || req.body?.phone || req.query?.phone || req.body?.to || req.query?.to;
    const message = req.body?.message !== undefined ? req.body.message : (req.query?.message !== undefined ? req.query.message : (req.body?.body || req.query?.body));
    const media_url = req.body?.media_url || req.query?.media_url || req.body?.mediaUrl || req.query?.mediaUrl || req.body?.url || req.query?.url;
    const filename = req.body?.filename || req.query?.filename || req.body?.fileName || req.query?.fileName;

    if (!api_key || !number) {
        return res.status(400).json({ error: 'Missing required fields: api_key (or access_token), number' });
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

        // Resolve active multi-SIM pool with load balancing
        const { primary, pool, poolName } = await resolveInstancesForUser(user, instance_id, pool_name);

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
                    instanceId: primary.id,
                    userId: user.id,
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

            const currentMonth = new Date().toISOString().slice(0, 7);
            await prisma.user.update({
                where: { id: user.id },
                data: { messagesSentThisMonth: { increment: 1 }, lastMessageMonth: currentMonth }
            });
        } catch (dbErr) { console.error('Log error:', dbErr); }

        // Background processing with failover
        (async () => {
            let finalStatus = 'sent';
            let activeInstId = primary.id;
            try {
                const safeMessage = applyInvisibleAntiHash(message || '');
                const { usedInstanceId } = await executeWithFailover(pool, (instId) => 
                    sendMessage(instId, number, safeMessage, fileObj)
                );
                activeInstId = usedInstanceId;
            } catch (err: any) {
                console.error('SEND MESSAGE ERROR:', err);
                finalStatus = err?.message === 'Non-Whatsapp' ? 'Non-Whatsapp' : 'failed';
            }
            
            if (logRecord) {
                try {
                    await prisma.messageLog.update({
                        where: { id: logRecord.id },
                        data: { status: finalStatus, instanceId: activeInstId }
                    });
                } catch (updateErr) { console.error('Update log error:', updateErr); }
            }
            await recordDailyUsage(user.id, finalStatus);
        })();

        res.json({ 
            success: true, 
            message: 'Message queued', 
            message_id: logRecord?.id, 
            assigned_instance: primary.id,
            pool_size: pool.length 
        });
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

            // Call button (e.g. call_btn=Call+Us|+91XXXXXXXXXX or call_phone=+91XXXXXXXXXX)
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

            const currentMonth = new Date().toISOString().slice(0, 7);
            await prisma.user.update({
                where: { id: user.id },
                data: { messagesSentThisMonth: { increment: 1 }, lastMessageMonth: currentMonth }
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
            await recordDailyUsage(inst.userId, finalStatus);
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
        const user = await prisma.user.findFirst({ where: { OR: [{ apiKey: api_key }, { id: api_key }] } });
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

            const instanceId = instanceIds[i % instanceIds.length];
            const number = targetNumbers[i];
            
            let status = 'sent';
            try {
                if (file) {
                    await sendMessage(instanceId, number, message || '', file);
                } else {
                    await sendMessage(instanceId, number, message || '');
                }
                sentCount++;
                currentMonthCount++;
                await prisma.user.update({
                    where: { id: req.user.userId },
                    data: { messagesSentThisMonth: { increment: 1 }, lastMessageMonth: currentMonth }
                });
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
            await recordDailyUsage(req.user.userId, status);
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

        const [totalCount, sentCount, failedCount, logs] = await Promise.all([
            prisma.messageLog.count({ where }),
            prisma.messageLog.count({ where: { ...where, status: 'sent' } }),
            prisma.messageLog.count({ where: { ...where, status: { in: ['failed', 'Non-Whatsapp'] } } }),
            prisma.messageLog.findMany({
                where,
                include: { instance: true, user: { select: { username: true } } },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit
            })
        ]);

        res.json({ reports: logs, totalCount, sentCount, failedCount, page, limit });
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
        data.checkWhatsAppNumber = req.body.checkWhatsAppNumber !== undefined ? Boolean(req.body.checkWhatsAppNumber) : true;
        const user = await prisma.user.create({ data });
        res.json({ message: 'User created successfully', user: { id: user.id, username: user.username } });
    } catch (e: any) {
        res.status(400).json({ error: 'Username already exists' });
    }
});

router.put('/admin/users/:id', adminAuthenticate, async (req: any, res: any) => {
    try {
        const { username, password, maxInstances, isAdmin, isReseller, role, messageLimit, expiresAt, permissions, checkWhatsAppNumber } = req.body;
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
        if (checkWhatsAppNumber !== undefined) data.checkWhatsAppNumber = Boolean(checkWhatsAppNumber);

        const user = await prisma.user.update({
            where: { id: req.params.id },
            data
        });
        res.json({ message: 'User updated successfully' });
    } catch (e: any) {
        res.status(400).json({ error: 'Failed to update user. Username may already exist.' });
    }
});

// Cascade helper to completely delete any user account and all foreign key child records
export const deleteUserAccountHierarchy = async (userId: string) => {
    // 1. Fetch user and their instances
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { instances: true }
    });
    if (!user) return;

    // 2. Shut down socket sessions & remove session folders on disk
    for (const inst of user.instances) {
        try {
            await deleteInstanceSession(inst.id);
        } catch (err) {
            console.error(`Failed to delete session for instance ${inst.id}:`, err);
        }
        try {
            const sessDir = `sessions/${inst.id}`;
            if (fs.existsSync(sessDir)) {
                fs.rmSync(sessDir, { recursive: true, force: true });
            }
        } catch (e) {}
    }

    // 3. Delete BroadcastItems & BroadcastCampaigns
    try {
        const campaigns = await prisma.broadcastCampaign.findMany({
            where: { userId },
            select: { id: true }
        });
        const campaignIds = campaigns.map(c => c.id);
        if (campaignIds.length > 0) {
            await prisma.broadcastItem.deleteMany({
                where: { campaignId: { in: campaignIds } }
            });
            await prisma.broadcastCampaign.deleteMany({
                where: { id: { in: campaignIds } }
            });
        }
    } catch (e) {
        console.error('Error cleaning broadcast campaigns:', e);
    }

    // 4. Delete FilterItems & FilterBatches
    try {
        const batches = await prisma.filterBatch.findMany({
            where: { userId },
            select: { id: true }
        });
        const batchIds = batches.map(b => b.id);
        if (batchIds.length > 0) {
            await prisma.filterItem.deleteMany({
                where: { batchId: { in: batchIds } }
            });
            await prisma.filterBatch.deleteMany({
                where: { id: { in: batchIds } }
            });
        }
    } catch (e) {
        console.error('Error cleaning filter batches:', e);
    }

    // 5. Delete MessageLogs
    try {
        await prisma.messageLog.deleteMany({
            where: { userId }
        });
    } catch (e) {
        console.error('Error cleaning message logs:', e);
    }

    // 6. Delete InstancePools & DailyUsageStats
    try {
        await (prisma as any).instancePool.deleteMany({
            where: { userId }
        });
    } catch (e) {}
    try {
        await (prisma as any).dailyUsageStat.deleteMany({
            where: { userId }
        });
    } catch (e) {}

    // 7. Delete Instances
    try {
        await prisma.instance.deleteMany({
            where: { userId }
        });
    } catch (e) {
        console.error('Error cleaning instances:', e);
    }

    // 8. If user is a reseller, cascade delete sub-clients
    try {
        const subClients = await prisma.user.findMany({
            where: { resellerId: userId },
            select: { id: true }
        });
        for (const sub of subClients) {
            await deleteUserAccountHierarchy(sub.id);
        }
    } catch (e) {
        console.error('Error cleaning sub-clients:', e);
    }

    // 9. Finally delete the user record
    await prisma.user.delete({
        where: { id: userId }
    });
};

// DELETE /admin/users/:id (Super Admin Delete User)
router.delete('/admin/users/:id', adminAuthenticate, async (req: any, res: any) => {
    try {
        const { id } = req.params;
        if (id === req.user.userId) {
            return res.status(400).json({ error: 'Cannot delete your own active administrator account' });
        }

        const targetUser = await prisma.user.findUnique({
            where: { id }
        });

        if (!targetUser) {
            return res.status(404).json({ error: 'User account not found' });
        }

        // Perform complete cascade deletion
        await deleteUserAccountHierarchy(id);

        res.json({ success: true, message: `User @${targetUser.username} deleted successfully` });
    } catch (e: any) {
        console.error('Error deleting user:', e);
        res.status(500).json({ error: e.message || 'Failed to delete user account' });
    }
});

router.get('/admin/users', adminAuthenticate, async (req: any, res: any) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = req.query.search || '';
    const skip = (page - 1) * limit;

    const where = search ? { username: { contains: search } } : {};
    
    const [users, total, adminCount, resellerCount, activeCount] = await Promise.all([
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
                checkWhatsAppNumber: true, 
                createdAt: true, 
                _count: { select: { instances: true, clients: true } } 
            },
            orderBy: { createdAt: 'desc' }
        }),
        prisma.user.count({ where }),
        prisma.user.count({ where: { ...where, isAdmin: true } }),
        prisma.user.count({ where: { ...where, OR: [{ isReseller: true }, { role: 'reseller' }] } }),
        prisma.user.count({ where: { ...where, isAdmin: false, OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }] } })
    ]);

    res.json({ users, total, totalUsers: total, adminCount, resellerCount, activeCount, page, totalPages: Math.ceil(total / limit) });
});

// POST /api/admin/impersonate/:userId (Admin Pre-Login)
router.post('/admin/impersonate/:userId', adminAuthenticate, async (req: any, res: any) => {
    try {
        const { userId } = req.params;
        const targetUser = await prisma.user.findUnique({ where: { id: userId } });
        if (!targetUser) {
            return res.status(404).json({ error: 'Target user not found' });
        }

        const isExpired = !targetUser.isAdmin && targetUser.expiresAt && new Date(targetUser.expiresAt) < new Date();
        const token = jwt.sign({ userId: targetUser.id }, JWT_SECRET, { expiresIn: '1d' });
        const userPermissions = targetUser.isAdmin 
            ? 'instances,broadcast,filter,groups,reports,docs' 
            : (targetUser.permissions || 'instances,broadcast,filter,groups,reports,docs');
        const isReseller = !!targetUser.isReseller || targetUser.role === 'reseller';
        const role = targetUser.isAdmin ? 'admin' : (isReseller ? 'reseller' : 'user');

        res.json({
            token,
            isAdmin: targetUser.isAdmin,
            isReseller,
            role,
            isExpired,
            permissions: userPermissions,
            username: targetUser.username,
            userId: targetUser.id,
            impersonated: true
        });
    } catch (e: any) {
        console.error('Admin impersonation error:', e);
        res.status(500).json({ error: 'Failed to pre-login as user' });
    }
});

// GET /api/admin/live-usage (Live Traffic, Daily Usage, Belonging, and Status per User from DailyUsageStat table)
router.get('/admin/live-usage', adminAuthenticate, async (req: any, res: any) => {
    try {
        const range = req.query.range || 'today';
        const search = (req.query.search || '').trim();
        const role = req.query.role || 'all';
        const resellerId = req.query.resellerId || 'all';

        // 1. Calculate Date Range (YYYY-MM-DD)
        const now = new Date();
        const formatDateStr = (d: Date) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };
        
        let startStr: string;
        let endStr: string = formatDateStr(now);

        if (range === 'today') {
            startStr = formatDateStr(now);
            endStr = formatDateStr(now);
        } else if (range === 'yesterday') {
            const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            startStr = formatDateStr(yesterday);
            endStr = formatDateStr(yesterday);
        } else if (range === '7days') {
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            startStr = formatDateStr(sevenDaysAgo);
        } else if (range === '30days') {
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            startStr = formatDateStr(thirtyDaysAgo);
        } else if (range === 'month') {
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            startStr = formatDateStr(firstDay);
        } else if (range === 'custom' && req.query.startDate) {
            startStr = String(req.query.startDate).trim();
            if (req.query.endDate) {
                endStr = String(req.query.endDate).trim();
            }
        } else {
            startStr = '1970-01-01'; // all-time
            endStr = '2099-12-31';
        }

        // 2. Build User Filters
        const userWhere: any = {};
        if (search) {
            userWhere.OR = [
                { username: { contains: search } },
                { reseller: { username: { contains: search } } }
            ];
        }
        if (role === 'reseller') {
            userWhere.OR = [{ isReseller: true }, { role: 'reseller' }];
        } else if (role === 'user') {
            userWhere.AND = [{ isReseller: false }, { isAdmin: false }, { role: 'user' }];
        } else if (role === 'admin') {
            userWhere.isAdmin = true;
        }

        if (resellerId !== 'all') {
            if (resellerId === 'direct') {
                userWhere.resellerId = null;
            } else {
                userWhere.resellerId = resellerId;
            }
        }

        // 3. Fetch Users with Instances and Reseller info
        const users = await prisma.user.findMany({
            where: userWhere,
            select: {
                id: true,
                username: true,
                isAdmin: true,
                isReseller: true,
                role: true,
                resellerId: true,
                reseller: { select: { id: true, username: true } },
                maxInstances: true,
                messageLimit: true,
                messagesSentThisMonth: true,
                expiresAt: true,
                createdAt: true,
                instances: {
                    select: {
                        id: true,
                        status: true,
                        phoneNumber: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const userIds = users.map(u => u.id);

        // 4. Fetch from dedicated DailyUsageStat table (100% Independent of message logs!)
        const dailyStats = await (prisma as any).dailyUsageStat.findMany({
            where: {
                date: {
                    gte: startStr,
                    lte: endStr
                },
                ...(userIds.length > 0 ? { userId: { in: userIds } } : {})
            }
        });

        // Group counts per user and per day
        const userStatsMap: Record<string, { total: number; delivered: number; failed: number }> = {};
        const dailyTrendMap: Record<string, { total: number; delivered: number; failed: number }> = {};

        dailyStats.forEach((stat: any) => {
            // Per user
            if (!userStatsMap[stat.userId]) {
                userStatsMap[stat.userId] = { total: 0, delivered: 0, failed: 0 };
            }
            userStatsMap[stat.userId].total += stat.totalCount;
            userStatsMap[stat.userId].delivered += stat.deliveredCount;
            userStatsMap[stat.userId].failed += stat.failedCount;

            // Per date trend
            if (!dailyTrendMap[stat.date]) {
                dailyTrendMap[stat.date] = { total: 0, delivered: 0, failed: 0 };
            }
            dailyTrendMap[stat.date].total += stat.totalCount;
            dailyTrendMap[stat.date].delivered += stat.deliveredCount;
            dailyTrendMap[stat.date].failed += stat.failedCount;
        });

        // Fetch all available resellers for dropdown filtering
        const resellersList = await prisma.user.findMany({
            where: { OR: [{ isReseller: true }, { role: 'reseller' }] },
            select: { id: true, username: true }
        });

        let grandTotal = 0;
        let grandDelivered = 0;
        let grandFailed = 0;
        let grandConnectedInstances = 0;
        let grandTotalInstances = 0;

        const results = users
            .map(u => {
                const stats = userStatsMap[u.id] || { total: 0, delivered: 0, failed: 0 };
                const connectedInstances = u.instances.filter(i => i.status === 'connected').length;
                const totalInstances = u.instances.length;

                grandTotal += stats.total;
                grandDelivered += stats.delivered;
                grandFailed += stats.failed;
                grandConnectedInstances += connectedInstances;
                grandTotalInstances += totalInstances;

                const successRate = stats.total > 0 ? ((stats.delivered / stats.total) * 100).toFixed(1) : '100.0';
                const isExpired = u.expiresAt && new Date(u.expiresAt) < new Date();

                return {
                    id: u.id,
                    username: u.username,
                    role: u.isAdmin ? 'admin' : (u.isReseller ? 'reseller' : 'user'),
                    isAdmin: u.isAdmin,
                    isReseller: u.isReseller,
                    resellerId: u.resellerId,
                    resellerName: u.reseller?.username || (u.isAdmin ? 'System Admin' : 'Direct / Admin'),
                    isExpired,
                    expiresAt: u.expiresAt,
                    maxInstances: u.maxInstances,
                    totalInstances,
                    connectedInstances,
                    instances: u.instances,
                    messageLimit: u.messageLimit,
                    messagesSentThisMonth: u.messagesSentThisMonth,
                    totalSent: stats.total,
                    deliveredCount: stats.delivered,
                    failedCount: stats.failed,
                    successRate: `${successRate}%`,
                    createdAt: u.createdAt
                };
            })
            .filter(u => u.totalSent > 0);

        // Convert trend map to sorted array
        const dailyTrend = Object.entries(dailyTrendMap)
            .map(([date, counts]) => ({ date, ...counts }))
            .sort((a, b) => a.date.localeCompare(b.date));

        res.json({
            range,
            startDate: startStr,
            endDate: endStr,
            totals: {
                grandTotal,
                grandDelivered,
                grandFailed,
                grandConnectedInstances,
                grandTotalInstances,
                totalUsers: users.length,
                overallSuccessRate: grandTotal > 0 ? `${((grandDelivered / grandTotal) * 100).toFixed(1)}%` : '100.0%'
            },
            dailyTrend,
            resellers: resellersList,
            users: results
        });
    } catch (e: any) {
        console.error('Live usage fetch error:', e);
        res.status(500).json({ error: e.message || 'Failed to fetch live usage data' });
    }
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
                    checkWhatsAppNumber: true,
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

// GET /api/reseller/live-usage (Live Traffic & Usage for Reseller's own clients from DailyUsageStat table)
router.get('/reseller/live-usage', resellerAuthenticate, async (req: any, res: any) => {
    try {
        const range = req.query.range || 'today';
        const search = (req.query.search || '').trim();

        const now = new Date();
        const formatDateStr = (d: Date) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        let startStr: string;
        let endStr: string = formatDateStr(now);

        if (range === 'today') {
            startStr = formatDateStr(now);
            endStr = formatDateStr(now);
        } else if (range === 'yesterday') {
            const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            startStr = formatDateStr(yesterday);
            endStr = formatDateStr(yesterday);
        } else if (range === '7days') {
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            startStr = formatDateStr(sevenDaysAgo);
        } else if (range === '30days') {
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            startStr = formatDateStr(thirtyDaysAgo);
        } else if (range === 'month') {
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            startStr = formatDateStr(firstDay);
        } else if (range === 'custom' && req.query.startDate) {
            startStr = String(req.query.startDate).trim();
            if (req.query.endDate) {
                endStr = String(req.query.endDate).trim();
            }
        } else {
            startStr = '1970-01-01';
            endStr = '2099-12-31';
        }

        const userWhere: any = {
            resellerId: req.user.userId,
            ...(search ? { username: { contains: search } } : {})
        };

        const clients = await prisma.user.findMany({
            where: userWhere,
            select: {
                id: true,
                username: true,
                role: true,
                maxInstances: true,
                messageLimit: true,
                messagesSentThisMonth: true,
                expiresAt: true,
                createdAt: true,
                instances: {
                    select: {
                        id: true,
                        status: true,
                        phoneNumber: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const clientIds = clients.map(c => c.id);

        const dailyStats = await (prisma as any).dailyUsageStat.findMany({
            where: {
                date: {
                    gte: startStr,
                    lte: endStr
                },
                ...(clientIds.length > 0 ? { userId: { in: clientIds } } : {})
            }
        });

        const userStatsMap: Record<string, { total: number; delivered: number; failed: number }> = {};
        const dailyTrendMap: Record<string, { total: number; delivered: number; failed: number }> = {};

        dailyStats.forEach((stat: any) => {
            if (!userStatsMap[stat.userId]) {
                userStatsMap[stat.userId] = { total: 0, delivered: 0, failed: 0 };
            }
            userStatsMap[stat.userId].total += stat.totalCount;
            userStatsMap[stat.userId].delivered += stat.deliveredCount;
            userStatsMap[stat.userId].failed += stat.failedCount;

            if (!dailyTrendMap[stat.date]) {
                dailyTrendMap[stat.date] = { total: 0, delivered: 0, failed: 0 };
            }
            dailyTrendMap[stat.date].total += stat.totalCount;
            dailyTrendMap[stat.date].delivered += stat.deliveredCount;
            dailyTrendMap[stat.date].failed += stat.failedCount;
        });

        let grandTotal = 0;
        let grandDelivered = 0;
        let grandFailed = 0;
        let grandConnectedInstances = 0;
        let grandTotalInstances = 0;

        const results = clients
            .map(u => {
                const stats = userStatsMap[u.id] || { total: 0, delivered: 0, failed: 0 };
                const connectedInstances = u.instances.filter(i => i.status === 'connected').length;
                const totalInstances = u.instances.length;

                grandTotal += stats.total;
                grandDelivered += stats.delivered;
                grandFailed += stats.failed;
                grandConnectedInstances += connectedInstances;
                grandTotalInstances += totalInstances;

                const successRate = stats.total > 0 ? ((stats.delivered / stats.total) * 100).toFixed(1) : '100.0';
                const isExpired = u.expiresAt && new Date(u.expiresAt) < new Date();

                return {
                    id: u.id,
                    username: u.username,
                    role: 'user',
                    isExpired,
                    expiresAt: u.expiresAt,
                    maxInstances: u.maxInstances,
                    totalInstances,
                    connectedInstances,
                    instances: u.instances,
                    messageLimit: u.messageLimit,
                    messagesSentThisMonth: u.messagesSentThisMonth,
                    totalSent: stats.total,
                    deliveredCount: stats.delivered,
                    failedCount: stats.failed,
                    successRate: `${successRate}%`,
                    createdAt: u.createdAt
                };
            })
            .filter(u => u.totalSent > 0);

        const dailyTrend = Object.entries(dailyTrendMap)
            .map(([date, counts]) => ({ date, ...counts }))
            .sort((a, b) => a.date.localeCompare(b.date));

        res.json({
            range,
            startDate: startStr,
            endDate: endStr,
            totals: {
                grandTotal,
                grandDelivered,
                grandFailed,
                grandConnectedInstances,
                grandTotalInstances,
                totalClients: clients.length,
                overallSuccessRate: grandTotal > 0 ? `${((grandDelivered / grandTotal) * 100).toFixed(1)}%` : '100.0%'
            },
            dailyTrend,
            clients: results
        });
    } catch (e: any) {
        console.error('Reseller live usage error:', e);
        res.status(500).json({ error: e.message || 'Failed to fetch client usage data' });
    }
});

// Create Client under Reseller
router.post('/reseller/clients', resellerAuthenticate, async (req: any, res: any) => {
    try {
        const { username, password, maxInstances, messageLimit, expiresAt, permissions, checkWhatsAppNumber } = req.body;
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
            checkWhatsAppNumber: checkWhatsAppNumber !== undefined ? Boolean(checkWhatsAppNumber) : true,
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
        const { username, password, maxInstances, messageLimit, expiresAt, permissions, checkWhatsAppNumber } = req.body;

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
        if (checkWhatsAppNumber !== undefined) data.checkWhatsAppNumber = Boolean(checkWhatsAppNumber);

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

// Delete Client (Reseller or Super Admin)
router.delete('/reseller/clients/:id', resellerAuthenticate, async (req: any, res: any) => {
    try {
        const { id } = req.params;
        const targetClient = await prisma.user.findFirst({
            where: {
                id,
                ...(req.user.isAdmin ? {} : { resellerId: req.user.userId })
            }
        });

        if (!targetClient) {
            return res.status(404).json({ error: 'Client account not found or unauthorized' });
        }

        // Perform complete cascade deletion
        await deleteUserAccountHierarchy(id);

        res.json({ success: true, message: 'Client deleted successfully' });
    } catch (e: any) {
        console.error('Error deleting reseller client:', e);
        res.status(500).json({ error: e.message || 'Failed to delete client' });
    }
});

// POST /api/reseller/impersonate/:userId (Reseller Pre-Login into client)
router.post('/reseller/impersonate/:userId', resellerAuthenticate, async (req: any, res: any) => {
    try {
        const { userId } = req.params;
        const targetClient = await prisma.user.findFirst({
            where: {
                id: userId,
                resellerId: req.user.userId
            }
        });

        if (!targetClient) {
            return res.status(404).json({ error: 'Client user not found or does not belong to your reseller account' });
        }

        const isExpired = targetClient.expiresAt && new Date(targetClient.expiresAt) < new Date();
        const token = jwt.sign({ userId: targetClient.id }, JWT_SECRET, { expiresIn: '1d' });
        const userPermissions = targetClient.permissions || 'instances,broadcast,filter,groups,reports,docs';

        res.json({
            token,
            isAdmin: false,
            isReseller: false,
            role: 'user',
            isExpired,
            permissions: userPermissions,
            username: targetClient.username,
            userId: targetClient.id,
            impersonated: true
        });
    } catch (e: any) {
        console.error('Reseller impersonation error:', e);
        res.status(500).json({ error: 'Failed to pre-login as client' });
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
            orderBy: { createdAt: 'desc' }
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
// ─────────────────────────────────────────────────────────────
// PUBLIC SEND API  (TechRush-style, no JWT – uses access_token)
// GET  /api/send?number=91XXXXXXXXXX&type=text&message=Hello&instance_id=XXXX&access_token=XXXX
// POST /api/send  (same params in JSON body or query)
// ─────────────────────────────────────────────────────────────
const publicSendHandler = async (req: any, res: any) => {
    // Accept params from query string (GET) or body (POST)
    const p = { ...req.query, ...req.body };
    const { type = 'text', message, media_url, instance_id, pool: pool_param, pool_name, access_token } = p;
    let number = p.number;

    if (!access_token) return res.status(401).json({ success: false, error: 'access_token is required' });
    if (!number)       return res.status(400).json({ success: false, error: 'number is required' });

    number = String(number);

    // Authenticate by API key
    const user = await prisma.user.findUnique({ where: { apiKey: access_token } });
    if (!user) return res.status(401).json({ success: false, error: 'Invalid access_token' });

    // Check account expiry
    if (!user.isAdmin && user.expiresAt && new Date(user.expiresAt) < new Date()) {
        return res.status(403).json({ success: false, error: 'Account has expired' });
    }

    // Resolve multi-SIM instance pool
    const { primary, pool, poolName } = await resolveInstancesForUser(user, instance_id, pool_param || pool_name);

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
            data: { instanceId: primary.id, userId: user.id, toNumber: number, message: messageVal, status: 'pending' }
        });
        const currentMonth = new Date().toISOString().slice(0, 7);
        await prisma.user.update({
            where: { id: user.id },
            data: { messagesSentThisMonth: { increment: 1 }, lastMessageMonth: currentMonth }
        });
    } catch (dbErr) { console.error('Public API log error:', dbErr); }

    try {
        let sendResult: any = null;
        let activeInstId = primary.id;

        if (type === 'text' || !media_url) {
            if (!message) return res.status(400).json({ success: false, error: 'message is required for type=text' });
            const safeMessage = applyInvisibleAntiHash(message);
            const { result, usedInstanceId } = await executeWithFailover(pool, (instId) => 
                sendMessage(instId, number, safeMessage)
            );
            sendResult = result;
            activeInstId = usedInstanceId;
        } else {
            const mimetype = getMimetype(media_url, type);
            const fileName = p.filename || media_url.split('/').pop() || 'file';
            const safeCaption = message ? applyInvisibleAntiHash(message) : '';
            const { result, usedInstanceId } = await executeWithFailover(pool, (instId) => 
                sendMessage(instId, number, safeCaption, { url: media_url, mimetype, fileName })
            );
            sendResult = result;
            activeInstId = usedInstanceId;
        }

        if (logRecord) {
            try { await prisma.messageLog.update({ where: { id: logRecord.id }, data: { status: 'sent', instanceId: activeInstId } }); } catch {}
        }
        await recordDailyUsage(user.id, 'sent');

        return res.json({
            status: "success",
            instance_id: activeInstId,
            pool_name: poolName,
            pool_size: pool.length,
            message: sendResult,
            messageTimestamp: Math.floor(Date.now() / 1000).toString()
        });

    } catch (err: any) {
        console.error('[PublicAPI] Send error:', err?.message);
        const finalStatus = err?.message === 'Non-Whatsapp' ? 'Non-Whatsapp' : 'failed';
        if (logRecord) {
            try { await prisma.messageLog.update({ where: { id: logRecord.id }, data: { status: finalStatus } }); } catch {}
        }
        await recordDailyUsage(user.id, finalStatus);
        return res.status(err?.message === 'Non-Whatsapp' ? 400 : 500).json({ 
            success: false, 
            error: err?.message === 'Non-Whatsapp' ? 'Recipient number is not registered on WhatsApp' : (err?.message || 'Failed to send message') 
        });
    }
};

router.get('/send',  publicSendHandler);
router.post('/send', publicSendHandler);

// ─────────────────────────────────────────────────────────────
// DEDICATED HIGH-PRIORITY OTP & AUTHENTICATION ENDPOINT
// ─────────────────────────────────────────────────────────────
const handleSendOtp = async (req: any, res: any) => {
    const startTime = Date.now();
    const instance_id = req.body?.instance_id || req.query?.instance_id || req.body?.instanceId || req.query?.instanceId || req.body?.instance || req.query?.instance;
    const pool_name = req.body?.pool || req.query?.pool || req.body?.pool_name || req.query?.pool_name || req.body?.poolName || req.query?.poolName;
    const api_key = req.body?.api_key || req.query?.api_key || req.body?.apiKey || req.query?.apiKey || req.body?.access_token || req.query?.access_token || req.headers?.['x-api-key'] || (req.headers?.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : undefined);
    let number = req.body?.number || req.query?.number || req.body?.phone || req.query?.phone || req.body?.to || req.query?.to;
    
    // OTP & Custom Message parameters (100% Client Controlled)
    const otp = req.body?.otp || req.query?.otp || req.body?.code || req.query?.code;
    let message = req.body?.message || req.query?.message || req.body?.msg || req.query?.msg || req.body?.text || req.query?.text || req.body?.template || req.query?.template;
    const footer = req.body?.footer || req.query?.footer;
    const header = req.body?.header || req.query?.header;
    const copy_button = req.body?.copy_button !== undefined ? req.body.copy_button : (req.query?.copy_button !== undefined ? req.query.copy_button : (req.body?.copyButton || req.query?.copyButton));
    const copy_button_label = req.body?.copy_button_label || req.query?.copy_button_label || req.body?.button_text || req.query?.button_text || 'Copy Code';

    if (!api_key || !number) {
        return res.status(400).json({ success: false, error: 'Missing required fields: api_key, number' });
    }

    if (!message && !otp) {
        return res.status(400).json({ success: false, error: 'Either "message" (your custom OTP text) or "otp" is required' });
    }

    number = String(number).trim().replace(/[^0-9]/g, '');

    // Substitute {{otp}} or {otp} or {{code}} if client passes both template and code
    if (message && otp) {
        message = String(message)
            .replace(/\{\{\s*otp\s*\}\}/gi, String(otp))
            .replace(/\{\s*otp\s*\}/gi, String(otp))
            .replace(/\{\{\s*code\s*\}\}/gi, String(otp))
            .replace(/\{\s*code\s*\}/gi, String(otp));
    } else if (!message && otp) {
        message = String(otp);
    }

    try {
        const user = await prisma.user.findFirst({ where: { OR: [{ apiKey: api_key }, { id: api_key }] } });
        if (!user) return res.status(401).json({ success: false, error: 'Invalid api_key or access_token' });
        
        if (!user.isAdmin && user.expiresAt && new Date(user.expiresAt) < new Date()) {
            return res.status(403).json({ success: false, error: 'Account has expired. Please contact admin.' });
        }

        // Resolve multi-SIM pool with load balancing
        const { primary, pool, poolName } = await resolveInstancesForUser(user, instance_id, pool_name);

        if (!(await checkMessageLimit(user.id))) {
            return res.status(403).json({ success: false, error: 'Monthly message limit exceeded' });
        }

        const isCopyBtnRequested = copy_button === true || copy_button === 'true' || copy_button === 1 || copy_button === '1';
        let logMessageText = String(message);
        if (footer) logMessageText += `\n_${footer}_`;

        let logRecord: any = null;
        try {
            logRecord = await prisma.messageLog.create({
                data: {
                    instanceId: primary.id,
                    userId: user.id,
                    toNumber: number,
                    message: logMessageText,
                    status: 'pending'
                }
            });
            const currentMonth = new Date().toISOString().slice(0, 7);
            await prisma.user.update({
                where: { id: user.id },
                data: { messagesSentThisMonth: { increment: 1 }, lastMessageMonth: currentMonth }
            });
        } catch (dbErr) {
            console.error('[OTP] Log error:', dbErr);
        }

        // High-priority synchronous execution with multi-SIM failover
        let sendResult: any = null;
        let activeInstId = primary.id;

        if (isCopyBtnRequested) {
            const buttonCode = otp ? String(otp).trim() : (String(message).replace(/[^0-9]/g, '') || String(message).trim());
            const safeBody = applyInvisibleAntiHash(String(message));

            const { result, usedInstanceId } = await executeWithFailover(pool, (instId) =>
                sendInteractiveMessage(instId, number, {
                    headerType: header ? 'text' : 'none',
                    headerText: header ? String(header).trim() : undefined,
                    body: safeBody,
                    footer: footer ? String(footer).trim() : undefined,
                    buttons: [
                        {
                            type: 'cta_copy',
                            label: String(copy_button_label),
                            copy_code: buttonCode
                        }
                    ]
                })
            );
            sendResult = result;
            activeInstId = usedInstanceId;
        } else {
            // Standard custom text with optional footer and invisible anti-hash
            let rawMessage = String(message);
            if (footer) {
                rawMessage += `\n\n_${footer}_`;
            }
            const safeMessage = applyInvisibleAntiHash(rawMessage);
            const { result, usedInstanceId } = await executeWithFailover(pool, (instId) =>
                sendMessage(instId, number, safeMessage)
            );
            sendResult = result;
            activeInstId = usedInstanceId;
        }

        const latencyMs = Date.now() - startTime;

        if (logRecord) {
            try { await prisma.messageLog.update({ where: { id: logRecord.id }, data: { status: 'sent', instanceId: activeInstId } }); } catch {}
        }
        await recordDailyUsage(user.id, 'sent');

        return res.json({
            success: true,
            status: "sent",
            has_copy_button: Boolean(isCopyBtnRequested),
            instance_id: activeInstId,
            pool_name: poolName,
            pool_size: pool.length,
            message_id: logRecord?.id || sendResult?.key?.id,
            to: number,
            latency_ms: latencyMs,
            timestamp: Math.floor(Date.now() / 1000)
        });

    } catch (err: any) {
        console.error('[OTP API] Send error:', err?.message || err);
        return res.status(err?.message === 'Non-Whatsapp' ? 400 : 500).json({
            success: false,
            error: err?.message === 'Non-Whatsapp' ? 'Recipient number is not registered on WhatsApp' : (err?.message || 'Failed to send OTP')
        });
    }
};

router.post('/send/otp', handleSendOtp);
router.get('/send/otp', handleSendOtp);
router.post('/otp/send', handleSendOtp);
router.get('/otp/send', handleSendOtp);

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

        const [batches, totalCount, aggregateStats] = await Promise.all([
            prisma.filterBatch.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            }),
            prisma.filterBatch.count({ where }),
            prisma.filterBatch.aggregate({
                where,
                _sum: {
                    totalCount: true,
                    validCount: true,
                    invalidCount: true
                }
            })
        ]);

        res.json({
            batches,
            totalCount,
            totalVerified: aggregateStats._sum.totalCount || 0,
            totalValid: aggregateStats._sum.validCount || 0,
            totalInvalid: aggregateStats._sum.invalidCount || 0,
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

        let sendResult: any = null;
        try {
            const { sendMessage } = require('../services/whatsapp.service');
            sendResult = await sendMessage(instanceId, formattedJid, message || '', fileObj);

            if (logRecord) {
                try { await prisma.messageLog.update({ where: { id: logRecord.id }, data: { status: 'sent' } }); } catch {}
            }
            await recordDailyUsage(req.user.userId, 'sent');
        } catch (sendErr: any) {
            console.error('Group send error:', sendErr);
            if (logRecord) {
                try { await prisma.messageLog.update({ where: { id: logRecord.id }, data: { status: 'failed' } }); } catch {}
            }
            await recordDailyUsage(req.user.userId, 'failed');
            throw sendErr;
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

        let sendResult: any = null;
        try {
            const { sendMessage } = require('../services/whatsapp.service');
            sendResult = await sendMessage(instance_id, formattedJid, message || '', fileObj);

            if (logRecord) {
                try { await prisma.messageLog.update({ where: { id: logRecord.id }, data: { status: 'sent' } }); } catch {}
            }
            await recordDailyUsage(user.id, 'sent');
        } catch (sendErr: any) {
            console.error('Public group send error:', sendErr);
            if (logRecord) {
                try { await prisma.messageLog.update({ where: { id: logRecord.id }, data: { status: 'failed' } }); } catch {}
            }
            await recordDailyUsage(user.id, 'failed');
            throw sendErr;
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

// ─────────────────────────────────────────────────────────────
// BROADCAST CAMPAIGNS & BATCH NUMBER MANAGEMENT
// ─────────────────────────────────────────────────────────────

// Helper function to resolve Spintax: {Hi|Hello|Hey} -> Random choice
const resolveSpintax = (text: string): string => {
    if (!text) return '';
    return text.replace(/\{([^{}]+)\}/g, (_, choices) => {
        const options = choices.split('|');
        return options[Math.floor(Math.random() * options.length)] || '';
    });
};

// Start a new Broadcast Campaign Batch with Instant Creation & Background Dispatch
router.post('/broadcast/campaigns/start', authenticate, async (req: any, res: any) => {
    try {
        const {
            name,
            instances: requestedInstances,
            poolName,
            messageType = 'text',
            messageText,
            mediaUrl,
            headerType = 'none',
            headerText,
            headerImageUrl,
            body,
            footer,
            buttons,
            numbers,
            minDelay = 3,
            maxDelay = 8,
            batchSize = 50,
            batchDelay = 30
        } = req.body;

        const userId = req.user.userId;

        // Parse and clean numbers
        let numberList: string[] = [];
        if (Array.isArray(numbers)) {
            numberList = numbers.map(n => String(n).trim().replace(/[^0-9]/g, '')).filter(n => n.length >= 7);
        } else if (typeof numbers === 'string') {
            numberList = numbers.split(/[\r\n,;]+/).map(n => n.trim().replace(/[^0-9]/g, '')).filter(n => n.length >= 7);
        }
        numberList = Array.from(new Set(numberList)); // Deduplicate

        if (numberList.length === 0) {
            return res.status(400).json({ error: 'Please provide at least one valid recipient phone number.' });
        }

        // Validate sender instances
        let senderInstances: string[] = [];
        if (Array.isArray(requestedInstances) && requestedInstances.length > 0) {
            senderInstances = requestedInstances;
        } else if (poolName) {
            const pool = await (prisma as any).instancePool.findFirst({
                where: { userId, name: poolName }
            });
            if (pool) {
                try {
                    senderInstances = JSON.parse(pool.instanceIds || '[]');
                } catch (e) {}
            }
        }

        if (senderInstances.length === 0) {
            const connected = await prisma.instance.findMany({
                where: { userId, status: 'connected' },
                select: { id: true }
            });
            senderInstances = connected.map(c => c.id);
        }

        if (senderInstances.length === 0) {
            return res.status(400).json({ error: 'No active WhatsApp instances available for sending. Please connect an instance.' });
        }

        // 1. Instantly create the campaign record in DB
        const campaign = await (prisma as any).broadcastCampaign.create({
            data: {
                userId,
                name: (name || `Campaign ${new Date().toLocaleDateString()}`).trim(),
                instanceId: senderInstances.length === 1 ? senderInstances[0] : null,
                poolName: poolName || null,
                messageType: messageType || 'text',
                messageText: messageType === 'interactive' ? (body || '') : (messageText || ''),
                mediaUrl: messageType === 'media' ? (mediaUrl || null) : messageType === 'interactive' && headerType === 'image' ? (headerImageUrl || null) : null,
                totalCount: numberList.length,
                sentCount: 0,
                failedCount: 0,
                status: 'running'
            }
        });

        // 2. Instantly create all pending item records in DB
        const itemRecords = numberList.map(num => ({
            campaignId: campaign.id,
            number: num,
            status: 'pending',
            error: null
        }));

        const chunkSize = 500;
        for (let i = 0; i < itemRecords.length; i += chunkSize) {
            const chunk = itemRecords.slice(i, i + chunkSize);
            await (prisma as any).broadcastItem.createMany({
                data: chunk
            });
        }

        // 3. Immediately respond to client so frontend can instantly navigate to /broadcast
        res.json({
            success: true,
            message: 'Campaign batch created and queued for background dispatch',
            campaign
        });

        // 4. Background Async Worker Loop
        (async () => {
            const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
            const safeMin = Math.max(0, Math.min(Number(minDelay) || 3, Number(maxDelay) || 8));
            const safeMax = Math.max(safeMin, Math.max(Number(minDelay) || 3, Number(maxDelay) || 8));
            const safeBatchSize = Math.max(1, Number(batchSize) || 50);
            const safeBatchDelay = Math.max(0, Number(batchDelay) || 30);

            let sentCounter = 0;
            let failedCounter = 0;
            let instanceIndex = 0;

            const itemsInDb = await (prisma as any).broadcastItem.findMany({
                where: { campaignId: campaign.id },
                orderBy: { createdAt: 'asc' }
            });

            for (let i = 0; i < itemsInDb.length; i++) {
                const item = itemsInDb[i];
                const activeInstId = senderInstances[instanceIndex % senderInstances.length];
                instanceIndex++;

                let itemStatus = 'sent';
                let itemError: string | null = null;

                try {
                    if (messageType === 'interactive') {
                        const rawBody = resolveSpintax(body || '');
                        const rawHeaderText = headerType === 'text' ? resolveSpintax(headerText || '') : undefined;
                        const rawFooter = footer ? resolveSpintax(footer) : undefined;

                        const interactivePayload: InteractivePayload = {
                            headerType: headerType || 'none',
                            headerText: rawHeaderText,
                            headerImageUrl: headerType === 'image' ? headerImageUrl : undefined,
                            body: rawBody,
                            footer: rawFooter,
                            buttons: Array.isArray(buttons) ? buttons : []
                        };
                        await sendInteractiveMessage(activeInstId, item.number, interactivePayload);
                    } else {
                        let fileObj = undefined;
                        if (messageType === 'media' && mediaUrl) {
                            let mimetype = 'application/octet-stream';
                            const lowerUrl = mediaUrl.toLowerCase();
                            if (lowerUrl.endsWith('.png')) mimetype = 'image/png';
                            else if (lowerUrl.endsWith('.jpg') || lowerUrl.endsWith('.jpeg')) mimetype = 'image/jpeg';
                            else if (lowerUrl.endsWith('.mp4')) mimetype = 'video/mp4';
                            else if (lowerUrl.endsWith('.pdf')) mimetype = 'application/pdf';

                            fileObj = {
                                url: mediaUrl,
                                mimetype,
                                fileName: mediaUrl.split('/').pop() || 'attachment'
                            };
                        }
                        const rawText = resolveSpintax(messageText || '');
                        const safeMsg = applyInvisibleAntiHash(rawText);
                        await sendMessage(activeInstId, item.number, safeMsg, fileObj);
                    }
                    sentCounter++;
                } catch (err: any) {
                    console.error(`[Broadcast ${campaign.id}] Error sending to ${item.number}:`, err?.message || err);
                    itemStatus = 'failed';
                    itemError = err?.message || 'Dispatch failed';
                    failedCounter++;
                }

                // Update individual item status in database
                await (prisma as any).broadcastItem.update({
                    where: { id: item.id },
                    data: {
                        status: itemStatus,
                        error: itemError,
                        sentAt: itemStatus === 'sent' ? new Date() : null
                    }
                });

                // Update campaign counts periodically
                await (prisma as any).broadcastCampaign.update({
                    where: { id: campaign.id },
                    data: {
                        sentCount: sentCounter,
                        failedCount: failedCounter
                    }
                });

                // Anti-ban delay between messages
                if (i < itemsInDb.length - 1) {
                    if ((i + 1) % safeBatchSize === 0 && safeBatchDelay > 0) {
                        await delay(safeBatchDelay * 1000);
                    } else if (safeMax > 0) {
                        const randomInterval = Math.floor(Math.random() * (safeMax - safeMin + 1) + safeMin);
                        await delay(randomInterval * 1000);
                    }
                }
            }

            // Mark campaign as completed
            await (prisma as any).broadcastCampaign.update({
                where: { id: campaign.id },
                data: {
                    status: 'completed',
                    sentCount: sentCounter,
                    failedCount: failedCounter
                }
            });
            console.log(`[Broadcast ${campaign.id}] Finished dispatching ${itemsInDb.length} messages (${sentCounter} sent, ${failedCounter} failed).`);
        })().catch(err => {
            console.error(`[Broadcast ${campaign.id}] Fatal worker error:`, err);
        });

    } catch (e: any) {
        console.error('Error starting broadcast campaign:', e);
        res.status(500).json({ error: e.message || 'Failed to start broadcast campaign' });
    }
});

// Save/Create a Broadcast Campaign Batch with Results
router.post('/broadcast/campaigns/save-results', authenticate, async (req: any, res: any) => {
    try {
        const { 
            name, 
            instanceId, 
            poolName, 
            messageType, 
            messageText, 
            mediaUrl, 
            totalCount, 
            sentCount, 
            failedCount, 
            status, 
            items 
        } = req.body;

        const campaign = await (prisma as any).broadcastCampaign.create({
            data: {
                userId: req.user.userId,
                name: (name || 'Broadcast Campaign').trim(),
                instanceId: instanceId || null,
                poolName: poolName || null,
                messageType: messageType || 'text',
                messageText: messageText || '',
                mediaUrl: mediaUrl || null,
                totalCount: Number(totalCount) || (Array.isArray(items) ? items.length : 0),
                sentCount: Number(sentCount) || 0,
                failedCount: Number(failedCount) || 0,
                status: status || 'completed'
            }
        });

        if (Array.isArray(items) && items.length > 0) {
            const itemRecords = items.map((item: any) => ({
                campaignId: campaign.id,
                number: String(item.number || item.phone || item.to || '').trim(),
                status: item.status || 'sent',
                error: item.error || null,
                sentAt: item.status === 'sent' ? new Date() : null
            }));

            // Bulk create items in chunks of 500 for safety
            const chunkSize = 500;
            for (let i = 0; i < itemRecords.length; i += chunkSize) {
                const chunk = itemRecords.slice(i, i + chunkSize);
                await (prisma as any).broadcastItem.createMany({
                    data: chunk
                });
            }
        }

        res.json({
            success: true,
            message: 'Campaign batch saved successfully',
            campaign
        });
    } catch (e: any) {
        console.error('Error saving broadcast campaign:', e);
        res.status(500).json({ error: e.message || 'Failed to save broadcast campaign batch' });
    }
});

// List all broadcast campaign batches
router.get('/broadcast/campaigns', authenticate, async (req: any, res: any) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
        const search = (req.query.search || '').trim();
        const skip = (page - 1) * limit;

        const where: any = { userId: req.user.userId };
        if (search) {
            where.name = { contains: search };
        }

        const [campaigns, totalCount, aggregateStats] = await Promise.all([
            (prisma as any).broadcastCampaign.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            }),
            (prisma as any).broadcastCampaign.count({ where }),
            (prisma as any).broadcastCampaign.aggregate({
                where: { userId: req.user.userId },
                _sum: {
                    totalCount: true,
                    sentCount: true,
                    failedCount: true
                }
            })
        ]);

        res.json({
            campaigns,
            totalCount,
            totalRecipients: aggregateStats._sum.totalCount || 0,
            totalSent: aggregateStats._sum.sentCount || 0,
            totalFailed: aggregateStats._sum.failedCount || 0,
            page,
            limit,
            totalPages: Math.ceil(totalCount / limit) || 1
        });
    } catch (e: any) {
        console.error('Error fetching broadcast campaigns:', e);
        res.status(500).json({ error: 'Failed to fetch campaign batches' });
    }
});

// Get single campaign batch details with all related numbers
router.get('/broadcast/campaigns/:id', authenticate, async (req: any, res: any) => {
    try {
        const { id } = req.params;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
        const status = req.query.status || 'all'; // 'all', 'sent', 'failed'
        const search = (req.query.search || '').trim();
        const skip = (page - 1) * limit;

        const campaign = await (prisma as any).broadcastCampaign.findFirst({
            where: { id, userId: req.user.userId }
        });

        if (!campaign) {
            return res.status(404).json({ error: 'Campaign batch not found' });
        }

        const itemWhere: any = { campaignId: id };
        if (status === 'sent') itemWhere.status = 'sent';
        if (status === 'failed') itemWhere.status = 'failed';
        if (status === 'pending') itemWhere.status = 'pending';
        if (search) itemWhere.number = { contains: search };

        const [items, totalItems] = await Promise.all([
            (prisma as any).broadcastItem.findMany({
                where: itemWhere,
                orderBy: { createdAt: 'asc' },
                skip,
                take: limit
            }),
            (prisma as any).broadcastItem.count({ where: itemWhere })
        ]);

        res.json({
            campaign,
            items,
            totalItems,
            page,
            limit,
            totalPages: Math.ceil(totalItems / limit) || 1
        });
    } catch (e: any) {
        console.error('Error fetching campaign batch details:', e);
        res.status(500).json({ error: 'Failed to fetch campaign details' });
    }
});

// Export all numbers of a campaign batch
router.get('/broadcast/campaigns/:id/export', authenticate, async (req: any, res: any) => {
    try {
        const { id } = req.params;
        const status = req.query.status || 'all'; // 'all', 'sent', 'pending', 'failed'

        const campaign = await (prisma as any).broadcastCampaign.findFirst({
            where: { id, userId: req.user.userId }
        });

        if (!campaign) {
            return res.status(404).json({ error: 'Campaign batch not found' });
        }

        const itemWhere: any = { campaignId: id };
        if (status === 'sent') itemWhere.status = 'sent';
        if (status === 'failed') itemWhere.status = 'failed';
        if (status === 'pending') itemWhere.status = 'pending';

        const items = await (prisma as any).broadcastItem.findMany({
            where: itemWhere,
            orderBy: { createdAt: 'asc' }
        });

        res.json({ campaign, items });
    } catch (e: any) {
        res.status(500).json({ error: 'Failed to export campaign numbers' });
    }
});

// Delete a campaign batch
router.delete('/broadcast/campaigns/:id', authenticate, async (req: any, res: any) => {
    try {
        const { id } = req.params;
        const campaign = await (prisma as any).broadcastCampaign.findFirst({
            where: { id, userId: req.user.userId }
        });

        if (!campaign) {
            return res.status(404).json({ error: 'Campaign batch not found' });
        }

        await (prisma as any).broadcastItem.deleteMany({ where: { campaignId: id } });
        await (prisma as any).broadcastCampaign.delete({ where: { id } });
        res.json({ success: true, message: 'Campaign batch deleted successfully' });
    } catch (e: any) {
        res.status(500).json({ error: 'Failed to delete campaign batch' });
    }
});

export default router;

