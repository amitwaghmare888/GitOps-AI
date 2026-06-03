-- Migration 003: Create issues table
-- Depends on: 002_create_repositories.sql

CREATE TABLE IF NOT EXISTS public.issues (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  repository_id         UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  github_issue_id       BIGINT NOT NULL,
  issue_number          INTEGER NOT NULL,
  title                 TEXT NOT NULL,
  body                  TEXT,
  state                 TEXT NOT NULL,
  state_reason          TEXT,
  author_login          TEXT NOT NULL,
  author_avatar_url     TEXT,
  labels                JSONB DEFAULT '[]'::jsonb NOT NULL,
  assignees             JSONB DEFAULT '[]'::jsonb NOT NULL,
  comments_count        INTEGER NOT NULL DEFAULT 0,
  html_url              TEXT NOT NULL,
  repository_full_name  TEXT NOT NULL,
  is_pull_request       BOOLEAN NOT NULL DEFAULT false,
  locked                BOOLEAN NOT NULL DEFAULT false,
  github_created_at     TIMESTAMPTZ NOT NULL,
  github_updated_at     TIMESTAMPTZ NOT NULL,
  closed_at             TIMESTAMPTZ,
  synced_at             TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at            TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at            TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Prevent duplicate issues per repository
  UNIQUE(repository_id, github_issue_id)
);

-- Enable Row Level Security
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;

-- Users can view issues for their own repositories
CREATE POLICY "Users can view own repository issues"
  ON public.issues FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.repositories r
      WHERE r.id = issues.repository_id
      AND r.profile_id = auth.uid()
    )
  );

-- Users can insert issues for their own repositories
CREATE POLICY "Users can insert own repository issues"
  ON public.issues FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.repositories r
      WHERE r.id = repository_id
      AND r.profile_id = auth.uid()
    )
  );

-- Users can update issues for their own repositories
CREATE POLICY "Users can update own repository issues"
  ON public.issues FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.repositories r
      WHERE r.id = issues.repository_id
      AND r.profile_id = auth.uid()
    )
  );

-- Users can delete issues for their own repositories
CREATE POLICY "Users can delete own repository issues"
  ON public.issues FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.repositories r
      WHERE r.id = issues.repository_id
      AND r.profile_id = auth.uid()
    )
  );

-- Reuse the updated_at trigger function
CREATE TRIGGER set_issues_updated_at
  BEFORE UPDATE ON public.issues
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Index for fast repository-scoped queries
CREATE INDEX IF NOT EXISTS issues_repository_id_idx
  ON public.issues (repository_id);

-- Index for lookup by github_issue_id within a repository
CREATE INDEX IF NOT EXISTS issues_repo_github_id_idx
  ON public.issues (repository_id, github_issue_id);

-- Index for fast status filtering
CREATE INDEX IF NOT EXISTS issues_state_idx
  ON public.issues (state);
