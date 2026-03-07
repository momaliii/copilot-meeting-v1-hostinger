import { Router } from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import { authenticateToken } from '../middleware/auth.ts';
import db from '../db.ts';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 200 * 1024 * 1024 } });

router.use(authenticateToken);

// Gemini supports up to 100MB inline; use inline to avoid Files API 500 errors
const INLINE_LIMIT = 95 * 1024 * 1024;

const baseSchemaProperties = {
  summary: { type: Type.STRING, description: 'A concise summary of the meeting in the original language' },
  summaryConfidence: { type: Type.NUMBER, description: 'Confidence score for the summary (0-100)' },
  actionItems: {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        task: { type: Type.STRING },
        assignee: { type: Type.STRING },
        confidence: { type: Type.NUMBER, description: 'Confidence score (0-100)' }
      },
      required: ['task']
    }
  },
  keyDecisions: {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        decision: { type: Type.STRING },
        confidence: { type: Type.NUMBER, description: 'Confidence score (0-100)' }
      },
      required: ['decision']
    }
  },
  sentiment: { type: Type.STRING, description: 'Overall sentiment of the meeting' },
  sentimentTrend: {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        timeSegment: { type: Type.STRING, description: 'e.g., "Beginning", "Middle", "End" or specific timestamps' },
        sentiment: { type: Type.STRING },
        score: { type: Type.NUMBER, description: 'Sentiment score from -100 (very negative) to 100 (very positive)' }
      },
      required: ['timeSegment', 'sentiment', 'score']
    }
  },
  followUpEmail: { type: Type.STRING, description: 'A draft follow-up email in the original language' },
  topics: {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        description: { type: Type.STRING },
        confidence: { type: Type.NUMBER, description: 'Confidence score (0-100)' }
      }
    }
  },
  risks: {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        risk: { type: Type.STRING },
        confidence: { type: Type.NUMBER, description: 'Confidence score (0-100)' }
      },
      required: ['risk']
    }
  },
  questions: {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        question: { type: Type.STRING },
        confidence: { type: Type.NUMBER, description: 'Confidence score (0-100)' }
      },
      required: ['question']
    }
  }
};

