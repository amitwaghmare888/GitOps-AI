import { issueAnalysisRepository } from '@/lib/repositories/issue-analysis.repository';
import { issueService } from '@/lib/services/issue.service';
import { repositoryService } from '@/lib/services/repository.service';
import { callGemini, MODEL_NAME } from '@/lib/ai/gemini';
import { AIIssueAnalysisResponseSchema } from '@/lib/ai/schemas/issue-analysis.schema';
import { buildIssueAnalysisPrompt, ISSUE_PROMPT_VERSION } from '@/lib/ai/prompts/issue-analysis.prompt';
import { computeIssueConfidence, computeStoryPoints } from '@/lib/ai/issue-confidence';
import { countStaleItems } from '@/lib/ai/health-score';
import { AppError, AIAnalysisError, toAppError } from '@/lib/errors';
import { createLogger } from '@/lib/logger';
import type { IssueAnalysis, IssueMetrics } from '@/types/issue-analysis';

const log = createLogger('IssueAnalysisService');

/** Idempotency window in milliseconds (15 minutes). */
const IDEMPOTENCY_WINDOW_MS = 15 * 60 * 1000;

export const issueAnalysisService = {
  /**
   * Analyzes a single issue using Gemini 2.5 Flash.
   *
   * Flow:
   *  1. Validate ownership via issueService.getIssue
   *  2. Idempotency check (skip Gemini if recent analysis exists)
   *  3. Load repository context for prompt
   *  4. Build metrics + prompt (token-optimized, minimal fields)
   *  5. Call Gemini via callGemini<T> with v2 schema
   *  6. Compute confidence + story_points locally
   *  7. Save new analysis row
   *  8. Return saved analysis
   */
  async analyzeIssue(
    profileId: string,
    issueId: string,
  ): Promise<IssueAnalysis> {
    log.info('analyzeIssue start', { profileId, issueId });

    try {
      // 1. Validate ownership — reuse issue object
      const issue = await issueService.getIssue(profileId, issueId);

      // 2. Idempotency check — reuse recent analysis if within 15 minutes
      const existingAnalysis = await issueAnalysisRepository.getLatestAnalysis(issueId);
      if (existingAnalysis) {
        const ageMs = Date.now() - new Date(existingAnalysis.created_at).getTime();
        if (ageMs < IDEMPOTENCY_WINDOW_MS) {
          log.info('analyzeIssue: reusing recent analysis', {
            issueId,
            ageMinutes: Math.round(ageMs / 60000),
          });
          return existingAnalysis;
        }
      }

      // 3. Load repository context (single query, reuse repo object)
      const repo = await repositoryService.getRepository(profileId, issue.repository_id);

      // 4. Build metrics — only fields the prompt actually uses
      const ageDays = Math.floor(
        (Date.now() - new Date(issue.github_created_at).getTime()) / (24 * 60 * 60 * 1000),
      );

      const labelNames: string[] = (issue.labels as { name?: string }[])
        .map((l) => l.name)
        .filter((n): n is string => typeof n === 'string');

      const metrics: IssueMetrics = {
        issue: {
          title: issue.title,
          body: issue.body,
          state: issue.state,
          labels: labelNames,
          comments_count: issue.comments_count,
          age_days: ageDays,
        },
        repository: {
          language: repo.language,
        },
      };

      // 5. Build prompt and call Gemini (single call)
      const prompt = buildIssueAnalysisPrompt(metrics);
      const aiResponse = await callGemini(prompt, AIIssueAnalysisResponseSchema);

      // 6. Compute confidence + story_points locally (O(1), not AI-generated)
      const bodyLength = issue.body?.length ?? 0;
      const confidence = computeIssueConfidence(
        bodyLength,
        labelNames.length,
        issue.comments_count,
        aiResponse.evidence,
      );
      const storyPoints = computeStoryPoints(aiResponse.complexity);

      // 7. Save new analysis row
      const analysis = await issueAnalysisRepository.createAnalysis({
        issue_id: issueId,
        repository_id: issue.repository_id,
        category: aiResponse.category,
        priority: aiResponse.priority,
        complexity: aiResponse.complexity,
        risk: aiResponse.risk,
        effort_estimate: aiResponse.effort_estimate,
        story_points: storyPoints,
        root_cause: aiResponse.root_cause,
        suggested_fix: aiResponse.suggested_fix,
        implementation_steps: aiResponse.implementation_steps,
        acceptance_criteria: aiResponse.acceptance_criteria,
        affected_areas: aiResponse.affected_areas,
        blockers: aiResponse.blockers,
        confidence,
        evidence: aiResponse.evidence,
        summary: aiResponse.summary,
        labels_used: labelNames,
        model_name: MODEL_NAME,
        prompt_version: ISSUE_PROMPT_VERSION,
      });

      log.info('analyzeIssue complete', {
        issueId,
        category: analysis.category,
        priority: analysis.priority,
        storyPoints,
        confidence,
        analysisId: analysis.id,
      });

      return analysis;
    } catch (err) {
      if (err instanceof AppError) throw err;
      const appErr = toAppError(err);
      log.error('analyzeIssue failed', { issueId, error: appErr.message });
      throw new AIAnalysisError(
        'Issue analysis failed. Please try again later.',
        appErr,
      );
    }
  },

  /**
   * Returns the latest analysis for an issue, or null if none exists.
   * Validates ownership first.
   */
  async getLatestAnalysis(
    profileId: string,
    issueId: string,
  ): Promise<IssueAnalysis | null> {
    log.debug('getLatestAnalysis', { profileId, issueId });

    // Validate ownership
    await issueService.getIssue(profileId, issueId);

    return issueAnalysisRepository.getLatestAnalysis(issueId);
  },

  /**
   * Returns analysis history for an issue.
   * Validates ownership first.
   */
  async getAnalysisHistory(
    profileId: string,
    issueId: string,
    limit?: number,
  ): Promise<IssueAnalysis[]> {
    log.debug('getAnalysisHistory', { profileId, issueId });

    // Validate ownership
    await issueService.getIssue(profileId, issueId);

    return issueAnalysisRepository.getAnalysisHistory(issueId, limit);
  },
};
