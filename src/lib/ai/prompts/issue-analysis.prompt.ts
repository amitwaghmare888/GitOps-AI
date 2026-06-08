import type { IssueMetrics } from '@/types/issue-analysis';

export const ISSUE_PROMPT_VERSION = 'issue-analysis-v2';

/** Maximum characters of issue body sent to the model. */
const BODY_CHAR_LIMIT = 1200;

/**
 * Strips prompt injection patterns from user-supplied text.
 */
function sanitize(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, '[code]')
    .replace(/(?:^|\n)\s*(?:SYSTEM|ASSISTANT|USER)\s*:/gi, '')
    .replace(/(?:^|\n)\s*(?:ignore|disregard|forget)\s+(?:all\s+)?(?:previous|above|prior)\s+(?:instructions?|rules?|prompts?)/gi, '')
    .replace(/(?:^|\n)\s*(?:you are now|act as|pretend to be|new instructions?:)/gi, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim();
}

/**
 * Builds a token-optimized prompt for Gemini issue analysis v2.
 *
 * Token budget: ~600-800 tokens.
 * Removed: author, is_stale, repo name, repo stage, verbose rules.
 * Kept: title, body (truncated), state, labels, comments, age, language.
 */
export function buildIssueAnalysisPrompt(metrics: IssueMetrics): string {
  const { issue, repository } = metrics;

  const safeTitle = sanitize(issue.title);
  const safeBody = issue.body
    ? sanitize(issue.body).slice(0, BODY_CHAR_LIMIT)
    : 'No description.';

  const labels = issue.labels.length > 0 ? issue.labels.join(', ') : 'None';
  const lang = repository.language ?? 'Unknown';

  return `Analyze this GitHub issue. Concise engineering language only. No filler.

ISSUE
Title: ${safeTitle}
State: ${issue.state} | Age: ${issue.age_days}d | Comments: ${issue.comments_count} | Lang: ${lang}
Labels: ${labels}
Body: ${safeBody}

RULES
1. category: bug|feature|refactor|security|documentation|ci_cd|testing|performance|devops
2. priority: low=cosmetic, medium=minor bug/gap, high=broken, critical=data loss/security
3. complexity: trivial=typo, low=1 file, medium=multi-file, high=architectural
4. risk: low=isolated, medium=shared code, high=could break existing
5. effort_estimate: hours=<4h, days=1-3d, weeks=3+d, unknown=insufficient detail
6. root_cause+suggested_fix: cite issue text. No invented file paths.
7. implementation_steps: 2-5 short action items
8. acceptance_criteria: 2-5 testable conditions
9. affected_areas: 1-4 from CI/CD|Testing|Security|Backend|Frontend|Infrastructure|Documentation|Database|API|DevOps
10. blockers: 0-3 only if evidence exists. Empty array if none.
11. evidence: 2-5 items, each with source (title|body|labels|comments|metadata) and quoted text

JSON only:
{"category":"","priority":"","complexity":"","risk":"","effort_estimate":"","root_cause":"","suggested_fix":"","implementation_steps":[],"acceptance_criteria":[],"affected_areas":[],"blockers":[],"evidence":[{"source":"","text":""}],"summary":""}`;
}
