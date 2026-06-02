import { createClient } from '@/lib/supabase/server';
import { DatabaseError, NotFoundError } from '@/lib/errors';
import { createLogger } from '@/lib/logger';
import type { Repository, RepositoryInsert } from '@/types/database';

const log = createLogger('RepositoryRepository');

export interface RepositoryFilters {
  search?: string;
  language?: string;
  visibility?: string;
}

export const repositoryRepository = {
  /**
   * Returns all repositories belonging to a profile, with optional filters.
   */
  async findByProfileId(
    profileId: string,
    filters: RepositoryFilters = {},
  ): Promise<Repository[]> {
    log.debug('findByProfileId', { profileId, filters });
    const supabase = await createClient();

    let query = supabase
      .from('repositories')
      .select('*')
      .eq('profile_id', profileId)
      .order('stars', { ascending: false });

    if (filters.search) {
      // Sanitize search to prevent PostgREST .or() syntax errors from commas
      const safeSearch = filters.search.replace(/,/g, '');
      
      // Search across name, full_name and description
      query = query.or(
        `name.ilike.%${safeSearch}%,full_name.ilike.%${safeSearch}%,description.ilike.%${safeSearch}%`,
      );
    }

    if (filters.language) {
      query = query.ilike('language', filters.language);
    }

    if (filters.visibility) {
      query = query.eq('visibility', filters.visibility);
    }

    const { data, error } = await query;

    if (error) {
      log.error('findByProfileId failed', { profileId, error: error.message });
      throw new DatabaseError(`Failed to list repositories: ${error.message}`, error);
    }

    return data ?? [];
  },

  /**
   * Finds a single repository by its internal UUID, scoped to the owner profile.
   */
  async findById(id: string, profileId: string): Promise<Repository | null> {
    log.debug('findById', { id, profileId });
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('repositories')
      .select('*')
      .eq('id', id)
      .eq('profile_id', profileId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      log.error('findById failed', { id, error: error.message });
      throw new DatabaseError(`Failed to find repository: ${error.message}`, error);
    }

    return data;
  },

  /**
   * Counts total repositories for a profile (no filters).
   */
  async countByProfileId(profileId: string): Promise<number> {
    log.debug('countByProfileId', { profileId });
    const supabase = await createClient();

    const { count, error } = await supabase
      .from('repositories')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', profileId);

    if (error) {
      log.error('countByProfileId failed', { profileId, error: error.message });
      throw new DatabaseError(`Failed to count repositories: ${error.message}`, error);
    }

    return count ?? 0;
  },

  /**
   * Gets the most recent synced_at timestamp for a profile's repositories.
   */
  async getLastSyncedAt(profileId: string): Promise<string | null> {
    log.debug('getLastSyncedAt', { profileId });
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('repositories')
      .select('synced_at')
      .eq('profile_id', profileId)
      .order('synced_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      log.error('getLastSyncedAt failed', { profileId, error: error.message });
      throw new DatabaseError(`Failed to get last synced: ${error.message}`, error);
    }

    return data?.synced_at ?? null;
  },

  /**
   * Upserts a batch of repositories. Uses (profile_id, github_repository_id)
   * as the conflict key to prevent duplicates.
   */
  async upsertMany(repos: RepositoryInsert[]): Promise<number> {
    if (repos.length === 0) return 0;

    log.info('upsertMany', { count: repos.length, profileId: repos[0]?.profile_id });
    const supabase = await createClient();

    // Add synced_at timestamp for all rows in this batch
    const now = new Date().toISOString();
    const rows = repos.map((r) => ({ ...r, synced_at: now }));

    const { error } = await supabase
      .from('repositories')
      .upsert(rows, {
        onConflict: 'profile_id,github_repository_id',
        ignoreDuplicates: false,
      });

    if (error) {
      log.error('upsertMany failed', { error: error.message });
      throw new DatabaseError(`Failed to sync repositories: ${error.message}`, error);
    }

    log.info('upsertMany complete', { count: repos.length });
    return repos.length;
  },

  /**
   * Returns distinct non-null languages used across a profile's repositories.
   */
  async getDistinctLanguages(profileId: string): Promise<string[]> {
    log.debug('getDistinctLanguages', { profileId });
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('repositories')
      .select('language')
      .eq('profile_id', profileId)
      .not('language', 'is', null)
      .order('language');

    if (error) {
      log.error('getDistinctLanguages failed', { profileId, error: error.message });
      throw new DatabaseError(`Failed to get languages: ${error.message}`, error);
    }

    const seen = new Set<string>();
    for (const row of data ?? []) {
      if (row.language) seen.add(row.language);
    }
    return Array.from(seen);
  },
};

export { NotFoundError };
