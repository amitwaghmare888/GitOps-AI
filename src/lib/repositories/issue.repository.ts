import { createClient } from '@/lib/supabase/server';
import { DatabaseError, NotFoundError } from '@/lib/errors';
import { createLogger } from '@/lib/logger';
import type { Issue, IssueInsert } from '@/types/issues';

const log = createLogger('IssueRepository');

export interface IssueFilters {
  search?: string;
  state?: string;
  limit?: number;
  offset?: number;
}

export const issueRepository = {
  /**
   * Returns issues belonging to a repository, with optional filters.
   */
  async findByRepositoryId(
    repositoryId: string,
    filters: IssueFilters = {},
  ): Promise<{ data: Issue[]; count: number }> {
    log.debug('findByRepositoryId', { repositoryId, filters });
    const supabase = await createClient();

    let query = supabase
      .from('issues')
      .select('*', { count: 'exact' })
      .eq('repository_id', repositoryId)
      .order('github_updated_at', { ascending: false });

    if (filters.search) {
      const safeSearch = filters.search.replace(/,/g, '');
      query = query.ilike('title', `%${safeSearch}%`);
    }

    if (filters.state && filters.state !== 'all') {
      query = query.eq('state', filters.state);
    }

    if (filters.limit !== undefined) {
      const offset = filters.offset ?? 0;
      query = query.range(offset, offset + filters.limit - 1);
    }

    const { data, count, error } = await query;

    if (error) {
      log.error('findByRepositoryId failed', { repositoryId, error: error.message });
      throw new DatabaseError(`Failed to list issues: ${error.message}`, error);
    }

    return { data: data ?? [], count: count ?? 0 };
  },

  /**
   * Returns issues across all repositories owned by a specific profile.
   */
  async findByProfileId(
    profileId: string,
    filters: IssueFilters = {},
  ): Promise<{ data: Issue[]; count: number }> {
    log.debug('findByProfileId', { profileId, filters });
    const supabase = await createClient();

    // Use an inner join to only fetch issues for repositories owned by this profile
    let query = supabase
      .from('issues')
      .select('*, repositories!inner(profile_id)', { count: 'exact' })
      .eq('repositories.profile_id', profileId)
      .order('github_updated_at', { ascending: false });

    if (filters.search) {
      const safeSearch = filters.search.replace(/,/g, '');
      query = query.ilike('title', `%${safeSearch}%`);
    }

    if (filters.state && filters.state !== 'all') {
      query = query.eq('state', filters.state);
    }

    if (filters.limit !== undefined) {
      const offset = filters.offset ?? 0;
      query = query.range(offset, offset + filters.limit - 1);
    }

    const { data, count, error } = await query;

    if (error) {
      log.error('findByProfileId failed', { profileId, error: error.message });
      throw new DatabaseError(`Failed to list global issues: ${error.message}`, error);
    }

    return { data: data ?? [], count: count ?? 0 };
  },

  /**
   * Finds a single issue by its internal UUID.
   */
  async findById(id: string): Promise<Issue | null> {
    log.debug('findById', { id });
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('issues')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      log.error('findById failed', { id, error: error.message });
      throw new DatabaseError(`Failed to find issue: ${error.message}`, error);
    }

    return data;
  },

  /**
   * Counts total issues for a repository (no filters).
   */
  async countByRepositoryId(repositoryId: string): Promise<number> {
    log.debug('countByRepositoryId', { repositoryId });
    const supabase = await createClient();

    const { count, error } = await supabase
      .from('issues')
      .select('id', { count: 'exact', head: true })
      .eq('repository_id', repositoryId);

    if (error) {
      log.error('countByRepositoryId failed', { repositoryId, error: error.message });
      throw new DatabaseError(`Failed to count issues: ${error.message}`, error);
    }

    return count ?? 0;
  },

  /**
   * Upserts a batch of issues. Uses (repository_id, github_issue_id)
   * as the conflict key to prevent duplicates.
   */
  async upsertMany(issues: IssueInsert[]): Promise<number> {
    if (issues.length === 0) return 0;

    log.info('upsertMany issues', { count: issues.length, repoId: issues[0]?.repository_id });
    const supabase = await createClient();

    const now = new Date().toISOString();
    const rows = issues.map((i) => ({ ...i, synced_at: now }));

    const { error } = await supabase
      .from('issues')
      .upsert(rows, {
        onConflict: 'repository_id,github_issue_id',
        ignoreDuplicates: false,
      });

    if (error) {
      log.error('upsertMany issues failed', { error: error.message });
      throw new DatabaseError(`Failed to sync issues: ${error.message}`, error);
    }

    log.info('upsertMany issues complete', { count: issues.length });
    return issues.length;
  },
};

export { NotFoundError };
