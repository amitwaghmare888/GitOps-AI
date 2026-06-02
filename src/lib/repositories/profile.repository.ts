import { createClient } from '@/lib/supabase/server';
import { DatabaseError, NotFoundError } from '@/lib/errors';
import { createLogger } from '@/lib/logger';
import type { Profile, ProfileInsert } from '@/types/database';

const log = createLogger('ProfileRepository');

export const profileRepository = {
  async findById(userId: string): Promise<Profile | null> {
    log.debug('findById', { userId });
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      log.error('findById failed', { userId, error: error.message });
      throw new DatabaseError(`Failed to find profile: ${error.message}`, error);
    }

    return data;
  },

  async findByGithubUserId(githubUserId: string): Promise<Profile | null> {
    log.debug('findByGithubUserId', { githubUserId });
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('github_user_id', githubUserId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      log.error('findByGithubUserId failed', { githubUserId, error: error.message });
      throw new DatabaseError(`Failed to find profile: ${error.message}`, error);
    }

    return data;
  },

  async create(profile: ProfileInsert): Promise<Profile> {
    log.info('create', { userId: profile.id, github_username: profile.github_username });
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('profiles')
      .insert(profile)
      .select()
      .single();

    if (error) {
      log.error('create failed', { error: error.message });
      throw new DatabaseError(`Failed to create profile: ${error.message}`, error);
    }

    if (!data) {
      throw new NotFoundError('Profile not returned after create');
    }

    return data;
  },

  async upsert(profile: ProfileInsert): Promise<Profile> {
    log.info('upsert', { userId: profile.id, github_username: profile.github_username });
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('profiles')
      .upsert(profile, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      log.error('upsert failed', { error: error.message });
      throw new DatabaseError(`Failed to upsert profile: ${error.message}`, error);
    }

    if (!data) {
      throw new NotFoundError('Profile not returned after upsert');
    }

    return data;
  },
};
