import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import apiRoutes, { backfillDailyStats } from './routes/api.routes';
import { initWhatsAppService, qrs } from './services/whatsapp.service';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' }
});

io.on('connection', (socket) => {
  socket.on('get-qr', (instanceId) => {
    const qr = qrs.get(instanceId);
    if (qr) socket.emit(`qr-${instanceId}`, qr);
  });
});

export const prisma = new PrismaClient();
export const socketIo = io;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sanitize URLs to fix double-slashes (e.g. from PHP portals)
app.use((req, res, next) => {
    req.url = req.url.replace(/\/{2,}/g, '/');
    next();
});

// Global Request Logger to help debug PHP portal
app.use((req, res, next) => {
    console.log(`[GLOBAL LOG] ${req.method} ${req.originalUrl} - Body:`, req.body);
    next();
});

// Load routes
app.use('/api', apiRoutes);

const PORT = process.env.PORT || 5000;

// Catch-all 404 handler to ensure JSON response
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler to ensure JSON response
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});
httpServer.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  // Backfill historical daily stats into dedicated table
  await backfillDailyStats();
  // Initialize existing WhatsApp instances from DB
  await initWhatsAppService();
});
