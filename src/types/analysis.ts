// ─── Structured JSONB sub-types (future agent consumption) ───────────────────

export interface AnalysisFinding {
  category: string;
  detail: string;
  severity: 'low' | 'medium' | 'high';
}

export interface AnalysisRisk {
  area: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
}

export interface AnalysisRecommendation {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
}

// ─── Database row type ───────────────────────────────────────────────────────

export interface RepositoryAnalysis {
  id: string;
  repository_id: string;
  health_score: number;
  confidence: 'low' | 'medium' | 'high';
  stage: 'early' | 'active' | 'inactive' | 'abandoned';
  summary: string;
  findings: AnalysisFinding[];
  risks: AnalysisRisk[];
  recommendations: AnalysisRecommendation[];
  model_name: string;
  prompt_version: string;
  created_at: string;
  updated_at: string;
}

export type RepositoryAnalysisInsert = Omit<RepositoryAnalysis, 'id' | 'created_at' | 'updated_at'>;

// ─── Gemini output shape (no healthScore — computed locally) ─────────────────

export interface AIAnalysisResponse {
  summary: string;
  findings: AnalysisFinding[];
  risks: AnalysisRisk[];
  recommendations: AnalysisRecommendation[];
}

// ─── Metrics sent to Gemini ─────────────────────────────────────────────────

export interface RepositoryMetrics {
  repository: {
    name: string;
    language: string | null;
    visibility: string;
    github_created_at: string | null;
    pushed_at: string | null;
  };
  issues: {
    total: number;
    open: number;
    closed: number;
    stale: number;
    recent: { title: string; state: string; created_at: string }[];
  };
  pullRequests: {
    total: number;
    open: number;
    merged: number;
    closed: number;
    stale: number;
    recent: { title: string; state: string; is_merged: boolean; created_at: string }[];
  };
}
