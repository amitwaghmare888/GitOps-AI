import type { RepositoryAnalysis } from '@/types/analysis';

/**
 * Computes roadmap confidence deterministically from data availability.
 * The AI does NOT set this — it is computed locally before the Gemini call.
 *
 * LOW:    no issues analyzed  OR  analysis ratio < 30%  OR  no repo analysis
 * HIGH:   analysis ratio >= 70%  AND  analyzed >= 5  AND  repo analysis exists
 *           AND  repo health_score >= 40
 * MEDIUM: everything else
 */
export function computeRoadmapConfidence(
  issueCount: number,
  analyzedIssueCount: number,
  repoAnalysis: RepositoryAnalysis | null,
): 'low' | 'medium' | 'high' {
  // No data at all
  if (issueCount === 0 || analyzedIssueCount === 0) return 'low';

  const ratio = analyzedIssueCount / issueCount;

  // Insufficient coverage or missing repo context
  if (ratio < 0.3 || repoAnalysis === null) return 'low';

  // High confidence requires strong data across all dimensions
  const isHigh =
    ratio >= 0.7 &&
    analyzedIssueCount >= 5 &&
    repoAnalysis !== null &&
    repoAnalysis.health_score >= 40;

  return isHigh ? 'high' : 'medium';
}
