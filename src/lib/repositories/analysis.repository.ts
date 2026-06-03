import { createClient } from '@/lib/supabase/server';
import { DatabaseError } from '@/lib/errors';
import { createLogger } from '@/lib/logger';
import type { RepositoryAnalysis, RepositoryAnalysisInsert } from '@/types/analysis';

const log = createLogger('AnalysisRepository');

export const analysisRepository = {
  /**
   * Inserts a new analysis row. Always creates a new record (never overwrites).
   */
  async createAnalysis(analysis: RepositoryAnalysisInsert): Promise<RepositoryAnalysis> {
    log.info('createAnalysis', { repositoryId: analysis.repository_id });
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('repository_analyses')
      .insert(analysis)
      .select()
      .single();

    if (error) {
      log.error('createAnalysis failed', { error: error.message });
      throw new DatabaseError(`Failed to save analysis: ${error.message}`, error);
    }

    return data as RepositoryAnalysis;
  },

  /**
   * Returns the most recent analysis for a repository, or null if none exists.
   */
  async getLatestAnalysis(repositoryId: string): Promise<RepositoryAnalysis | null> {
    log.debug('getLatestAnalysis', { repositoryId });
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('repository_analyses')
      .select('*')
      .eq('repository_id', repositoryId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      log.error('getLatestAnalysis failed', { repositoryId, error: error.message });
      throw new DatabaseError(`Failed to fetch analysis: ${error.message}`, error);
    }

    return data as RepositoryAnalysis;
  },
};
