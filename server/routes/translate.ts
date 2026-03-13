import { Router } from 'express';
import { GoogleGenAI } from '@google/genai';
import { authenticateToken } from '../middleware/auth.ts';
import db from '../db.ts';
import { getUserEffectivePlan } from '../utils/planLimits.ts';

const router = Router();
router.use(authenticateToken);

function toSerializable(obj: any): any {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch {
    return null;
  }
}

router.post('/', async (req: any, res) => {
  try {
    const { analysis, targetLanguage, meetingId } = req.body;
    if (!analysis || typeof analysis !== 'object') {
      return res.status(400).json({ error: 'Analysis object required' });
    }
    if (!targetLanguage || typeof targetLanguage !== 'string' || targetLanguage.trim() === '') {
      return res.status(400).json({ error: 'Target language required' });
    }
    if (targetLanguage === 'Original Language') {
      return res.status(400).json({ error: 'Use original analysis for Original Language' });
    }

    const effective = await getUserEffectivePlan(req.user.id);
    const limit = effective ? effective.languageChangesLimit : -1;
    if (limit !== -1 && meetingId) {
      const usageRow = await db.queryOne(
        'SELECT COUNT(*) as count FROM meeting_usage WHERE user_id = ? AND meeting_id = ?',
        [req.user.id, meetingId]
      );
      const serverCount = Number(usageRow?.count ?? 0);
      if (serverCount >= limit) {
        return res.status(403).json({ error: 'Language change limit reached for this meeting. Upgrade to Pro for unlimited.' });
      }
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Gemini API key not configured' });

    const cleanAnalysis = toSerializable(analysis);
    if (!cleanAnalysis) return res.status(400).json({ error: 'Analysis could not be serialized' });

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Translate all user-facing text in this meeting analysis JSON to ${targetLanguage}.
Preserve the JSON structure exactly. Keep all numeric values (confidence, score, etc.) unchanged.
Return ONLY valid JSON, no markdown, no code blocks, no other text.

JSON to translate:
${JSON.stringify(cleanAnalysis)}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ text: prompt }],
      config: { responseMimeType: 'application/json' },
    });

    const text = response.text?.trim();
    if (!text) {
      const blockReason = (response as any).promptFeedback?.blockReason || 'Empty or blocked response';
      return res.status(500).json({ error: `Translation failed: ${blockReason}` });
    }

    let translated: any;
    try {
      translated = JSON.parse(text);
    } catch (parseErr: any) {
      return res.status(500).json({ error: 'Invalid JSON in translation response' });
    }
    res.json(translated);
  } catch (err: any) {
    const msg = err?.message || String(err);
    console.error('Translation error:', err);
    res.status(500).json({ error: msg });
  }
});

export default router;
