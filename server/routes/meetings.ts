import { Router } from 'express';
import { existsSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';
import db from '../db.ts';
import { authenticateToken } from '../middleware/auth.ts';
import { getUserEffectivePlan } from '../utils/planLimits.ts';
import { z } from 'zod';
import crypto from 'crypto';
import multer from 'multer';

const recordingsDir = join(process.cwd(), 'uploads/recordings');
if (!existsSync(recordingsDir)) mkdirSync(recordingsDir, { recursive: true });

const SAFE_ID_RE = /^[a-zA-Z0-9_-]+$/;

const mediaUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, recordingsDir),
    filename: (req, _file, cb) => {
      const id = req.params.id;
      if (!SAFE_ID_RE.test(id)) return cb(new Error('Invalid meeting ID'), '');
      cb(null, `${id}.webm`);
    },
  }),
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = file.mimetype.startsWith('audio/') || file.mimetype.startsWith('video/');
    if (ok) cb(null, true);
    else cb(new Error('Only audio or video files allowed'));
  },
});

const router = Router();

async function assertProAndCloudSave(userId: string): Promise<void> {
  const effective = await getUserEffectivePlan(userId);
  if (!effective) throw new Error('User not found');
  const row = await db.queryOne('SELECT cloud_save_enabled FROM users WHERE id = ?', [userId]);
  if (!effective.hasCloudSave || !row?.cloud_save_enabled) {
    throw new Error('Cloud save requires a plan with cloud save and "Save to cloud" enabled');
  }
}

router.get('/list', authenticateToken, async (req: any, res) => {
  try {
    await assertProAndCloudSave(req.user.id);
    const { rows } = await db.query(
      'SELECT id, title, date, duration, transcript, analysis_json, media_path FROM meetings WHERE user_id = ? ORDER BY date DESC',
      [req.user.id]
    );
    const meetings = rows.map((row: any) => {
      let analysis = null;
      try { analysis = row.analysis_json ? JSON.parse(row.analysis_json) : null; } catch (_) {}
      return {
        id: row.id,
        title: row.title,
        date: row.date,
        duration: row.duration,
        transcript: row.transcript,
        analysis,
        media_path: row.media_path || null,
      };
    });
    res.json(meetings);
  } catch (err: any) {
    if (err.message?.includes('Cloud save requires')) {
      return res.status(403).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch meetings' });
  }
});

router.post('/save', authenticateToken, async (req: any, res) => {
  try {
    await assertProAndCloudSave(req.user.id);
    const schema = z.object({
      id: z.string().min(1).max(100),
      title: z.string().min(1).max(255),
      date: z.string(),
      durationSeconds: z.number().int().min(0),
      transcript: z.string().optional(),
      analysis: z.record(z.string(), z.any()).optional(),
    });
    const { id, title, date, durationSeconds, transcript, analysis } = schema.parse(req.body);
    const analysisJson = analysis ? JSON.stringify(analysis) : null;
    const now = new Date().toISOString();

    await db.run(
      `INSERT INTO meetings (id, user_id, title, date, duration, transcript, analysis_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         title = excluded.title,
         date = excluded.date,
         duration = excluded.duration,
         transcript = excluded.transcript,
         analysis_json = excluded.analysis_json,
         updated_at = excluded.updated_at`,
      [id, req.user.id, title, date, durationSeconds, transcript || null, analysisJson, now, now]
    );

    res.json({ success: true, id });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.issues[0].message });
    }
    if (err.message?.includes('Cloud save requires')) {
      return res.status(403).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to save meeting' });
  }
});

router.post('/:id/upload-media', authenticateToken, async (req: any, res, next) => {
  mediaUpload.single('media')(req, res, async (err: any) => {
    if (err) {
      if (err.message?.includes('Only audio or video')) return res.status(400).json({ error: err.message });
      return res.status(500).json({ error: 'Upload failed' });
    }
    try {
      await assertProAndCloudSave(req.user.id);
      const meetingId = req.params.id;
      const meeting = await db.queryOne('SELECT id FROM meetings WHERE id = ? AND user_id = ?', [meetingId, req.user.id]);
      if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
      const file = req.file;
      if (!file) return res.status(400).json({ error: 'No media file provided' });
      const mediaPath = `recordings/${meetingId}.webm`;
      await db.run('UPDATE meetings SET media_path = ?, updated_at = ? WHERE id = ? AND user_id = ?', [mediaPath, new Date().toISOString(), meetingId, req.user.id]);
      res.json({ success: true, media_path: mediaPath });
    } catch (err: any) {
      if (err.message?.includes('Cloud save requires')) return res.status(403).json({ error: err.message });
      console.error(err);
      res.status(500).json({ error: 'Failed to upload media' });
    }
  });
});

router.get('/:id/media', authenticateToken, async (req: any, res) => {
  try {
    const meeting = await db.queryOne('SELECT media_path FROM meetings WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
    const mediaPath = meeting.media_path;
    if (!mediaPath) return res.status(404).json({ error: 'No media for this meeting' });
    const fullPath = resolve(join(process.cwd(), 'uploads', mediaPath));
    if (!existsSync(fullPath)) return res.status(404).json({ error: 'Media file not found' });
    res.setHeader('Content-Type', 'video/webm');
    res.sendFile(fullPath);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch media' });
  }
});

router.get('/:id', authenticateToken, async (req: any, res) => {
  try {
    const meeting = await db.queryOne('SELECT * FROM meetings WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
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
    res.status(500).json({ error: 'Failed to fetch meeting' });
  }
});

router.post('/:id/share', authenticateToken, async (req: any, res) => {
  try {
    await assertProAndCloudSave(req.user.id);
    const meetingId = req.params.id;
    const meeting = await db.queryOne('SELECT id FROM meetings WHERE id = ? AND user_id = ?', [meetingId, req.user.id]);
    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });

    const token = crypto.randomBytes(24).toString('hex');
    await db.run('INSERT INTO meeting_shares (token, meeting_id) VALUES (?, ?)', [token, meetingId]);

    const baseUrl = process.env.APP_URL || 'http://localhost:3000';
    const shareUrl = `${baseUrl}/share/${token}`;
    res.json({ success: true, token, shareUrl });
  } catch (err: any) {
    if (err.message?.includes('Cloud save requires')) {
      return res.status(403).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to create share link' });
  }
});

export default router;
