-- Migration 009: Create repository_roadmaps table
-- Depends on: 002_create_repositories.sql, 001_create_profiles.sql (handle_updated_at)

CREATE TABLE IF NOT EXISTS public.repository_roadmaps (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  repository_id         UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,

  -- Gemini-generated fields
  executive_summary     TEXT NOT NULL,
  sprints               JSONB NOT NULL DEFAULT '[]',
  dependencies          JSONB NOT NULL DEFAULT '[]',
  critical_risks        JSONB NOT NULL DEFAULT '[]',
  priority_order        JSONB NOT NULL DEFAULT '[]',

  -- Locally computed before Gemini call
  total_story_points    INTEGER NOT NULL DEFAULT 0,
  confidence            TEXT NOT NULL DEFAULT 'low'
                          CHECK (confidence IN ('low', 'medium', 'high')),

  -- Audit / context fields
  issue_count           INTEGER NOT NULL DEFAULT 0,
  analyzed_issue_count  INTEGER NOT NULL DEFAULT 0,
  model_name            TEXT NOT NULL,
  prompt_version        TEXT NOT NULL,
  created_at            TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at            TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.repository_roadmaps ENABLE ROW LEVEL SECURITY;

-- Users can view roadmaps for their own repositories
CREATE POLICY "Users can view own roadmaps"
  ON public.repository_roadmaps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.repositories r
      WHERE r.id = repository_roadmaps.repository_id
      AND r.profile_id = auth.uid()
    )
  );

-- Users can insert roadmaps for their own repositories
CREATE POLICY "Users can insert own roadmaps"
  ON public.repository_roadmaps FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.repositories r
      WHERE r.id = repository_id
      AND r.profile_id = auth.uid()
    )
  );

-- Reuse the updated_at trigger function from migration 001
CREATE TRIGGER set_repository_roadmaps_updated_at
  BEFORE UPDATE ON public.repository_roadmaps
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Index for repository-scoped queries
CREATE INDEX IF NOT EXISTS repository_roadmaps_repository_id_idx
  ON public.repository_roadmaps (repository_id);

-- Composite index for fast "latest roadmap" lookups
CREATE INDEX IF NOT EXISTS repository_roadmaps_repository_created_idx
  ON public.repository_roadmaps (repository_id, created_at DESC);