async function prepareAudioPart(ai: GoogleGenAI, buffer: Buffer, mimeType: string) {
  if (buffer.length <= INLINE_LIMIT) {
    return { inlineData: { data: buffer.toString('base64'), mimeType } };
  }

  // Convert Buffer to a BlobPart backed by ArrayBuffer to satisfy TS Blob typing.
  const bytes = new Uint8Array(buffer.length);
  bytes.set(buffer);
  const blob = new Blob([bytes.buffer], { type: mimeType });
  const displayName = `audio-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const isRetryableError = (e: any) => {
    const msg = String(e?.message || '');
    return msg.includes('convert server response to JSON') || e?.status === 500 || msg.includes('500');
  };
  let uploadedFile;
  let lastErr: any;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      uploadedFile = await ai.files.upload({
        file: blob,
        config: { mimeType, displayName },
      });
      lastErr = null;
      break;
    } catch (err: any) {
      lastErr = err;
      if (isRetryableError(err) && attempt < 3) {
        await new Promise((r) => setTimeout(r, 5000 * attempt));
        continue;
      }
      if (isRetryableError(err)) {
        throw new Error('Gemini file upload failed after retries. Try again in a few minutes, or use a shorter recording (under ~20 min).');
      }
      throw err;
    }
  }
  if (!uploadedFile) throw lastErr || new Error('File upload failed.');

  let fileState = uploadedFile;
  while (fileState.state === 'PROCESSING') {
    await new Promise(resolve => setTimeout(resolve, 3000));
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        fileState = await ai.files.get({ name: fileState.name! });
        break;
      } catch (err: any) {
        const msg = String(err?.message || '');
        if ((msg.includes('convert server response to JSON') || err?.status === 500) && attempt < 3) {
          await new Promise((r) => setTimeout(r, 3000));
          continue;
        }
        if (msg.includes('convert server response to JSON') || err?.status === 500) {
          throw new Error('Gemini file processing failed. Try again in a few minutes.');
        }
        throw err;
      }
    }
  }
  if (fileState.state === 'FAILED') {
    throw new Error('Audio file processing failed.');
  }
  return { fileData: { fileUri: fileState.uri!, mimeType: fileState.mimeType! } };
}

function parseRetryDelaySeconds(message: string): number | null {
  const match = String(message || '').match(/retry in (\d+(?:\.\d+)?)s/i);
  return match ? Math.ceil(parseFloat(match[1])) : null;
}

function is429OrQuotaExhausted(err: any): boolean {
  const msg = String(err?.message || '').toLowerCase();
  const code = err?.cause?.code ?? err?.status ?? err?.code;
  return (
    code === 429 ||
    err?.status === 'RESOURCE_EXHAUSTED' ||
    msg.includes('429') ||
    msg.includes('quota') ||
    msg.includes('resource_exhausted') ||
    msg.includes('rate limit')
  );
}

async function generateWithModelFallback(
  ai: GoogleGenAI,
  models: string[],
  request: any
) {
  let lastError: any;
  for (const model of models) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        return await ai.models.generateContent({
          ...request,
          model,
        });
      } catch (err: any) {
        lastError = err;
        const causeCode = err?.cause?.code || '';
        const msg = String(err?.message || '');
        const isTimeout =
          msg.toLowerCase().includes('fetch failed') ||
          String(causeCode).includes('TIMEOUT');
        const is429 = is429OrQuotaExhausted(err);
        const retryDelay = is429 ? parseRetryDelaySeconds(msg) : null;
        const shouldRetry =
          (isTimeout && attempt < 3) ||
          (is429 && attempt < 3 && retryDelay !== null);
        const delayMs = shouldRetry
          ? (retryDelay ? retryDelay * 1000 : 20000)
          : 0;
        console.warn(
          `Model ${model} attempt ${attempt} failed${shouldRetry ? `, retrying in ${delayMs / 1000}s...` : ''}`,
          err?.message || err
        );
        if (shouldRetry && delayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }
        if (is429 && attempt < 3) {
          await new Promise((resolve) => setTimeout(resolve, 20000));
          continue;
        }
        break;
      }
    }
  }
  throw lastError || new Error('All model attempts failed');
}

router.post('/', upload.single('audio'), async (req: any, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No audio file provided' });

    const userRow = await db.queryOne('SELECT plan_id, role FROM users WHERE id = ?', [req.user.id]);
    const plan = userRow?.plan_id
      ? await db.queryOne('SELECT video_caption, pro_analysis_enabled, analysis_model, transcript_model FROM plans WHERE id = ?', [userRow.plan_id])
      : null;
    const hasVideoAccess = userRow?.role === 'admin' || !!(plan?.video_caption === true || plan?.video_caption === 1);
    const isPro = userRow?.role === 'admin' || !!(plan?.pro_analysis_enabled === true || plan?.pro_analysis_enabled === 1);
    const analysisModel = plan?.analysis_model || 'gemini-2.5-flash';
    const transcriptModel = plan?.transcript_model || 'gemini-2.5-flash';

    const isVideo = req.file.mimetype?.startsWith('video/') ?? false;
    if (isVideo && !hasVideoAccess) {
      return res.status(403).json({ error: 'Video caption is only available on plans with video support. Upgrade to analyze video.' });
    }

    const language = req.body.language || 'Original Language';
    const extraRules = req.body.extraRules || '';
    const mimeType = req.file.mimetype || 'audio/webm';

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Gemini API key not configured on server' });

    const ai = new GoogleGenAI({ apiKey });
    const audioPart = await prepareAudioPart(ai, req.file.buffer, mimeType);

    if (isPro) {
      const transcriptPrompt = `Listen to this meeting audio and provide a highly accurate and detailed transcript. Identify different speakers (e.g., Speaker A, Speaker B) based on voice characteristics. The transcript MUST be in the following language: ${language}. If the language is "Original Language", use the EXACT SAME LANGUAGE that is spoken in the audio. Do not translate to English unless requested.`;

      const transcriptResponse = await generateWithModelFallback(
        ai,
        [transcriptModel, 'gemini-2.5-flash'],
        { contents: [audioPart, { text: transcriptPrompt }] }
      );

      const rawTranscript = transcriptResponse.text;
      if (!rawTranscript || rawTranscript.trim() === '') {
        return res.status(422).json({ error: 'Could not generate a transcript from the audio. Please ensure the audio contains clear speech.' });
      }

      const analysisPrompt = `Analyze the following meeting transcript. 
CRITICAL INSTRUCTIONS:
1. ALL analysis (summary, action items, decisions, email, topics, risks, questions, sentiment) MUST be in the following language: ${language}. If the language is "Original Language", use the EXACT SAME LANGUAGE as the transcript.
2. Provide a concise executive summary and a confidence score (0-100) for it.
3. Extract clear action items and assignees, with a confidence score (0-100) for each.
4. List key decisions made, with a confidence score (0-100) for each.
5. Determine the overall sentiment.
6. Detect the sentiment trend over time within the meeting (e.g., Beginning, Middle, End) with a score from -100 to 100.
7. Draft a follow-up email in the same language.
8. Extract key topics discussed with a brief description and confidence score (0-100).
9. Identify any potential risks or blockers mentioned, with a confidence score (0-100).
10. List any important unanswered or key questions raised during the meeting, with a confidence score (0-100).${extraRules}

TRANSCRIPT:
${rawTranscript}`;

      const analysisResponse = await generateWithModelFallback(
        ai,
        [analysisModel, 'gemini-2.5-flash'],
        {
          contents: [{ text: analysisPrompt }],
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: baseSchemaProperties,
              required: ['summary', 'actionItems', 'keyDecisions', 'sentiment', 'followUpEmail']
            }
          }
        }
      );

      const resultText = analysisResponse.text;
      if (resultText) {
        const parsed = JSON.parse(resultText);
        return res.json({ transcript: rawTranscript, ...parsed });
      }
      return res.status(500).json({ error: 'Empty analysis response from AI' });

    } else {
      const prompt = `Analyze this meeting audio. 
CRITICAL INSTRUCTIONS:
1. The transcript and ALL analysis (summary, action items, decisions, email, topics, risks, questions, sentiment) MUST be in the following language: ${language}. If the language is "Original Language", use the EXACT SAME LANGUAGE that is spoken in the audio. Do not translate to English unless requested.
2. Provide a highly accurate and detailed transcript.
3. Identify different speakers in the transcript (e.g., Speaker A, Speaker B) based on voice characteristics.
4. Provide a concise executive summary and a confidence score (0-100) for it.
5. Extract clear action items and assignees, with a confidence score (0-100) for each.
6. List key decisions made, with a confidence score (0-100) for each.
7. Determine the overall sentiment.
8. Detect the sentiment trend over time within the meeting (e.g., Beginning, Middle, End) with a score from -100 to 100.
9. Draft a follow-up email in the same language.
10. Extract key topics discussed with a brief description and confidence score (0-100).
11. Identify any potential risks or blockers mentioned, with a confidence score (0-100).
12. List any important unanswered or key questions raised during the meeting, with a confidence score (0-100).${extraRules}

If the audio is empty or contains no speech, state that clearly.`;

      const response = await generateWithModelFallback(
        ai,
        [analysisModel, 'gemini-2.5-flash'],
        {
          contents: [audioPart, { text: prompt }],
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                transcript: { type: Type.STRING, description: 'A highly accurate transcript with speakers identified (e.g., Speaker A: ...)' },
                ...baseSchemaProperties
              },
              required: ['transcript', 'summary', 'actionItems', 'keyDecisions', 'sentiment', 'followUpEmail']
            }
          }
        }
      );

      const resultText = response.text;
      if (resultText) {
        return res.json(JSON.parse(resultText));
      }
      return res.status(500).json({ error: 'Empty analysis response from AI' });
    }
  } catch (err: any) {
    console.error('Analysis error:', err);
    const message = String(err?.message || 'Unknown error');
    const causeCode = String(err?.cause?.code || '');
    if (message.toLowerCase().includes('fetch failed') || causeCode.includes('TIMEOUT')) {
      return res.status(502).json({
        error: 'Analysis failed: AI service timed out. Please retry in a moment (or try shorter audio).',
      });
    }
    if (is429OrQuotaExhausted(err)) {
      return res.status(429).json({
        error: 'Analysis failed: API quota exceeded. Please try again in a few minutes.',
      });
    }
    if (
      err?.status === 500 ||
      err?.status === 'INTERNAL' ||
      message.includes('convert server response to JSON') ||
      message.includes('INTERNAL')
    ) {
      return res.status(502).json({
        error: 'Analysis failed: Gemini API is temporarily unavailable. Please try again in a few minutes, or use a shorter recording.',
      });
    }
    res.status(500).json({ error: 'Analysis failed: ' + message });
  }
});

export default router;
