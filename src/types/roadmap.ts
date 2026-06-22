// ─── Sprint sub-types ─────────────────────────────────────────────────────────

export interface RoadmapSprintIssue {
  issue_id: string;
  title: string;
  story_points: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface RoadmapSprint {
  goal: string;
  theme: string;
  issues: RoadmapSprintIssue[];
  story_points: number;
  duration_weeks: number;
}

// ─── Risk sub-type ────────────────────────────────────────────────────────────

export interface RoadmapRisk {
  description: string;
  impact: 'low' | 'medium' | 'high';
  mitigation: string;
}

// ─── Dependency sub-type ──────────────────────────────────────────────────────

export interface RoadmapDependency {
  from_issue_title: string;
  to_issue_title: string;
  reason: string;
}

// ─── Priority item sub-type ───────────────────────────────────────────────────

export interface RoadmapPriorityItem {
  issue_id: string;
  title: string;
  rationale: string;
}

// ─── Database row type ────────────────────────────────────────────────────────

export interface RepositoryRoadmap {
  id: string;
  repository_id: string;
  executive_summary: string;
  sprints: RoadmapSprint[];
  dependencies: RoadmapDependency[];
  critical_risks: RoadmapRisk[];
  priority_order: RoadmapPriorityItem[];
  total_story_points: number;
  confidence: 'low' | 'medium' | 'high';
  issue_count: number;
  analyzed_issue_count: number;
  model_name: string;
  prompt_version: string;
  created_at: string;
  updated_at: string;
}

export type RepositoryRoadmapInsert =
  Omit<RepositoryRoadmap, 'id' | 'created_at' | 'updated_at'>;

// ─── Gemini output shape ──────────────────────────────────────────────────────
// total_story_points, confidence, issue_count, analyzed_issue_count computed locally.

export interface AIRoadmapResponse {
  executive_summary: string;
  sprints: RoadmapSprint[];
  dependencies: RoadmapDependency[];
  critical_risks: RoadmapRisk[];
  priority_order: RoadmapPriorityItem[];
}

// ─── Metrics sent to prompt builder ──────────────────────────────────────────

export interface RoadmapIssueInput {
  issue_id: string;
  title: string;
  priority: string;
  complexity: string;
  story_points: number;
  category: string;
  is_blocked: boolean;
}

export interface RoadmapMetrics {
  repository: {
    name: string;
    language: string | null;
    health_score: number;
    stage: string;
  };
  issues: RoadmapIssueInput[];
  unanalyzed_titles: string[];
  total_story_points: number;
}
