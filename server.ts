import 'dotenv/config';
import http from 'http';
import express from 'express';
import { Server as SocketServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { createServer as createViteServer } from 'vite';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { initDb } from './server/db.ts';
import db from './server/db.ts';
import authRoutes from './server/routes/auth.ts';
import adminRoutes from './server/routes/admin.ts';
import meetingsRoutes from './server/routes/meetings.ts';
import userRoutes from './server/routes/user.ts';
import sessionsRoutes from './server/routes/sessions.ts';
import analyzeRoutes from './server/routes/analyze.ts';
import translateRoutes from './server/routes/translate.ts';
import { isTranscribeAvailable, createTranscribeWebSocketServer } from './server/routes/transcribe.ts';
import { JWT_SECRET } from './server/middleware/auth.ts';

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);
  const server = http.createServer(app);

  const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const isDev = process.env.NODE_ENV !== 'production';
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      if (isDev && (origin?.startsWith('http://127.0.0.1:') || origin?.startsWith('http://192.168.') || origin?.startsWith('http://10.') || origin?.match(/^http:\/\/localhost(:\d+)?$/))) {
        callback(null, true);
        return;
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  }));

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 600,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
  });
  app.use('/api', apiLimiter);

  const mutationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many write operations, please try again later.' },
  });
  app.use(['/api/admin', '/api/user'], (req, res, next) => {
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();
    return mutationLimiter(req, res, next);
  });

  app.use(express.json({ limit: '50mb' }));
  app.use('/uploads', express.static('uploads'));

  // Initialize database (Postgres or SQLite)
  await initDb();

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/meetings', meetingsRoutes);
  app.use('/api/sessions', sessionsRoutes);
  app.use('/api/user', userRoutes);
  app.use('/api/analyze', (req, res, next) => {
    req.setTimeout(900000); // 15 minutes for large audio analysis
    res.setTimeout(900000);
    next();
  }, analyzeRoutes);
  app.use('/api/translate', (req, res, next) => {
    req.setTimeout(120000); // 2 minutes for translation
    res.setTimeout(120000);
    next();
  }, translateRoutes);

  app.get('/api/transcribe/available', (_req, res) => {
    res.json({ available: isTranscribeAvailable() });
  });

  app.get('/api/public/plans', async (req, res) => {
    try {
      const plans = (await db.query('SELECT * FROM plans ORDER BY price ASC')).rows;
      res.json(plans);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch plans' });
    }
  });

  app.get('/api/public/announcement', async (req, res) => {
    try {
      const context = (req.query.context as string) || 'public';
      const rows = (await db.query(
        'SELECT id, message, priority, starts_at, ends_at, show_on FROM announcements WHERE active = 1 ORDER BY created_at DESC'
      )).rows;
      const now = new Date().toISOString();
      const filtered = rows.filter((r: any) => {
        if (r.starts_at && r.starts_at > now) return false;
        if (r.ends_at && r.ends_at < now) return false;
        const showOn = (r.show_on || 'public,user_app,admin_app').toString().split(',').map((s: string) => s.trim());
        if (showOn.length > 0 && !showOn.includes(context)) return false;
        return true;
      }).map((r: any) => ({ id: r.id, message: r.message, priority: r.priority || 'info' }));
      res.json({ items: filtered });
    } catch (err) {
      res.status(500).json({ items: [] });
    }
  });

  app.post('/api/public/validate-promo', async (req, res) => {
    try {
      const { code, planId } = req.body || {};
      if (!code || typeof code !== 'string' || !planId) {
        return res.status(400).json({ valid: false, error: 'Code and planId required' });
      }
      let userId: string | null = null;
      const authHeader = req.headers.authorization;
      if (authHeader) {
        try {
          const token = authHeader.split(' ')[1];
          const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
          userId = decoded?.id ?? null;
        } catch (_) {}
      }
      const codeNorm = code.trim().toUpperCase();
      const row = await db.queryOne(
        'SELECT id, type, discount_percent, plan_id, plan_months, valid_from, valid_until, max_uses, max_uses_per_user, uses_count, active FROM promo_codes WHERE UPPER(TRIM(code)) = ? AND active = 1',
        [codeNorm]
      );
      if (!row) return res.json({ valid: false, error: 'Invalid or expired promo code' });
      const now = new Date().toISOString();
      if (row.valid_from && row.valid_from > now) return res.json({ valid: false, error: 'Promo not yet active' });
      if (row.valid_until && row.valid_until < now) return res.json({ valid: false, error: 'Promo expired' });
      if (row.max_uses != null && (row.uses_count || 0) >= row.max_uses) return res.json({ valid: false, error: 'Promo limit reached' });
      if (row.max_uses_per_user != null && userId) {
        const userUsesRow = await db.queryOne(
          'SELECT COUNT(*) as count FROM promo_code_uses WHERE promo_code_id = ? AND user_id = ?',
          [row.id, userId]
        );
        const userUses = Math.max(0, parseInt(String(userUsesRow?.count ?? 0), 10));
        if (userUses >= row.max_uses_per_user) return res.json({ valid: false, error: 'You have already used this promo code the maximum number of times' });
      }
      if (row.type === 'plan_time' && row.plan_id !== planId) return res.json({ valid: false, error: 'Promo not valid for this plan' });
      return res.json({
        valid: true,
        discountPercent: row.type === 'discount' ? (row.discount_percent || 0) : undefined,
        planId: row.type === 'plan_time' ? row.plan_id : undefined,
        planMonths: row.type === 'plan_time' ? (row.plan_months || 1) : undefined,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ valid: false, error: 'Failed to validate promo' });
    }
  });

  app.post('/api/public/contact', async (req, res) => {
    try {
      const raw = req.body || {};
      const name = typeof raw.name === 'string' ? raw.name.trim() : '';
      const email = typeof raw.email === 'string' ? raw.email.trim() : '';
      const subject = typeof raw.subject === 'string' ? raw.subject.trim() : '';
      const message = typeof raw.message === 'string' ? raw.message.trim() : '';
      if (!name || !email || !subject || !message) {
        return res.status(400).json({ error: 'Name, email, subject, and message are required' });
      }
      const id = `contact-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      await db.run(
        'INSERT INTO contact_submissions (id, name, email, subject, message) VALUES (?, ?, ?, ?, ?)',
        [id, name.slice(0, 255), email.slice(0, 255), subject.slice(0, 255), message.slice(0, 5000)]
      );
      console.log('[Contact] Saved submission:', id, email);
      res.status(201).json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to submit message' });
    }
  });

  app.get('/api/public/redirect', async (req, res) => {
    try {
      const path = (req.query.path as string) || '/';
      const normalized = path === '' ? '/' : path.startsWith('/') ? path : `/${path}`;
      const row = await db.queryOne(
        'SELECT to_path FROM redirect_rules WHERE from_path = ? AND active = 1',
        [normalized]
      );
      res.json({ to: row?.to_path ?? null });
    } catch (err) {
      res.status(500).json({ to: null });
    }
  });

  // Token-based public share (Pro users generate share links)
  app.get('/api/public/share/:token', async (req, res) => {
    try {
      const share = await db.queryOne('SELECT meeting_id FROM meeting_shares WHERE token = ?', [req.params.token]);
      if (!share) return res.status(404).json({ error: 'Share link not found or expired' });
      const meeting = await db.queryOne('SELECT * FROM meetings WHERE id = ?', [share.meeting_id]);
      if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
      const analysis = meeting.analysis_json ? JSON.parse(meeting.analysis_json) : null;
      res.json({
        id: meeting.id,
        title: meeting.title,
        date: meeting.date,
        duration: meeting.duration,
        transcript: meeting.transcript,
        analysis,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch shared meeting' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    
    // SPA fallback — skip /api/* so unmatched API calls get a proper 404
    app.get(/^(?!\/api\/).*/, (req, res) => {
      res.sendFile('index.html', { root: 'dist' });
    });
  }

  // Catch-all for unmatched API routes
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
  });

  createTranscribeWebSocketServer(server);

  const io = new SocketServer(server, {
    cors: { origin: allowedOrigins, credentials: true },
  });
  app.set('io', io);

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
      (socket as any).userId = decoded.id;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const s = socket as any;
    socket.on('join_conversation', (data: { conversationId: string; type?: 'user' | 'admin' }) => {
      if (data?.conversationId) {
        const room = `conversation:${data.conversationId}`;
        socket.join(room);
        s.conversationRoom = room;
        s.participantType = data.type || 'user';
        socket.to(room).emit('presence', { userId: s.userId, type: s.participantType, online: true });
      }
    });
    socket.on('typing_start', (data: { conversationId: string }) => {
      if (data?.conversationId) {
        const room = `conversation:${data.conversationId}`;
        socket.to(room).emit('typing_start', { userId: s.userId, type: s.participantType || 'user' });
      }
    });
    socket.on('typing_stop', (data: { conversationId: string }) => {
      if (data?.conversationId) {
        const room = `conversation:${data.conversationId}`;
        socket.to(room).emit('typing_stop', { userId: s.userId, type: s.participantType || 'user' });
      }
    });
    socket.on('disconnecting', () => {
      const rooms = Array.from(socket.rooms).filter((r) => r.startsWith('conversation:'));
      rooms.forEach((room) => {
        socket.to(room).emit('presence', { userId: s.userId, type: s.participantType || 'user', online: false });
      });
    });
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
