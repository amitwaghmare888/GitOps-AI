import { createClient } from '@/lib/supabase/server';
import { DatabaseError, NotFoundError } from '@/lib/errors';
import { createLogger } from '@/lib/logger';
import type { PullRequest, PullRequestInsert } from '@/types/pull-requests';

const log = createLogger('PullRequestRepository');

export interface PullRequestFilters {
  search?: string;
  state?: string;
  limit?: number;
  offset?: number;
}

export const pullRequestRepository = {
  /**
   * Returns pull requests belonging to a repository, with optional filters.
   */
  async findByRepositoryId(
    repositoryId: string,
    filters: PullRequestFilters = {},
  ): Promise<{ data: PullRequest[]; count: number }> {
    log.debug('findByRepositoryId', { repositoryId, filters });
    const supabase = await createClient();

    let query = supabase
      .from('pull_requests')
      .select('*', { count: 'exact' })
      .eq('repository_id', repositoryId)
      .order('github_updated_at', { ascending: false });

    if (filters.search) {
      const safeSearch = filters.search.replace(/,/g, '');
      query = query.ilike('title', `%${safeSearch}%`);
    }

    if (filters.state && filters.state !== 'all') {
      if (filters.state === 'merged') {
        // Merged PRs have state='closed' and is_merged=true
        query = query.eq('is_merged', true);
      } else {
        query = query.eq('state', filters.state).eq('is_merged', false);
      }
    }

    if (filters.limit !== undefined) {
      const offset = filters.offset ?? 0;
      query = query.range(offset, offset + filters.limit - 1);
    }

    const { data, count, error } = await query;

    if (error) {
      log.error('findByRepositoryId failed', { repositoryId, error: error.message });
      throw new DatabaseError(`Failed to list pull requests: ${error.message}`, error);
    }

    return { data: data ?? [], count: count ?? 0 };
  },

  /**
   * Finds a single pull request by its internal UUID.
   */
  async findById(id: string): Promise<PullRequest | null> {
    log.debug('findById', { id });
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('pull_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      log.error('findById failed', { id, error: error.message });
      throw new DatabaseError(`Failed to find pull request: ${error.message}`, error);
    }

    return data;
  },

  /**
   * Counts total pull requests for a repository (no filters).
   */
  async countByRepositoryId(repositoryId: string): Promise<number> {
    log.debug('countByRepositoryId', { repositoryId });
    const supabase = await createClient();

    const { count, error } = await supabase
      .from('pull_requests')
      .select('id', { count: 'exact', head: true })
      .eq('repository_id', repositoryId);

    if (error) {
      log.error('countByRepositoryId failed', { repositoryId, error: error.message });
      throw new DatabaseError(`Failed to count pull requests: ${error.message}`, error);
    }

    return count ?? 0;
  },

  /**
   * Upserts a batch of pull requests. Uses (repository_id, github_pull_request_id)
   * as the conflict key to prevent duplicates.
   */
  async upsertMany(pullRequests: PullRequestInsert[]): Promise<number> {
    if (pullRequests.length === 0) return 0;

    log.info('upsertMany pull requests', {
      count: pullRequests.length,
      repoId: pullRequests[0]?.repository_id,
    });
    const supabase = await createClient();

    const now = new Date().toISOString();
    const rows = pullRequests.map((pr) => ({ ...pr, synced_at: now }));

    const { error } = await supabase
      .from('pull_requests')
      .upsert(rows, {
        onConflict: 'repository_id,github_pull_request_id',
        ignoreDuplicates: false,
      });

    if (error) {
      log.error('upsertMany pull requests failed', { error: error.message });
      throw new DatabaseError(`Failed to sync pull requests: ${error.message}`, error);
    }

    log.info('upsertMany pull requests complete', { count: pullRequests.length });
    return pullRequests.length;
  },
};

export { NotFoundError };
