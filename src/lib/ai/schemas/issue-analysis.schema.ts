import { z } from 'zod';

// ─── Zod schema for issue analysis AI response (v2) ─────────────────────────

const EvidenceSchema = z.object({
  source: z.enum(['title', 'body', 'labels', 'comments', 'metadata']),
  text: z.string().min(1),
});

export const AIIssueAnalysisResponseSchema = z.object({
  category: z.enum(['bug', 'feature', 'refactor', 'security', 'documentation', 'ci_cd', 'testing', 'performance', 'devops']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  complexity: z.enum(['trivial', 'low', 'medium', 'high']),
  risk: z.enum(['low', 'medium', 'high']),
  effort_estimate: z.enum(['hours', 'days', 'weeks', 'unknown']),
  root_cause: z.string().min(1),
  suggested_fix: z.string().min(1),
  implementation_steps: z.array(z.string().min(1)).min(1).max(5),
  acceptance_criteria: z.array(z.string().min(1)).min(1).max(5),
  affected_areas: z.array(z.string().min(1)).min(1).max(4),
  blockers: z.array(z.string().min(1)).max(3),
  evidence: z.array(EvidenceSchema).min(1).max(5),
  summary: z.string().min(1),
});
