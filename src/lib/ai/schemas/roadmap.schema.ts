import { z } from 'zod';

// ─── Zod schema for roadmap AI response ──────────────────────────────────────

const SprintIssueSchema = z.object({
  issue_id: z.string(),
  title: z.string().min(1),
  story_points: z.number().int().min(0),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
});

const SprintSchema = z.object({
  goal: z.string().min(1),
  theme: z.string().min(1),
  issues: z.array(SprintIssueSchema).min(1),
  story_points: z.number().int().min(0),
  duration_weeks: z.number().int().min(1).max(4),
});

const RiskSchema = z.object({
  description: z.string().min(1),
  impact: z.enum(['low', 'medium', 'high']),
  mitigation: z.string().min(1),
});

const DependencySchema = z.object({
  from_issue_title: z.string().min(1),
  to_issue_title: z.string().min(1),
  reason: z.string().min(1),
});

const PriorityItemSchema = z.object({
  issue_id: z.string(),
  title: z.string().min(1),
  rationale: z.string().min(1),
});

export const AIRoadmapResponseSchema = z.object({
  executive_summary: z.string().min(1),
  sprints: z.array(SprintSchema).min(1).max(5),
  dependencies: z.array(DependencySchema).max(10),
  critical_risks: z.array(RiskSchema).min(1).max(5),
  priority_order: z.array(PriorityItemSchema).min(1).max(15),
});
