-- Migration 004: Create pull_requests table
-- Depends on: 003_create_issues.sql (repositories table must exist)

CREATE TABLE IF NOT EXISTS public.pull_requests (
  id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  repository_id           UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  github_pull_request_id  BIGINT NOT NULL,
  pull_request_number     INTEGER NOT NULL,
  title                   TEXT NOT NULL,
  body                    TEXT,
  state                   TEXT NOT NULL,
  author_login            TEXT NOT NULL,
  author_avatar_url       TEXT,
  html_url                TEXT NOT NULL,
  is_draft                BOOLEAN NOT NULL DEFAULT false,
  is_merged               BOOLEAN NOT NULL DEFAULT false,
  repository_full_name    TEXT NOT NULL,
  github_created_at       TIMESTAMPTZ NOT NULL,
  github_updated_at       TIMESTAMPTZ NOT NULL,
  github_merged_at        TIMESTAMPTZ,
  synced_at               TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at              TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at              TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Prevent duplicate PRs per repository
  UNIQUE(repository_id, github_pull_request_id)
);

-- Enable Row Level Security
ALTER TABLE public.pull_requests ENABLE ROW LEVEL SECURITY;

-- Users can view pull requests for their own repositories
CREATE POLICY "Users can view own repository pull requests"
  ON public.pull_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.repositories r
      WHERE r.id = pull_requests.repository_id
      AND r.profile_id = auth.uid()
    )
  );

-- Users can insert pull requests for their own repositories
CREATE POLICY "Users can insert own repository pull requests"
  ON public.pull_requests FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.repositories r
      WHERE r.id = repository_id
      AND r.profile_id = auth.uid()
    )
  );

-- Users can update pull requests for their own repositories
CREATE POLICY "Users can update own repository pull requests"
  ON public.pull_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.repositories r
      WHERE r.id = pull_requests.repository_id
      AND r.profile_id = auth.uid()
    )
  );

-- Users can delete pull requests for their own repositories
CREATE POLICY "Users can delete own repository pull requests"
  ON public.pull_requests FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.repositories r
      WHERE r.id = pull_requests.repository_id
      AND r.profile_id = auth.uid()
    )
  );

-- Reuse the updated_at trigger function from migration 001
CREATE TRIGGER set_pull_requests_updated_at
  BEFORE UPDATE ON public.pull_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Index for fast repository-scoped queries
CREATE INDEX IF NOT EXISTS pull_requests_repository_id_idx
  ON public.pull_requests (repository_id);

-- Index for fast state filtering
CREATE INDEX IF NOT EXISTS pull_requests_state_idx
  ON public.pull_requests (state);

-- Index for fast sync tracking
CREATE INDEX IF NOT EXISTS pull_requests_synced_at_idx
  ON public.pull_requests (synced_at);
