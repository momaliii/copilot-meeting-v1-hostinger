import { Router } from 'express';
import db from '../db.ts';
import { authenticateToken } from '../middleware/auth.ts';
import { z } from 'zod';
import crypto from 'crypto';

const router = Router();

const EventType = { IncrementalSnapshot: 3 };
const IncrementalSource = { MouseInteraction: 2, Scroll: 3 };
const MouseInteractions = { Click: 2 };

function extractHeatmapPoints(events: any[]): { x: number; y: number; type: 'click' | 'scroll' }[] {
  const points: { x: number; y: number; type: 'click' | 'scroll' }[] = [];
  for (const ev of events) {
    if (ev.type !== EventType.IncrementalSnapshot || !ev.data) continue;
    const d = ev.data;
    if (d.source === IncrementalSource.MouseInteraction && d.type === MouseInteractions.Click && typeof d.x === 'number' && typeof d.y === 'number') {
      points.push({ x: Math.round(d.x), y: Math.round(d.y), type: 'click' });
    } else if (d.source === IncrementalSource.Scroll && typeof d.x === 'number' && typeof d.y === 'number') {
      points.push({ x: Math.round(d.x), y: Math.round(d.y), type: 'scroll' });
    }
  }
  return points;
}

// POST /api/sessions/events - receive batched rrweb events (authenticated)
router.post('/events', authenticateToken, async (req: any, res) => {
  try {
    const user = req.user;
    const row = await db.queryOne('SELECT session_replay_consent FROM users WHERE id = ?', [user.id]);
    if (!row || !row.session_replay_consent) {
      return res.status(403).json({ error: 'Session replay consent required' });
    }

    const schema = z.object({
      sessionId: z.string().min(1),
      events: z.array(z.any()),
      pageUrl: z.string().optional(),
      startedAt: z.string().optional(),
    });
    const { sessionId, events, pageUrl, startedAt } = schema.parse(req.body);

    if (events.length === 0) return res.json({ ok: true });

    const existing = await db.queryOne('SELECT id, user_id FROM sessions WHERE id = ?', [sessionId]);
    if (existing) {
      if (existing.user_id !== user.id) {
        return res.status(403).json({ error: 'Not authorized to write to this session' });
      }
    } else {
      const now = new Date().toISOString();
      await db.run(
        'INSERT INTO sessions (id, user_id, started_at, page_url) VALUES (?, ?, ?, ?)',
        [sessionId, user.id, startedAt || now, pageUrl || null]
      );
    }

    const eventsId = `evt-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
    const eventsJson = JSON.stringify(events);
    await db.run(
      'INSERT INTO session_events (id, session_id, events_json) VALUES (?, ?, ?)',
      [eventsId, sessionId, eventsJson]
    );

    // Aggregate heatmap data
    const points = extractHeatmapPoints(events);
    let pagePath = '/';
    try {
      if (pageUrl) {
        const u = new URL(pageUrl);
        pagePath = u.pathname || '/';
      }
    } catch (_) {}
    const today = new Date().toISOString().slice(0, 10);
    for (const p of points) {
      const existingH = await db.queryOne('SELECT id FROM heatmap_data WHERE page_path = ? AND x = ? AND y = ? AND type = ? AND date = ?', [pagePath, p.x, p.y, p.type, today]);
      if (existingH) {
        await db.run('UPDATE heatmap_data SET count = count + 1 WHERE id = ?', [existingH.id]);
      } else {
        const heatId = `hm-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
        await db.run('INSERT INTO heatmap_data (id, page_path, x, y, type, count, date) VALUES (?, ?, ?, ?, ?, 1, ?)', [heatId, pagePath, p.x, p.y, p.type, today]);
      }
    }

    res.json({ ok: true });
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.issues[0].message });
    console.error(err);
    res.status(500).json({ error: 'Failed to save session events' });
  }
});

// POST /api/sessions/end - end a session (update ended_at, duration)
router.post('/end', authenticateToken, async (req: any, res) => {
  try {
    const user = req.user;
    const schema = z.object({
      sessionId: z.string().min(1),
      durationSeconds: z.number().int().min(0).optional(),
    });
    const { sessionId, durationSeconds } = schema.parse(req.body);

    const existing = await db.queryOne('SELECT id, user_id FROM sessions WHERE id = ?', [sessionId]);
    if (!existing || existing.user_id !== user.id) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const now = new Date().toISOString();
    if (durationSeconds !== undefined) {
      await db.run(
        'UPDATE sessions SET ended_at = ?, duration_seconds = ? WHERE id = ?',
        [now, durationSeconds, sessionId]
      );
    } else {
      await db.run('UPDATE sessions SET ended_at = ? WHERE id = ?', [now, sessionId]);
    }

    res.json({ ok: true });
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.issues[0].message });
    console.error(err);
    res.status(500).json({ error: 'Failed to end session' });
  }
});

export default router;
