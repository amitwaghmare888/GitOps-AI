import { classifyRepoStage } from '@/lib/ai/health-score';
import type { RepositoryMetrics } from '@/types/analysis';

export const PROMPT_VERSION = 'repository-analysis-v2';

/**
 * Builds a token-optimized, quality-focused prompt for Gemini repository analysis.
 *
 * Quality rules baked into the prompt:
 *  1. No abandonment assumption from lack of PRs alone
 *  2. Repo age considered before assigning risk
 *  3. Early-stage repos flagged as such
 *  4. Lifecycle stage explicitly classified
 *  5. Risks must cite specific metrics as evidence
 *  6. Recommendations tied to actual data
 *  7. No generic AI filler
 *  8. No overlap between findings, risks, and recommendations
 *  9. Concise engineering language
 */
export function buildRepositoryAnalysisPrompt(
  metrics: RepositoryMetrics,
  healthScore: number,
): string {
  const { repository, issues, pullRequests } = metrics;

  const stage = classifyRepoStage(repository.github_created_at, repository.pushed_at);

  const ageDays = repository.github_created_at
    ? Math.floor((Date.now() - new Date(repository.github_created_at).getTime()) / 86400000)
    : null;

  const lastPushDays = repository.pushed_at
    ? Math.floor((Date.now() - new Date(repository.pushed_at).getTime()) / 86400000)
    : null;

  const recentIssues = issues.recent
    .slice(0, 5)
    .map((i) => `  - "${i.title}" [${i.state}]`)
    .join('\n');

  const recentPRs = pullRequests.recent
    .slice(0, 5)
    .map((pr) => `  - "${pr.title}" [${pr.state}${pr.is_merged ? ', merged' : ''}]`)
    .join('\n');

  return `You are a senior engineering analyst. Analyze this repository using only the metrics provided. Write in concise engineering language. No filler. No generic advice.

REPOSITORY
  Name: ${repository.name}
  Language: ${repository.language ?? 'Not specified'}
  Visibility: ${repository.visibility}
  Age: ${ageDays !== null ? `${ageDays} days` : 'Unknown'}
  Last push: ${lastPushDays !== null ? `${lastPushDays} days ago` : 'Unknown'}
  Lifecycle stage: ${stage}
  Health score: ${healthScore}/100 (pre-computed, explain this score)

ISSUES
  Total: ${issues.total} | Open: ${issues.open} | Closed: ${issues.closed} | Stale (30d+): ${issues.stale}
${recentIssues ? `  Recent:\n${recentIssues}` : '  None synced.'}

PULL REQUESTS
  Total: ${pullRequests.total} | Open: ${pullRequests.open} | Merged: ${pullRequests.merged} | Closed: ${pullRequests.closed} | Stale (30d+): ${pullRequests.stale}
${recentPRs ? `  Recent:\n${recentPRs}` : '  None synced.'}

RULES — follow strictly:
1. The lifecycle stage is "${stage}". Factor this into every assessment.
2. Zero PRs does NOT indicate abandonment. Some repos use direct commits, squash merges, or have a single maintainer.
3. If the repo is "${stage === 'early' ? 'early-stage (<90 days old)' : stage}", calibrate severity accordingly. New repos with limited data should receive observations, not warnings.
4. Every risk MUST cite a specific metric as evidence (e.g., "4 of 5 issues stale" not "issues may become stale").
5. Every recommendation MUST reference the actual data (e.g., "close 3 stale issues from March" not "consider triaging issues").
6. Each point must appear in exactly ONE section. Do not repeat the same observation across findings, risks, and recommendations.
7. Do not use phrases like "it's important to", "consider implementing", "you might want to", "it appears that". Be direct.
8. If data is insufficient for a risk assessment, say so — do not fabricate risks.

OUTPUT — JSON only, this exact schema:
{
  "summary": "2-3 sentence executive summary. Reference the health score, lifecycle stage, and key metric that most influences the score.",
  "findings": [{"category": "string", "detail": "string citing specific numbers", "severity": "low|medium|high"}],
  "risks": [{"area": "string", "description": "string with evidence from metrics above", "impact": "low|medium|high"}],
  "recommendations": [{"title": "concise action title", "description": "specific action referencing actual data", "priority": "low|medium|high"}]
}

Limits: 3-5 findings, 1-4 risks (0 is acceptable if no evidence supports a risk), 2-5 recommendations.
Do not include the health score number in your output — it is already computed and displayed separately.`;
}
