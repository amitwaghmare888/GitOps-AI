import type { IssueAnalysisEvidence } from '@/types/issue-analysis';

/**
 * Computes issue analysis confidence deterministically from evidence quality.
 * The AI does NOT set this -- it is computed locally from issue metadata
 * and the evidence the AI extracted.
 *
 * Evidence-based rules:
 *   LOW:    body < 50 chars  OR  no labels  OR  evidence count < 2
 *   HIGH:   body >= 300 chars  AND  labels >= 2  AND  comments >= 3
 *             AND  evidence count >= 4  AND  evidence has >= 2 distinct sources
 *   MEDIUM: everything else
 */
export function computeIssueConfidence(
  bodyLength: number,
  labelCount: number,
  commentCount: number,
  evidence: IssueAnalysisEvidence[],
): 'low' | 'medium' | 'high' {
  const evidenceCount = evidence.length;
  const distinctSources = new Set(evidence.map((e) => e.source)).size;

  const isLow =
    bodyLength < 50 ||
    labelCount === 0 ||
    evidenceCount < 2;

  if (isLow) return 'low';

  const isHigh =
    bodyLength >= 300 &&
    labelCount >= 2 &&
    commentCount >= 3 &&
    evidenceCount >= 4 &&
    distinctSources >= 2;

  return isHigh ? 'high' : 'medium';
}

/**
 * Deterministic story point mapping from complexity.
 *   trivial -> 1
 *   low     -> 2
 *   medium  -> 3
 *   high    -> 5
 *   (fallback) -> 8
 */
const STORY_POINT_MAP: Record<string, 1 | 2 | 3 | 5 | 8> = {
  trivial: 1,
  low: 2,
  medium: 3,
  high: 5,
};

export function computeStoryPoints(complexity: string): 1 | 2 | 3 | 5 | 8 {
  return STORY_POINT_MAP[complexity] ?? 8;
}
