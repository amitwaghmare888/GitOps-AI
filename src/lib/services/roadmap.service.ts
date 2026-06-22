import { roadmapRepository } from '@/lib/repositories/roadmap.repository';
import { analysisRepository } from '@/lib/repositories/analysis.repository';
import { issueRepository } from '@/lib/repositories/issue.repository';
import { issueAnalysisRepository } from '@/lib/repositories/issue-analysis.repository';
import { repositoryService } from '@/lib/services/repository.service';
import { callGemini, MODEL_NAME } from '@/lib/ai/gemini';
import { AIRoadmapResponseSchema } from '@/lib/ai/schemas/roadmap.schema';
import { buildRoadmapPrompt, ROADMAP_PROMPT_VERSION } from '@/lib/ai/prompts/roadmap.prompt';
import { computeRoadmapConfidence } from '@/lib/ai/roadmap-confidence';
import { AppError, AIAnalysisError, NotFoundError, toAppError } from '@/lib/errors';
import { createLogger } from '@/lib/logger';
import type { RepositoryRoadmap } from '@/types/roadmap';
import type { RoadmapIssueInput } from '@/types/roadmap';

const log = createLogger('RoadmapService');

/** Idempotency window in milliseconds (15 minutes). */
const IDEMPOTENCY_WINDOW_MS = 15 * 60 * 1000;

/** Maximum open issues to include in the roadmap prompt. */
const ISSUE_CAP = 15;

export const roadmapService = {
  /**
   * Generates a roadmap for a repository using Gemini 2.5 Flash.
   *
   * Flow:
   *  1. Validate ownership + idempotency check (parallel)
   *  2. Load repo analysis + open issues (parallel)
   *  3. Load issue analyses (depends on step 2 issue IDs)
   *  4. Precondition check: ≥1 open issue
   *  5. Local aggregation: story points, confidence, metrics
   *  6. Build prompt → call Gemini → validate (Zod)
   *  7. Save new roadmap row
   *  8. Return saved roadmap
   */
  async generateRoadmap(
    profileId: string,
    repositoryId: string,
  ): Promise<RepositoryRoadmap> {
    log.info('generateRoadmap start', { profileId, repositoryId });

    try {
      // ── Batch 1: ownership + idempotency (parallel) ─────────────────────
      const [repo, existingRoadmap] = await Promise.all([
        repositoryService.getRepository(profileId, repositoryId),
        roadmapRepository.getLatestRoadmap(repositoryId),
      ]);

      if (existingRoadmap) {
        const ageMs = Date.now() - new Date(existingRoadmap.created_at).getTime();
        if (ageMs < IDEMPOTENCY_WINDOW_MS) {
          log.info('generateRoadmap: reusing recent roadmap', {
            repositoryId,
            ageMinutes: Math.round(ageMs / 60000),
          });
          return existingRoadmap;
        }
      }

      // ── Batch 2: repo analysis + open issues (parallel) ─────────────────
      const [repoAnalysis, issueResult] = await Promise.all([
        analysisRepository.getLatestAnalysis(repositoryId),
        issueRepository.findByRepositoryId(repositoryId, {
          limit: ISSUE_CAP,
          state: 'open',
        }),
      ]);

      const openIssues = issueResult.data;

      // Precondition: must have open issues
      if (openIssues.length === 0) {
        throw new NotFoundError('No open issues to plan. Sync issues from GitHub first.');
      }

      // ── Batch 3: issue analyses (depends on batch 2 IDs) ────────────────
      const issueIds = openIssues.map((i) => i.id);
      const issueAnalyses = await issueAnalysisRepository.getLatestForIssues(issueIds);

      if (issueAnalyses.length === 0) {
        log.warn('generateRoadmap: no issue analyses found, generating from titles only', {
          repositoryId,
          openIssueCount: openIssues.length,
        });
      }

      // ── Local aggregation (O(n), synchronous) ───────────────────────────
      const analysisMap = new Map(issueAnalyses.map((a) => [a.issue_id, a]));

      const analyzedIssues: RoadmapIssueInput[] = [];
      const unanalyzedTitles: string[] = [];
      let totalStoryPoints = 0;

      for (const issue of openIssues) {
        const analysis = analysisMap.get(issue.id);
        if (analysis) {
          analyzedIssues.push({
            issue_id: issue.id,
            title: issue.title,
            priority: analysis.priority,
            complexity: analysis.complexity,
            story_points: analysis.story_points,
            category: analysis.category,
            is_blocked: analysis.blockers.length > 0,
          });
          totalStoryPoints += analysis.story_points;
        } else {
          unanalyzedTitles.push(issue.title);
        }
      }

      const confidence = computeRoadmapConfidence(
        openIssues.length,
        issueAnalyses.length,
        repoAnalysis,
      );

      // ── Build prompt and call Gemini ────────────────────────────────────
      const prompt = buildRoadmapPrompt({
        repository: {
          name: repo.name,
          language: repo.language,
          health_score: repoAnalysis?.health_score ?? 0,
          stage: repoAnalysis?.stage ?? 'unknown',
        },
        issues: analyzedIssues,
        unanalyzed_titles: unanalyzedTitles,
        total_story_points: totalStoryPoints,
      });

      const aiResponse = await callGemini(prompt, AIRoadmapResponseSchema);

      // ── Save new roadmap row ────────────────────────────────────────────
      const roadmap = await roadmapRepository.createRoadmap({
        repository_id: repositoryId,
        executive_summary: aiResponse.executive_summary,
        sprints: aiResponse.sprints,
        dependencies: aiResponse.dependencies,
        critical_risks: aiResponse.critical_risks,
        priority_order: aiResponse.priority_order,
        total_story_points: totalStoryPoints,
        confidence,
        issue_count: openIssues.length,
        analyzed_issue_count: issueAnalyses.length,
        model_name: MODEL_NAME,
        prompt_version: ROADMAP_PROMPT_VERSION,
      });

      log.info('generateRoadmap complete', {
        repositoryId,
        confidence,
        totalStoryPoints,
        sprintCount: aiResponse.sprints.length,
        roadmapId: roadmap.id,
      });

      return roadmap;
    } catch (err) {
      if (err instanceof AppError) throw err;
      const appErr = toAppError(err);
      log.error('generateRoadmap failed', { repositoryId, error: appErr.message });
      throw new AIAnalysisError(
        'Roadmap generation failed. Please try again later.',
        appErr,
      );
    }
  },

  /**
   * Returns the latest roadmap for a repository, or null if none exists.
   * Validates ownership first.
   */
  async getLatestRoadmap(
    profileId: string,
    repositoryId: string,
  ): Promise<RepositoryRoadmap | null> {
    log.debug('getLatestRoadmap', { profileId, repositoryId });

    // Validate ownership
    await repositoryService.getRepository(profileId, repositoryId);

    return roadmapRepository.getLatestRoadmap(repositoryId);
  },
};
