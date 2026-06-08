-- Migration 008: Add v2 fields to issue_analyses
-- Backward compatible: all new columns have defaults, existing rows unaffected.

ALTER TABLE public.issue_analyses
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'bug'
    CHECK (category IN ('bug', 'feature', 'refactor', 'security', 'documentation', 'ci_cd', 'testing', 'performance', 'devops')),
  ADD COLUMN IF NOT EXISTS implementation_steps JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS acceptance_criteria JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS affected_areas TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS blockers JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS story_points INTEGER NOT NULL DEFAULT 1
    CHECK (story_points IN (1, 2, 3, 5, 8));
