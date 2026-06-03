import { analysisRepository } from '@/lib/repositories/analysis.repository';
import { issueRepository } from '@/lib/repositories/issue.repository';
import { pullRequestRepository } from '@/lib/repositories/pull-request.repository';
import { repositoryService } from '@/lib/services/repository.service';
import { analyzeRepository as callGemini, MODEL_NAME } from '@/lib/ai/gemini';
import { computeHealthScore, computeConfidence, classifyRepoStage, countStaleItems } from '@/lib/ai/health-score';
import { buildRepositoryAnalysisPrompt, PROMPT_VERSION } from '@/lib/ai/prompts/repository-analysis.prompt';
import { AppError, AIAnalysisError, toAppError } from '@/lib/errors';
import { createLogger } from '@/lib/logger';
import type { RepositoryAnalysis, RepositoryMetrics } from '@/types/analysis';

const log = createLogger('RepositoryAnalysisService');

/** Idempotency window in milliseconds (15 minutes). */
const IDEMPOTENCY_WINDOW_MS = 15 * 60 * 1000;

export const repositoryAnalysisService = {
  /**
   * Analyzes a repository using Gemini 2.5 Flash.
   *
   * Flow:
   *  1. Validate ownership (single lookup, reused throughout)
   *  2. Idempotency check (skip Gemini if recent analysis exists)
   *  3. Load issues + PRs in parallel
   *  4. Compute metrics + health score locally
   *  5. Build prompt → call Gemini → validate response (Zod)
   *  6. Save new analysis row
   *  7. Return saved analysis
   */
  async analyzeRepository(
    profileId: string,
    repositoryId: string,
  ): Promise<RepositoryAnalysis> {
    log.info('analyzeRepository start', { profileId, repositoryId });

    try {
      // 1. Validate ownership — single lookup, reuse `repo` object
      const repo = await repositoryService.getRepository(profileId, repositoryId);

      // 2. Idempotency check — reuse recent analysis if within 15 minutes
      const existingAnalysis = await analysisRepository.getLatestAnalysis(repositoryId);
      if (existingAnalysis) {
        const ageMs = Date.now() - new Date(existingAnalysis.created_at).getTime();
        if (ageMs < IDEMPOTENCY_WINDOW_MS) {
          log.info('analyzeRepository: reusing recent analysis', {
            repositoryId,
            ageMinutes: Math.round(ageMs / 60000),
          });
          return existingAnalysis;
        }
      }

      // 3. Load issues + PRs in parallel — no duplicate queries
      const [issueResult, issueCount, prResult, prCount] = await Promise.all([
        issueRepository.findByRepositoryId(repositoryId, { limit: 5 }),
        issueRepository.countByRepositoryId(repositoryId),
        pullRequestRepository.findByRepositoryId(repositoryId, { limit: 5 }),
        pullRequestRepository.countByRepositoryId(repositoryId),
      ]);

      // 4. Compute stale counts from loaded data (in-memory)
      const staleIssues = countStaleItems(issueResult.data);
      const stalePRs = countStaleItems(prResult.data);

      // Count open/closed issues from total + loaded data
      const openIssues = issueResult.data.filter((i) => i.state === 'open').length;
      // For accurate counts when total > loaded, use count query proportions
      const openIssueEstimate = issueCount > 0
        ? Math.round((openIssues / Math.max(issueResult.data.length, 1)) * issueCount)
        : 0;
      const closedIssueEstimate = issueCount - openIssueEstimate;

      // PR state counts
      const openPRs = prResult.data.filter((pr) => pr.state === 'open').length;
      const mergedPRs = prResult.data.filter((pr) => pr.is_merged).length;
      const openPREstimate = prCount > 0
        ? Math.round((openPRs / Math.max(prResult.data.length, 1)) * prCount)
        : 0;
      const mergedPREstimate = prCount > 0
        ? Math.round((mergedPRs / Math.max(prResult.data.length, 1)) * prCount)
        : 0;
      const closedPREstimate = prCount - openPREstimate - mergedPREstimate;

      // 5. Build metrics object
      const metrics: RepositoryMetrics = {
        repository: {
          name: repo.name,
          language: repo.language,
          visibility: repo.visibility,
          github_created_at: repo.github_created_at,
          pushed_at: repo.pushed_at,
        },
        issues: {
          total: issueCount,
          open: openIssueEstimate,
          closed: closedIssueEstimate,
          stale: staleIssues,
          recent: issueResult.data.slice(0, 5).map((i) => ({
            title: i.title,
            state: i.state,
            created_at: i.github_created_at,
          })),
        },
        pullRequests: {
          total: prCount,
          open: openPREstimate,
          merged: mergedPREstimate,
          closed: Math.max(0, closedPREstimate),
          stale: stalePRs,
          recent: prResult.data.slice(0, 5).map((pr) => ({
            title: pr.title,
            state: pr.state,
            is_merged: pr.is_merged,
            created_at: pr.github_created_at,
          })),
        },
      };

      // 6. Compute health score, confidence and stage locally
      const stage = classifyRepoStage(repo.github_created_at, repo.pushed_at);
      const healthScore = computeHealthScore(metrics, repo.pushed_at);
      const confidence = computeConfidence(metrics);

      // 7. Build prompt and call Gemini
      const prompt = buildRepositoryAnalysisPrompt(metrics, healthScore);
      const aiResponse = await callGemini(prompt);

      // 8. Save new analysis row (never overwrites previous)
      const analysis = await analysisRepository.createAnalysis({
        repository_id: repositoryId,
        health_score: healthScore,
        confidence,
        stage,
        summary: aiResponse.summary,
        findings: aiResponse.findings,
        risks: aiResponse.risks,
        recommendations: aiResponse.recommendations,
        model_name: MODEL_NAME,
        prompt_version: PROMPT_VERSION,
      });

      log.info('analyzeRepository complete', {
        repositoryId,
        healthScore,
        analysisId: analysis.id,
      });

      return analysis;
    } catch (err) {
      if (err instanceof AppError) throw err;
      const appErr = toAppError(err);
      log.error('analyzeRepository failed', { repositoryId, error: appErr.message });
      throw new AIAnalysisError(
        'Repository analysis failed. Please try again later.',
        appErr,
      );
    }
  },

  /**
   * Returns the latest analysis for a repository, or null if none exists.
   * Validates ownership first.
   */
  async getLatestAnalysis(
    profileId: string,
    repositoryId: string,
  ): Promise<RepositoryAnalysis | null> {
    log.debug('getLatestAnalysis', { profileId, repositoryId });

    // Validate ownership
    await repositoryService.getRepository(profileId, repositoryId);

    return analysisRepository.getLatestAnalysis(repositoryId);
  },
};
