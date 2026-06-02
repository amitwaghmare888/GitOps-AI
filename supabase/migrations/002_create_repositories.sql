-- Migration 002: Create repositories table
-- Depends on: 001_create_profiles.sql (profiles table must exist)
--
-- Ownership model: repositories.profile_id = auth.users.id = profiles.id
-- RLS: auth.uid() = profile_id is valid because profiles.id is a FK to auth.users.id

CREATE TABLE IF NOT EXISTS public.repositories (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id            UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  github_repository_id  BIGINT NOT NULL,
  name                  TEXT NOT NULL,
  full_name             TEXT NOT NULL,
  owner                 TEXT NOT NULL,
  description           TEXT,
  visibility            TEXT NOT NULL DEFAULT 'public',
  default_branch        TEXT NOT NULL DEFAULT 'main',
  language              TEXT,
  stars                 INTEGER NOT NULL DEFAULT 0,
  forks                 INTEGER NOT NULL DEFAULT 0,
  open_issues_count     INTEGER NOT NULL DEFAULT 0,
  html_url              TEXT NOT NULL,
  pushed_at             TIMESTAMPTZ,
  github_created_at     TIMESTAMPTZ,
  synced_at             TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at            TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at            TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  -- Prevent duplicate repos per profile
  UNIQUE(profile_id, github_repository_id)
);

-- Enable Row Level Security
ALTER TABLE public.repositories ENABLE ROW LEVEL SECURITY;

-- Users can only view their own repositories
CREATE POLICY "Users can view own repositories"
  ON public.repositories FOR SELECT
  USING (auth.uid() = profile_id);

-- Users can insert their own repositories
CREATE POLICY "Users can insert own repositories"
  ON public.repositories FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

-- Users can update their own repositories
CREATE POLICY "Users can update own repositories"
  ON public.repositories FOR UPDATE
  USING (auth.uid() = profile_id);

-- Users can delete their own repositories
CREATE POLICY "Users can delete own repositories"
  ON public.repositories FOR DELETE
  USING (auth.uid() = profile_id);

-- Reuse the updated_at trigger function from migration 001
CREATE TRIGGER set_repositories_updated_at
  BEFORE UPDATE ON public.repositories
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Index for fast profile-scoped queries
CREATE INDEX IF NOT EXISTS repositories_profile_id_idx
  ON public.repositories (profile_id);

-- Index for lookup by github_repository_id within a profile
CREATE INDEX IF NOT EXISTS repositories_profile_github_id_idx
  ON public.repositories (profile_id, github_repository_id);
