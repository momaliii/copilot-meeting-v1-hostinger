import { Router } from 'express';
import { google } from 'googleapis';
import crypto from 'crypto';
import db from '../db.ts';
import { authenticateToken } from '../middleware/auth.ts';

const router = Router();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const REDIRECT_URI = `${APP_URL}/api/google/auth/callback`;

const SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/calendar.events',
];

function isGoogleConfigured(): boolean {
  return !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);
}

function createOAuth2Client() {
  if (!isGoogleConfigured()) throw new Error('Google OAuth not configured');
  return new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, REDIRECT_URI);
}

async function getAuthenticatedClient(userId: string) {
  const user = await db.queryOne(
    'SELECT google_access_token, google_refresh_token, google_token_expires_at FROM users WHERE id = ?',
    [userId]
  );
  if (!user?.google_refresh_token) throw new Error('Google account not connected');

  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({
    access_token: user.google_access_token,
    refresh_token: user.google_refresh_token,
    expiry_date: user.google_token_expires_at ? new Date(user.google_token_expires_at).getTime() : undefined,
  });

  oauth2Client.on('tokens', async (tokens) => {
    const updates: string[] = [];
    const params: any[] = [];
    if (tokens.access_token) {
      updates.push('google_access_token = ?');
      params.push(tokens.access_token);
    }
    if (tokens.expiry_date) {
      updates.push('google_token_expires_at = ?');
      params.push(new Date(tokens.expiry_date).toISOString());
    }
    if (tokens.refresh_token) {
      updates.push('google_refresh_token = ?');
      params.push(tokens.refresh_token);
    }
    if (updates.length > 0) {
      params.push(userId);
      await db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
    }
  });

  return oauth2Client;
}

// Check if Google integration is available
router.get('/auth/available', (_req, res) => {
  res.json({ available: isGoogleConfigured() });
});

// Get OAuth consent URL
router.get('/auth/url', authenticateToken, (req: any, res) => {
  try {
    if (!isGoogleConfigured()) {
      return res.status(503).json({ error: 'Google OAuth not configured' });
    }
    const oauth2Client = createOAuth2Client();
    const state = Buffer.from(JSON.stringify({ userId: req.user.id })).toString('base64url');
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent',
      state,
    });
    res.json({ url });
  } catch (err: any) {
    console.error('[Google] Auth URL error:', err);
    res.status(500).json({ error: 'Failed to generate auth URL' });
  }
});

// OAuth callback
router.get('/auth/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code || !state) {
      return res.redirect(`${APP_URL}/dashboard?google_error=missing_params`);
    }

    let userId: string;
    try {
      const decoded = JSON.parse(Buffer.from(state as string, 'base64url').toString());
      userId = decoded.userId;
    } catch {
      return res.redirect(`${APP_URL}/dashboard?google_error=invalid_state`);
    }

    const oauth2Client = createOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code as string);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: profile } = await oauth2.userinfo.get();

    await db.run(
      `UPDATE users SET
        google_id = ?, google_access_token = ?, google_refresh_token = ?,
        google_token_expires_at = ?, google_email = ?
      WHERE id = ?`,
      [
        profile.id || null,
        tokens.access_token || null,
        tokens.refresh_token || null,
        tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
        profile.email || null,
        userId,
      ]
    );

    res.redirect(`${APP_URL}/dashboard?google_connected=true`);
  } catch (err: any) {
    console.error('[Google] Callback error:', err);
    res.redirect(`${APP_URL}/dashboard?google_error=callback_failed`);
  }
});

