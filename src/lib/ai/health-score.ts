import type { RepositoryMetrics } from '@/types/analysis';

const STALE_THRESHOLD_DAYS = 30;
const INACTIVE_THRESHOLD_DAYS = 90;
const EARLY_STAGE_THRESHOLD_DAYS = 90;

/** Lifecycle stage of a repository. */
export type RepoStage = 'early' | 'active' | 'inactive' | 'abandoned';

/**
 * Classifies repository lifecycle stage from creation date and push date.
 * Called once per analysis — result passed to health score, prompt, and service.
 */
export function classifyRepoStage(
  githubCreatedAt: string | null,
  pushedAt: string | null,
): RepoStage {
  const ageDays = githubCreatedAt ? daysSince(githubCreatedAt) : null;
  const daysSinceLastPush = pushedAt ? daysSince(pushedAt) : null;

  if (ageDays !== null && ageDays < EARLY_STAGE_THRESHOLD_DAYS) return 'early';

  // Defensive fallback: creation date missing but push is very recent → treat as early.
  // A repo with no recorded creation date but pushed within 14 days is almost certainly new.
  if (ageDays === null && daysSinceLastPush !== null && daysSinceLastPush < 14) return 'early';

  if (daysSinceLastPush !== null && daysSinceLastPush < INACTIVE_THRESHOLD_DAYS) return 'active';
  if (daysSinceLastPush === null || daysSinceLastPush > 365) return 'abandoned';
  return 'inactive';
}


/**
 * Computes analysis confidence from available evidence.
 *
 * LOW:    repo age < 14 days  OR  issues < 5  OR  PRs < 3
 * HIGH:   age >= 90d  AND  issues >= 10  AND  (PRs >= 5 OR issues >= 20)
 * MEDIUM: everything else
 */
export function computeConfidence(
  metrics: RepositoryMetrics,
): 'low' | 'medium' | 'high' {
  const { repository, issues, pullRequests } = metrics;

  const ageDays = repository.github_created_at
    ? daysSince(repository.github_created_at)
    : null;

  const isLow =
    (ageDays !== null && ageDays < 14) ||
    issues.total < 5 ||
    pullRequests.total < 3;

  if (isLow) return 'low';

  const isHigh =
    (ageDays !== null && ageDays >= 90) &&
    issues.total >= 10 &&
    (pullRequests.total >= 5 || issues.total >= 20);

  return isHigh ? 'high' : 'medium';
}

/**
 * Computes a deterministic health score (0–100) from local repository metrics.
 * Gemini does NOT set this score — it only explains it.
 *
 * Age-aware scoring:
 *  - Early-stage repos (<90 days) get reduced penalties for missing data.
 *  - Lack of PRs alone is NOT a negative signal.
 *  - Tiny repo protection: repos with age<14d + issues<5 + PRs<3 capped at 85.
 *
 * Base: 100 points
 * Deductions:
 *  - Issue backlog ratio (open/total):       up to -20
 *  - Stale issues ratio (stale/total):       up to -15 (scaled by stage)
 *  - PR merge ratio (merged/resolved):       up to -15 (only if PRs exist)
 *  - Stale PRs ratio (stale/total):          up to -10 (only if PRs exist)
 *  - Inactivity (no push in 90+ days):       up to -15 (scaled by stage)
 *  - Limited data (no issues AND no PRs):    -5 (early) / -10 (mature)
 */
export function computeHealthScore(
  metrics: RepositoryMetrics,
  pushedAt: string | null,
): number {
  let score = 100;

  const { issues, pullRequests, repository } = metrics;
  const stage = classifyRepoStage(repository.github_created_at, pushedAt);
  const isEarly = stage === 'early';

  // ── Issue backlog (up to -20) ─────────────────────────────────────────────
  if (issues.total > 0) {
    const openRatio = issues.open / issues.total;
    if (openRatio > 0.7) score -= 20;
    else if (openRatio > 0.5) score -= 15;
    else if (openRatio > 0.3) score -= 10;
  }

  // ── Stale issues (up to -15, reduced for early-stage) ─────────────────────
  if (issues.total > 0) {
    const staleRatio = issues.stale / issues.total;
    const maxPenalty = isEarly ? 5 : 15;
    if (staleRatio > 0.5) score -= maxPenalty;
    else if (staleRatio > 0.3) score -= Math.round(maxPenalty * 0.67);
    else if (staleRatio > 0.15) score -= Math.round(maxPenalty * 0.33);
  }

  // ── PR merge ratio (up to -15) ────────────────────────────────────────────
  // ONLY penalize if PRs actually exist. Zero PRs is NOT a negative signal.
  const resolvedPRs = pullRequests.merged + pullRequests.closed;
  if (resolvedPRs > 0) {
    const mergeRatio = pullRequests.merged / resolvedPRs;
    if (mergeRatio < 0.3) score -= 15;
    else if (mergeRatio < 0.5) score -= 10;
    else if (mergeRatio < 0.7) score -= 5;
  }

  // ── Stale PRs (up to -10) ────────────────────────────────────────────────
  if (pullRequests.total > 0) {
    const stalePRRatio = pullRequests.stale / pullRequests.total;
    if (stalePRRatio > 0.5) score -= 10;
    else if (stalePRRatio > 0.3) score -= 7;
    else if (stalePRRatio > 0.15) score -= 3;
  }

  // ── Inactivity (up to -15, scaled by stage) ──────────────────────────────
  if (!isEarly) {
    if (pushedAt) {
      const pushAge = daysSince(pushedAt);
      if (pushAge > 365) score -= 15;
      else if (pushAge > INACTIVE_THRESHOLD_DAYS) score -= 10;
    } else {
      score -= 15;
    }
  }

  // ── Limited data ──────────────────────────────────────────────────────────
  if (issues.total === 0 && pullRequests.total === 0) {
    score -= isEarly ? 5 : 10;
  }

  const raw = Math.max(0, Math.min(100, score));

  // ── Tiny repository protection ────────────────────────────────────────────
  // Insufficient evidence — cap at 85 regardless of other factors.
  const ageDays = repository.github_created_at
    ? daysSince(repository.github_created_at)
    : null;
  const isTiny =
    (ageDays !== null && ageDays < 14) &&
    issues.total < 5 &&
    pullRequests.total < 3;

  return isTiny ? Math.min(raw, 85) : raw;
}

/**
 * Counts items that haven't been updated in more than STALE_THRESHOLD_DAYS.
 */
export function countStaleItems(
  items: { github_updated_at?: string; updated_at?: string }[],
): number {
  const threshold = Date.now() - STALE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;
  return items.filter((item) => {
    const updatedAt = item.github_updated_at ?? item.updated_at;
    if (!updatedAt) return true;
    return new Date(updatedAt).getTime() < threshold;
  }).length;
}

function daysSince(dateStr: string): number {
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (24 * 60 * 60 * 1000));
}
