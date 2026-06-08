import { createClient } from '@/lib/supabase/server';
import { DatabaseError } from '@/lib/errors';
import { createLogger } from '@/lib/logger';
import type { IssueAnalysis, IssueAnalysisInsert } from '@/types/issue-analysis';

const log = createLogger('IssueAnalysisRepository');

export const issueAnalysisRepository = {
  /**
   * Inserts a new issue analysis row. Always creates a new record (never overwrites).
   */
  async createAnalysis(analysis: IssueAnalysisInsert): Promise<IssueAnalysis> {
    log.info('createAnalysis', { issueId: analysis.issue_id });
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('issue_analyses')
      .insert(analysis)
      .select()
      .single();

    if (error) {
      log.error('createAnalysis failed', { error: error.message });
      throw new DatabaseError(`Failed to save issue analysis: ${error.message}`, error);
    }

    return data as IssueAnalysis;
  },

  /**
   * Returns the most recent analysis for an issue, or null if none exists.
   */
  async getLatestAnalysis(issueId: string): Promise<IssueAnalysis | null> {
    log.debug('getLatestAnalysis', { issueId });
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('issue_analyses')
      .select('*')
      .eq('issue_id', issueId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      log.error('getLatestAnalysis failed', { issueId, error: error.message });
      throw new DatabaseError(`Failed to fetch issue analysis: ${error.message}`, error);
    }

    return data as IssueAnalysis;
  },

  /**
   * Returns analysis history for an issue, most recent first.
   */
  async getAnalysisHistory(issueId: string, limit = 10): Promise<IssueAnalysis[]> {
    log.debug('getAnalysisHistory', { issueId, limit });
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('issue_analyses')
      .select('*')
      .eq('issue_id', issueId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      log.error('getAnalysisHistory failed', { issueId, error: error.message });
      throw new DatabaseError(`Failed to fetch analysis history: ${error.message}`, error);
    }

    return (data ?? []) as IssueAnalysis[];
  },
};
