import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import { AIAnalysisError } from '@/lib/errors';
import { createLogger } from '@/lib/logger';
import type { AIAnalysisResponse } from '@/types/analysis';

const log = createLogger('Gemini');

const MODEL_NAME = 'gemini-2.5-flash';

export { MODEL_NAME };

// ─── Zod schema for repository analysis (Phase 8) ───────────────────────────

const FindingSchema = z.object({
  category: z.string().min(1),
  detail: z.string().min(1),
  severity: z.enum(['low', 'medium', 'high']),
});

const RiskSchema = z.object({
  area: z.string().min(1),
  description: z.string().min(1),
  impact: z.enum(['low', 'medium', 'high']),
});

const RecommendationSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  priority: z.enum(['low', 'medium', 'high']),
});

const AIAnalysisResponseSchema = z.object({
  summary: z.string().min(1),
  findings: z.array(FindingSchema).min(1).max(10),
  risks: z.array(RiskSchema).max(10),
  recommendations: z.array(RecommendationSchema).min(1).max(10),
});

// ─── Gemini client ──────────────────────────────────────────────────────────

function getGeminiClient(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new AIAnalysisError('GEMINI_API_KEY environment variable is not configured.');
  }
  return new GoogleGenerativeAI(apiKey);
}

/**
 * Generic Gemini caller. Sends a prompt, parses JSON, validates against
 * the provided Zod schema. All analysis types (repository, issue, etc.)
 * share this single code path for HTTP, error handling, and validation.
 */
export async function callGemini<T>(prompt: string, schema: z.ZodType<T>): Promise<T> {
  log.info('callGemini: calling Gemini', { model: MODEL_NAME });

  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.3,
    },
  });

  let rawText: string;

  try {
    const result = await model.generateContent(prompt);
    rawText = result.response.text();
    // DEBUG-TEMP: remove after diagnosis
    console.error('[DEBUG] callGemini raw response:', rawText.slice(0, 2000));

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    if (message.includes('429') || message.toLowerCase().includes('rate limit')) {
      log.error('Gemini rate limited', { error: message });
      throw new AIAnalysisError(
        'AI analysis rate limited. Please wait a moment and try again.',
        err,
      );
    }

    if (message.includes('timeout') || message.includes('DEADLINE_EXCEEDED')) {
      log.error('Gemini timeout', { error: message });
      throw new AIAnalysisError(
        'AI analysis timed out. Please try again.',
        err,
      );
    }

    log.error('Gemini API call failed', { error: message });
    throw new AIAnalysisError(
      'AI analysis failed. Please try again later.',
      err,
    );
  }

  // ── Parse and validate JSON ───────────────────────────────────────────────

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
    // DEBUG-TEMP: remove after diagnosis
    console.error('[DEBUG] callGemini parsed JSON:', JSON.stringify(parsed, null, 2));
  } catch {
    log.error('Gemini returned invalid JSON', { rawText: rawText.slice(0, 500) });
    throw new AIAnalysisError('AI returned malformed response. Please try again.');
  }

  const validated = schema.safeParse(parsed);
  if (!validated.success) {
    const zodError = validated.error as z.ZodError;
    // DEBUG-TEMP: remove after diagnosis
    console.error('[DEBUG] Zod fieldErrors:', JSON.stringify(zodError.flatten().fieldErrors, null, 2));
    console.error('[DEBUG] Zod formErrors:', JSON.stringify(zodError.flatten().formErrors, null, 2));
    console.error('[DEBUG] Zod full issues:', JSON.stringify(zodError.issues, null, 2));
    log.error('Gemini response failed schema validation', {
      errors: zodError.flatten().fieldErrors,
    });
    throw new AIAnalysisError('AI response did not match expected format. Please try again.');
  }

  log.info('callGemini: response validated');

  return validated.data;
}

/**
 * Calls Gemini 2.5 Flash for repository analysis.
 * Thin wrapper around callGemini with the repository-specific schema.
 */
export async function analyzeRepository(prompt: string): Promise<AIAnalysisResponse> {
  log.info('analyzeRepository: delegating to callGemini', { model: MODEL_NAME });
  return callGemini(prompt, AIAnalysisResponseSchema);
}
