import 'dotenv/config';
import http from 'http';
import { readFileSync } from 'fs';
import { join } from 'path';
import express from 'express';
import { Server as SocketServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { createServer as createViteServer } from 'vite';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { initDb, startPlanExpirationScheduler } from './server/db.ts';
import db from './server/db.ts';
import authRoutes from './server/routes/auth.ts';
import adminRoutes from './server/routes/admin.ts';
import meetingsRoutes from './server/routes/meetings.ts';
import userRoutes from './server/routes/user.ts';
import sessionsRoutes from './server/routes/sessions.ts';
import analyzeRoutes from './server/routes/analyze.ts';
import translateRoutes from './server/routes/translate.ts';
import { isTranscribeAvailable, createTranscribeWebSocketServer } from './server/routes/transcribe.ts';
import googleRoutes from './server/routes/google.ts';
import emailRoutes from './server/routes/email.ts';
import { JWT_SECRET, authenticateToken } from './server/middleware/auth.ts';
import { securityGuard, loadBlockedIPs, startSecurityCleanup } from './server/middleware/security.ts';
import { planAiRateLimiter } from './server/middleware/planRateLimit.ts';

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);
  const server = http.createServer(app);

  const isDev = process.env.NODE_ENV !== 'production';

  app.use(helmet({
    contentSecurityPolicy: isDev ? false : {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'", 'wss:', 'https://generativelanguage.googleapis.com', 'https://www.googleapis.com', 'https://accounts.google.com'],
        mediaSrc: ["'self'", 'blob:'],
        workerSrc: ["'self'", 'blob:'],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      if (isDev) {
        const isLocal =
          origin?.startsWith('http://127.0.0.1') ||
          origin?.startsWith('http://192.168.') ||
          origin?.startsWith('http://10.') ||
          origin?.match(/^http:\/\/localhost(:\d+)?$/);
        if (isLocal) {
          callback(null, true);
          return;
        }
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
  app.use(['/api/admin', '/api/user', '/api/meetings', '/api/sessions'], (req, res, next) => {
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();
    return mutationLimiter(req, res, next);
  });

  // Plan-tier AI rate limiting (applied after auth in route handlers via planAiRateLimiter)
  // Fallback static limiter for unauthenticated requests
  const aiLimiterFallback = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 15,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many AI requests, please try again later.' },
  });
  app.use(['/api/analyze', '/api/translate'], (req: any, res: any, next: any) => {
    if (req.headers.authorization) {
      return planAiRateLimiter(req, res, next);
    }
    return aiLimiterFallback(req, res, next);
  });

  const contactLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many contact submissions, please try again later.' },
  });

  const verify2faLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many verification attempts, please try again later.' },
  });

  app.use(express.json({ limit: '1mb' }));
  app.use('/uploads/avatars', express.static('uploads/avatars'));
  app.use('/uploads/branding', express.static('uploads/branding'));
  app.use('/uploads/support', authenticateToken, express.static('uploads/support'));

  const largePayloadJson = express.json({ limit: '20mb' });

  // Initialize database (Postgres or SQLite)
  try {
    await initDb();
    console.log('[server] Database initialized successfully');
  } catch (err) {
    console.error('[server] FATAL: Database initialization failed:', err);
    process.exit(1);
  }

  // Load blocked IPs from DB and activate security guard
  await loadBlockedIPs();
  app.use('/api', securityGuard);
  startSecurityCleanup();
  startPlanExpirationScheduler();

  // API Routes
  app.use('/api/auth/verify-2fa', verify2faLimiter);
  app.use('/api/auth/confirm-email', verify2faLimiter);
  app.use('/api/auth', authRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/meetings', largePayloadJson, meetingsRoutes);
  app.use('/api/sessions', largePayloadJson, sessionsRoutes);
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
  app.use('/api/google', googleRoutes);
  app.use('/api/email', emailRoutes);

  app.get('/api/health', async (_req, res) => {
    try {
      await db.queryOne('SELECT 1 as ok');
      res.json({ status: 'ok', db: 'connected' });
    } catch {
      res.status(500).json({ status: 'error', db: 'disconnected' });
    }
  });

  app.get('/api/transcribe/available', (_req, res) => {
    res.json({ available: isTranscribeAvailable() });
  });

  app.get('/api/public/plans', async (req, res) => {
    try {
      const plans = (await db.query("SELECT * FROM plans WHERE id != 'admin' ORDER BY price ASC")).rows;
      res.json(plans);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch plans' });
    }
  });

  app.get('/api/public/plans/features', async (req, res) => {
    try {
      const plans = (await db.query("SELECT * FROM plans WHERE id != 'admin' ORDER BY price ASC")).rows;
      const featurePlans = plans.map((p: any) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        features: {
          minutesLimit: p.minutes_limit,
          languageChanges: p.language_changes_limit != null ? Number(p.language_changes_limit) : -1,
          videoCaption: !!(p.video_caption === true || p.video_caption === 1),
          cloudSave: !!(p.cloud_save === true || p.cloud_save === 1),
          proAnalysis: !!(p.pro_analysis_enabled === true || p.pro_analysis_enabled === 1),
          analysisModel: p.analysis_model || 'gemini-2.5-flash',
          transcriptModel: p.transcript_model || 'gemini-2.5-flash',
          softLimitPercent: p.soft_limit_percent ?? 100,
          hardLimitPercent: p.hard_limit_percent ?? 100,
        },
      }));
      const featureLabels: Record<string, string> = {
        minutesLimit: 'Monthly Minutes',
        languageChanges: 'Translation Changes',
        videoCaption: 'Video Captioning',
        cloudSave: 'Cloud Save',
        proAnalysis: 'Pro Analysis',
        analysisModel: 'Analysis Model',
        transcriptModel: 'Transcript Model',
        softLimitPercent: 'Soft Limit (%)',
        hardLimitPercent: 'Hard Limit (%)',
      };
      res.json({ plans: featurePlans, featureLabels });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch plan features' });
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

  app.get('/api/public/branding', async (_req, res) => {
    try {
      const { rows } = await db.query('SELECT key, value FROM site_settings');
      const settings: Record<string, string | null> = {
        site_name: 'Meeting Copilot',
        site_description: 'Record, transcribe, and analyze meetings with AI',
        theme_color: '#4f46e5',
        logo_url: null,
        favicon_url: null,
      };
      for (const row of rows) settings[row.key] = row.value;
      res.set('Cache-Control', 'public, max-age=60');
      res.json(settings);
    } catch {
      res.json({
        site_name: 'Meeting Copilot',
        site_description: 'Record, transcribe, and analyze meetings with AI',
        theme_color: '#4f46e5',
        logo_url: null,
        favicon_url: null,
      });
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

  app.post('/api/public/contact', contactLimiter, async (req, res) => {
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
      const share = await db.queryOne('SELECT meeting_id, expires_at FROM meeting_shares WHERE token = ?', [req.params.token]);
      if (!share) return res.status(404).json({ error: 'Share link not found or expired' });
      if (share.expires_at && new Date(share.expires_at) < new Date()) {
        return res.status(410).json({ error: 'Share link has expired' });
      }
      const meeting = await db.queryOne('SELECT * FROM meetings WHERE id = ?', [share.meeting_id]);
      if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
      let analysis = null;
      try { analysis = meeting.analysis_json ? JSON.parse(meeting.analysis_json) : null; } catch (_) {}
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

  // Catch-all for unmatched API routes (must be before SPA fallback)
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
  });

  // Central error handler so API always returns JSON (avoids HTML error pages)
  app.use((err: any, _req: express.Request, res: express.Response, _next: () => void) => {
    if (!res.headersSent) {
      console.error('[server] Error:', err);
      res.status(500).json({ error: 'Server error. Please try again.' });
    }
  });

  // Vite middleware for development, static files + SPA fallback for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));

    const PAGE_META: Record<string, { title: string; description: string }> = {
      '/': { title: 'Meeting Copilot — AI Meeting Notes, Transcripts & Action Items', description: 'Record, transcribe, and analyze meetings with AI. Get summaries, action items, and follow-up emails. Start free.' },
      '/landing': { title: 'Meeting Copilot — AI Meeting Notes, Transcripts & Action Items', description: 'Turn every meeting into clear next steps. AI-powered transcription, summaries, and action items. Start free.' },
      '/pricing': { title: 'Pricing — Meeting Copilot', description: 'Free and Pro plans for AI meeting transcription. Start free, upgrade for cloud save and advanced analysis.' },
      '/about': { title: 'About — Meeting Copilot', description: 'Learn about Meeting Copilot, the AI-powered meeting assistant for transcription, summaries, and action items.' },
      '/contact': { title: 'Contact — Meeting Copilot', description: 'Get in touch with the Meeting Copilot team for questions, feedback, or support.' },
      '/privacy': { title: 'Privacy Policy — Meeting Copilot', description: 'How Meeting Copilot handles your data and privacy. Audio is never uploaded without your explicit consent.' },
      '/terms': { title: 'Terms of Service — Meeting Copilot', description: 'Terms and conditions for using Meeting Copilot, the AI meeting assistant.' },
      '/schedule': { title: 'Schedule Meeting — Meeting Copilot', description: 'Create and schedule Google Meet meetings and manage your calendar.' },
    };

    let indexHtml = '';
    try { indexHtml = readFileSync(join('dist', 'index.html'), 'utf-8'); } catch (_) {}

    app.get('*', (req, res) => {
      const meta = PAGE_META[req.path] || PAGE_META['/'];
      if (indexHtml && meta) {
        const html = indexHtml
          .replace(/<title>[^<]*<\/title>/, `<title>${meta.title}</title>`)
          .replace(/<meta name="description" content="[^"]*"/, `<meta name="description" content="${meta.description}"`)
          .replace(/<meta property="og:title" content="[^"]*"/, `<meta property="og:title" content="${meta.title}"`)
          .replace(/<meta property="og:description" content="[^"]*"/, `<meta property="og:description" content="${meta.description}"`)
          .replace(/<meta name="twitter:title" content="[^"]*"/, `<meta name="twitter:title" content="${meta.title}"`)
          .replace(/<meta name="twitter:description" content="[^"]*"/, `<meta name="twitter:description" content="${meta.description}"`);
        res.setHeader('Content-Type', 'text/html');
        res.send(html);
      } else {
        res.sendFile('index.html', { root: 'dist' });
      }
    });
  }

  createTranscribeWebSocketServer(server);

  const io = new SocketServer(server, {
    cors: { origin: allowedOrigins, credentials: true },
  });
  app.set('io', io);

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role?: string };
      (socket as any).userId = decoded.id;
      (socket as any).userRole = decoded.role;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const s = socket as any;
    socket.on('join_conversation', async (data: { conversationId: string; type?: 'user' | 'admin' }) => {
      if (data?.conversationId) {
        if (s.userRole !== 'admin') {
          const conv = await db.queryOne(
            'SELECT user_id FROM support_conversations WHERE id = ?',
            [data.conversationId]
          );
          if (conv && conv.user_id !== s.userId) return;
        }
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
        if (!socket.rooms.has(room)) return;
        socket.to(room).emit('typing_start', { userId: s.userId, type: s.participantType || 'user' });
      }
    });
    socket.on('typing_stop', (data: { conversationId: string }) => {
      if (data?.conversationId) {
        const room = `conversation:${data.conversationId}`;
        if (!socket.rooms.has(room)) return;
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

startServer().catch((err) => {
  console.error('[server] FATAL: Failed to start server:', err);
  process.exit(1);
});