// Check connection status
router.get('/auth/status', authenticateToken, async (req: any, res) => {
  try {
    const user = await db.queryOne(
      'SELECT google_email, google_refresh_token FROM users WHERE id = ?',
      [req.user.id]
    );
    res.json({
      connected: !!(user?.google_refresh_token),
      email: user?.google_email || null,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to check status' });
  }
});

// Disconnect Google account
router.delete('/auth/disconnect', authenticateToken, async (req: any, res) => {
  try {
    await db.run(
      `UPDATE users SET google_id = NULL, google_access_token = NULL, google_refresh_token = NULL,
       google_token_expires_at = NULL, google_email = NULL WHERE id = ?`,
      [req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to disconnect' });
  }
});

// --- Calendar API ---

// Create a meeting with Google Meet link
router.post('/calendar/create-meeting', authenticateToken, async (req: any, res) => {
  try {
    const { title, description, startTime, endTime, attendees, timeZone } = req.body;
    if (!title || !startTime || !endTime) {
      return res.status(400).json({ error: 'Title, startTime, and endTime are required' });
    }

    const oauth2Client = await getAuthenticatedClient(req.user.id);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const attendeeList = Array.isArray(attendees)
      ? attendees.map((email: string) => ({ email: email.trim() })).filter((a: any) => a.email)
      : [];

    const event = await calendar.events.insert({
      calendarId: 'primary',
      conferenceDataVersion: 1,
      requestBody: {
        summary: title,
        description: description || '',
        start: { dateTime: startTime, timeZone: timeZone || 'UTC' },
        end: { dateTime: endTime, timeZone: timeZone || 'UTC' },
        attendees: attendeeList,
        guestsCanModify: false,
        guestsCanInviteOthers: true,
        conferenceData: {
          createRequest: {
            requestId: crypto.randomUUID(),
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
      },
    });

    const meetLink = event.data.conferenceData?.entryPoints?.find(
      (e) => e.entryPointType === 'video'
    )?.uri || null;

    const meetingId = `sm-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    await db.run(
      `INSERT INTO scheduled_meetings (id, user_id, title, description, start_time, end_time, meet_link, google_event_id, attendees)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        meetingId,
        req.user.id,
        title,
        description || '',
        startTime,
        endTime,
        meetLink,
        event.data.id || null,
        JSON.stringify(attendees || []),
      ]
    );

    res.json({
      id: meetingId,
      title,
      startTime,
      endTime,
      meetLink,
      googleEventId: event.data.id,
      attendees: attendees || [],
    });
  } catch (err: any) {
    console.error('[Google] Create meeting error:', err);
    if (err.message === 'Google account not connected') {
      return res.status(403).json({ error: 'Google account not connected. Please connect your Google account first.' });
    }
    res.status(500).json({ error: 'Failed to create meeting' });
  }
});

// List scheduled meetings
router.get('/calendar/meetings', authenticateToken, async (req: any, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM scheduled_meetings WHERE user_id = ? ORDER BY start_time DESC',
      [req.user.id]
    );
    const meetings = rows.map((r: any) => ({
      ...r,
      attendees: (() => { try { return JSON.parse(r.attendees || '[]'); } catch { return []; } })(),
    }));
    res.json({ meetings });
  } catch (err) {
    console.error('[Google] List meetings error:', err);
    res.status(500).json({ error: 'Failed to list meetings' });
  }
});

// Delete a scheduled meeting
router.delete('/calendar/meetings/:id', authenticateToken, async (req: any, res) => {
  try {
    const meeting = await db.queryOne(
      'SELECT * FROM scheduled_meetings WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });

    if (meeting.google_event_id) {
      try {
        const oauth2Client = await getAuthenticatedClient(req.user.id);
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
        await calendar.events.delete({
          calendarId: 'primary',
          eventId: meeting.google_event_id,
        });
      } catch (err: any) {
        console.warn('[Google] Failed to delete calendar event:', err.message);
      }
    }

    await db.run('DELETE FROM scheduled_meetings WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('[Google] Delete meeting error:', err);
    res.status(500).json({ error: 'Failed to delete meeting' });
  }
});

// Get upcoming meetings from Google Calendar
router.get('/calendar/upcoming', authenticateToken, async (req: any, res) => {
  try {
    const oauth2Client = await getAuthenticatedClient(req.user.id);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      maxResults: 20,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = (response.data.items || [])
      .filter((e) => e.conferenceData?.entryPoints?.some((ep) => ep.entryPointType === 'video'))
      .map((e) => ({
        id: e.id,
        title: e.summary || 'Untitled',
        description: e.description || '',
        startTime: e.start?.dateTime || e.start?.date,
        endTime: e.end?.dateTime || e.end?.date,
        meetLink: e.conferenceData?.entryPoints?.find((ep) => ep.entryPointType === 'video')?.uri,
        attendees: (e.attendees || []).map((a) => a.email).filter(Boolean),
      }));

    res.json({ events });
  } catch (err: any) {
    if (err.message === 'Google account not connected') {
      return res.status(403).json({ error: 'Google account not connected' });
    }
    console.error('[Google] Upcoming events error:', err);
    res.status(500).json({ error: 'Failed to fetch upcoming events' });
  }
});

export default router;
