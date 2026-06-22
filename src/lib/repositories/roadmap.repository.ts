import { createClient } from '@/lib/supabase/server';
import { DatabaseError } from '@/lib/errors';
import { createLogger } from '@/lib/logger';
import type { RepositoryRoadmap, RepositoryRoadmapInsert } from '@/types/roadmap';

const log = createLogger('RoadmapRepository');

export const roadmapRepository = {
  /**
   * Inserts a new roadmap row. Always creates a new record (never overwrites).
   */
  async createRoadmap(roadmap: RepositoryRoadmapInsert): Promise<RepositoryRoadmap> {
    log.info('createRoadmap', { repositoryId: roadmap.repository_id });
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('repository_roadmaps')
      .insert(roadmap)
      .select()
      .single();

    if (error) {
      log.error('createRoadmap failed', { error: error.message });
      throw new DatabaseError(`Failed to save roadmap: ${error.message}`, error);
    }

    return data as RepositoryRoadmap;
  },

  /**
   * Returns the most recent roadmap for a repository, or null if none exists.
   */
  async getLatestRoadmap(repositoryId: string): Promise<RepositoryRoadmap | null> {
    log.debug('getLatestRoadmap', { repositoryId });
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('repository_roadmaps')
      .select('*')
      .eq('repository_id', repositoryId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      log.error('getLatestRoadmap failed', { repositoryId, error: error.message });
      throw new DatabaseError(`Failed to fetch roadmap: ${error.message}`, error);
    }

    return data as RepositoryRoadmap;
  },
};
