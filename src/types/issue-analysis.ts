// ─── Category type ───────────────────────────────────────────────────────────

export type IssueCategory =
  | 'bug' | 'feature' | 'refactor' | 'security' | 'documentation'
  | 'ci_cd' | 'testing' | 'performance' | 'devops';

// ─── Evidence sub-type ───────────────────────────────────────────────────────

export interface IssueAnalysisEvidence {
  source: 'title' | 'body' | 'labels' | 'comments' | 'metadata';
  text: string;
}

// ─── Database row type ───────────────────────────────────────────────────────

export interface IssueAnalysis {
  id: string;
  issue_id: string;
  repository_id: string;
  category: IssueCategory;
  priority: 'low' | 'medium' | 'high' | 'critical';
  complexity: 'trivial' | 'low' | 'medium' | 'high';
  risk: 'low' | 'medium' | 'high';
  effort_estimate: 'hours' | 'days' | 'weeks' | 'unknown';
  story_points: 1 | 2 | 3 | 5 | 8;
  root_cause: string;
  suggested_fix: string;
  implementation_steps: string[];
  acceptance_criteria: string[];
  affected_areas: string[];
  blockers: string[];
  confidence: 'low' | 'medium' | 'high';
  evidence: IssueAnalysisEvidence[];
  summary: string;
  labels_used: string[];
  model_name: string;
  prompt_version: string;
  created_at: string;
  updated_at: string;
}

export type IssueAnalysisInsert = Omit<IssueAnalysis, 'id' | 'created_at' | 'updated_at'>;

// ─── Gemini output shape (confidence + story_points computed locally) ────────

export interface AIIssueAnalysisResponse {
  category: IssueCategory;
  priority: 'low' | 'medium' | 'high' | 'critical';
  complexity: 'trivial' | 'low' | 'medium' | 'high';
  risk: 'low' | 'medium' | 'high';
  effort_estimate: 'hours' | 'days' | 'weeks' | 'unknown';
  root_cause: string;
  suggested_fix: string;
  implementation_steps: string[];
  acceptance_criteria: string[];
  affected_areas: string[];
  blockers: string[];
  evidence: IssueAnalysisEvidence[];
  summary: string;
}

// ─── Metrics sent to prompt builder ─────────────────────────────────────────

export interface IssueMetrics {
  issue: {
    title: string;
    body: string | null;
    state: string;
    labels: string[];
    comments_count: number;
    age_days: number;
  };
  repository: {
    language: string | null;
  };
}
