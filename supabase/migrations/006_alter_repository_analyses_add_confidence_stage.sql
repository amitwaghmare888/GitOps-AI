-- Migration 006: Add confidence and stage columns to repository_analyses
-- Depends on: 005_create_repository_analyses.sql

ALTER TABLE public.repository_analyses
  ADD COLUMN IF NOT EXISTS confidence TEXT NOT NULL DEFAULT 'low'
    CHECK (confidence IN ('low', 'medium', 'high')),
  ADD COLUMN IF NOT EXISTS stage TEXT NOT NULL DEFAULT 'active'
    CHECK (stage IN ('early', 'active', 'inactive', 'abandoned'));
