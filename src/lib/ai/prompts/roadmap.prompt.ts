import type { RoadmapMetrics } from '@/types/roadmap';

export const ROADMAP_PROMPT_VERSION = 'roadmap-v1';

/**
 * Builds a token-optimized prompt for Gemini roadmap generation.
 *
 * Token budget target: ~600 input tokens.
 * Compact per-issue format: [priority|complexity|SPsp|category] Title [blocked]
 * Unanalyzed issues: [?|?|?sp|?] Title
 */
export function buildRoadmapPrompt(metrics: RoadmapMetrics): string {
  const { repository, issues, unanalyzed_titles, total_story_points } = metrics;

  const lang = repository.language ?? 'Not specified';
  const analyzedCount = issues.length;
  const totalCount = analyzedCount + unanalyzed_titles.length;

  // Compact one-line format for analyzed issues
  const analyzedLines = issues
    .map((i) => {
      const blocked = i.is_blocked ? ' [blocked]' : '';
      return `  [${i.priority}|${i.complexity}|${i.story_points}sp|${i.category}] ${i.title}${blocked}`;
    })
    .join('\n');

  // Unanalyzed issues — title only
  const unanalyzedLines = unanalyzed_titles
    .map((t) => `  [?|?|?sp|?] ${t}`)
    .join('\n');

  const allIssueLines = [analyzedLines, unanalyzedLines].filter(Boolean).join('\n');

  // Determine how many sprints to request based on issue count
  const maxSprints = totalCount <= 3 ? 1 : totalCount <= 8 ? 2 : 3;

  return `You are a senior engineering manager. Generate a sprint roadmap from the issues below. Concise engineering language. No filler. No generic advice.

REPOSITORY
  Name: ${repository.name} | Health: ${repository.health_score}/100 | Stage: ${repository.stage} | Lang: ${lang}

OPEN ISSUES (${analyzedCount}/${totalCount} analyzed)
${allIssueLines}

TOTAL STORY POINTS: ${total_story_points}

RULES
1. Create ${maxSprints === 1 ? 'exactly 1 sprint' : `1 to ${maxSprints} sprints`}. Do not create empty sprints.
2. Sprint 1: critical/high priority first. Bugs before features.${maxSprints >= 2 ? '\n3. Sprint 2: medium priority, infrastructure, refactors.' : ''}${maxSprints >= 3 ? '\n4. Sprint 3: low priority, enhancements, technical debt.' : ''}
5. Each sprint goal: 1 sentence. theme: primary category (bug/feature/refactor/etc).
6. story_points per sprint: sum of included issues' story_points. Use 0 for unanalyzed issues.
7. duration_weeks: 1 for trivial sprints, 2 for normal, up to 4 for large.
8. dependencies: only cite if explicit evidence exists (blocker or shared area). Empty array is acceptable.
9. critical_risks: at least 1. Cite issue titles as evidence. If insufficient data, cite that as the risk.
10. priority_order: rank ALL issues (analyzed + unanalyzed). Include rationale per issue.
11. For unanalyzed issues [?]: place them based on title context. Use story_points: 0 and priority: "medium".
12. issue_id: use the exact issue_id provided. For unanalyzed issues use empty string "".

JSON only — sprints is an ARRAY:
{"executive_summary":"","sprints":[{"goal":"","theme":"","issues":[{"issue_id":"","title":"","story_points":0,"priority":"low"}],"story_points":0,"duration_weeks":2}],"dependencies":[],"critical_risks":[{"description":"","impact":"low","mitigation":""}],"priority_order":[{"issue_id":"","title":"","rationale":""}]}`;
}
