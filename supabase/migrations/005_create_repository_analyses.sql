-- Migration 005: Create repository_analyses table
-- Depends on: 002_create_repositories.sql (repositories table must exist)

CREATE TABLE IF NOT EXISTS public.repository_analyses (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  repository_id     UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  health_score      INTEGER NOT NULL CHECK (health_score >= 0 AND health_score <= 100),
  summary           TEXT NOT NULL,
  findings          JSONB NOT NULL DEFAULT '[]',
  risks             JSONB NOT NULL DEFAULT '[]',
  recommendations   JSONB NOT NULL DEFAULT '[]',
  model_name        TEXT NOT NULL,
  prompt_version    TEXT NOT NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at        TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.repository_analyses ENABLE ROW LEVEL SECURITY;

-- Users can view analyses for their own repositories
CREATE POLICY "Users can view own repository analyses"
  ON public.repository_analyses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.repositories r
      WHERE r.id = repository_analyses.repository_id
      AND r.profile_id = auth.uid()
    )
  );

-- Users can insert analyses for their own repositories
CREATE POLICY "Users can insert own repository analyses"
  ON public.repository_analyses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.repositories r
      WHERE r.id = repository_id
      AND r.profile_id = auth.uid()
    )
  );

-- Reuse the updated_at trigger function from migration 001
CREATE TRIGGER set_repository_analyses_updated_at
  BEFORE UPDATE ON public.repository_analyses
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Index for fast repository-scoped queries
CREATE INDEX IF NOT EXISTS repository_analyses_repository_id_idx
  ON public.repository_analyses (repository_id);

-- Composite index for fast "latest analysis" lookups
CREATE INDEX IF NOT EXISTS repository_analyses_repo_created_idx
  ON public.repository_analyses (repository_id, created_at DESC);
