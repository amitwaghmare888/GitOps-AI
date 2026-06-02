import { createClient } from '@/lib/supabase/server';
import { profileRepository } from '@/lib/repositories/profile.repository';
import { AuthError, toAppError } from '@/lib/errors';
import { createLogger } from '@/lib/logger';
import type { AuthUser, GitHubUserMetadata } from '@/types/auth';
import type { Profile, ProfileInsert } from '@/types/database';
import type { Session } from '@supabase/supabase-js';

const log = createLogger('AuthService');

export const authService = {
  /**
   * Initiates GitHub OAuth sign-in. Returns the redirect URL.
   */
  async signInWithGitHub(redirectTo: string): Promise<string> {
    log.info('signInWithGitHub', { redirectTo });
    const supabase = await createClient();

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo,
      },
    });

    if (error) {
      log.error('signInWithGitHub failed', { error: error.message });
      throw new AuthError(
        `GitHub sign-in failed: ${error.message}`,
        'AUTH_SIGN_IN_FAILED',
        error,
      );
    }

    if (!data.url) {
      throw new AuthError('No redirect URL returned from OAuth', 'AUTH_SIGN_IN_FAILED');
    }

    return data.url;
  },

  /**
   * Signs out the current user.
   */
  async signOut(): Promise<void> {
    log.info('signOut');
    const supabase = await createClient();

    const { error } = await supabase.auth.signOut();

    if (error) {
      log.error('signOut failed', { error: error.message });
      throw new AuthError(
        `Sign-out failed: ${error.message}`,
        'AUTH_SIGN_OUT_FAILED',
        error,
      );
    }
  },

  /**
   * Returns the current session, or null if not authenticated.
   */
  async getSession(): Promise<Session | null> {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  /**
   * Returns the authenticated user via getUser() (validates with Supabase Auth server).
   */
  async getUser() {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return user;
  },

  /**
   * Creates or updates the profile after a successful OAuth callback.
   */
  async ensureProfile(userId: string, metadata: GitHubUserMetadata): Promise<Profile> {
    log.info('ensureProfile', { userId });

    try {
      const githubUserId = metadata.sub ?? metadata.provider_id ?? '';
      const githubUsername = metadata.user_name ?? metadata.preferred_username ?? 'unknown';
      const avatarUrl = metadata.avatar_url ?? null;
      const email = metadata.email ?? null;

      const profileData: ProfileInsert = {
        id: userId,
        github_user_id: githubUserId,
        github_username: githubUsername,
        avatar_url: avatarUrl,
        email,
      };

      const profile = await profileRepository.upsert(profileData);
      log.info('ensureProfile succeeded', { userId, github_username: githubUsername });
      return profile;
    } catch (err) {
      const appErr = toAppError(err);
      log.error('ensureProfile failed', { userId, error: appErr.message });
      throw new AuthError(
        `Failed to ensure profile: ${appErr.message}`,
        'PROFILE_CREATE_FAILED',
        appErr,
      );
    }
  },

  /**
   * Maps a Supabase user to the application's AuthUser shape.
   */
  getAuthUser(user: { id: string; email?: string | null | undefined; user_metadata: GitHubUserMetadata }): AuthUser {
    return {
      id: user.id,
      email: user.email ?? user.user_metadata.email ?? null,
      github_username: user.user_metadata.user_name ?? user.user_metadata.preferred_username ?? 'unknown',
      avatar_url: user.user_metadata.avatar_url ?? null,
    };
  },
};
