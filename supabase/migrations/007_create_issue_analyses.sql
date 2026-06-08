-- Migration 007: Create issue_analyses table
-- Depends on: 003_create_issues.sql, 002_create_repositories.sql

CREATE TABLE IF NOT EXISTS public.issue_analyses (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  issue_id        UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  repository_id   UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  priority        TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  complexity      TEXT NOT NULL CHECK (complexity IN ('trivial', 'low', 'medium', 'high')),
  risk            TEXT NOT NULL CHECK (risk IN ('low', 'medium', 'high')),
  effort_estimate TEXT NOT NULL CHECK (effort_estimate IN ('hours', 'days', 'weeks', 'unknown')),
  root_cause      TEXT NOT NULL,
  suggested_fix   TEXT NOT NULL,
  confidence      TEXT NOT NULL CHECK (confidence IN ('low', 'medium', 'high')),
  evidence        JSONB NOT NULL DEFAULT '[]',
  summary         TEXT NOT NULL,
  labels_used     TEXT[] NOT NULL DEFAULT '{}',
  model_name      TEXT NOT NULL,
  prompt_version  TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.issue_analyses ENABLE ROW LEVEL SECURITY;

-- Users can view analyses for issues in their own repositories
CREATE POLICY "Users can view own issue analyses"
  ON public.issue_analyses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.repositories r
      WHERE r.id = issue_analyses.repository_id
      AND r.profile_id = auth.uid()
    )
  );

-- Users can insert analyses for issues in their own repositories
CREATE POLICY "Users can insert own issue analyses"
  ON public.issue_analyses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.repositories r
      WHERE r.id = repository_id
      AND r.profile_id = auth.uid()
    )
  );

-- Reuse the updated_at trigger function from migration 001
CREATE TRIGGER set_issue_analyses_updated_at
  BEFORE UPDATE ON public.issue_analyses
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Index for fast issue-scoped queries
CREATE INDEX IF NOT EXISTS issue_analyses_issue_id_idx
  ON public.issue_analyses (issue_id);

-- Composite index for fast "latest analysis" lookups
CREATE INDEX IF NOT EXISTS issue_analyses_issue_created_idx
  ON public.issue_analyses (issue_id, created_at DESC);

-- Index for repository-scoped queries
CREATE INDEX IF NOT EXISTS issue_analyses_repository_id_idx
  ON public.issue_analyses (repository_id);
