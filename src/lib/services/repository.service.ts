import {
  repositoryRepository,
  type RepositoryFilters,
} from '@/lib/repositories/repository.repository';
import { githubService } from '@/lib/services/github.service';
import { AppError, NotFoundError, toAppError } from '@/lib/errors';
import { createLogger } from '@/lib/logger';
import type { Repository, RepositoryInsert } from '@/types/database';
import type { GitHubApiRepository } from '@/types/github';

const log = createLogger('RepositoryService');

/**
 * Maps a raw GitHub API repository to our DB insert shape.
 */
function mapToRepositoryInsert(
  repo: GitHubApiRepository,
  profileId: string,
): RepositoryInsert {
  return {
    profile_id: profileId,
    github_repository_id: repo.id,
    name: repo.name,
    full_name: repo.full_name,
    owner: repo.owner.login,
    description: repo.description,
    visibility: repo.private ? 'private' : (repo.visibility ?? 'public'),
    default_branch: repo.default_branch,
    language: repo.language,
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    open_issues_count: repo.open_issues_count,
    html_url: repo.html_url,
    pushed_at: repo.pushed_at,
    github_created_at: repo.created_at,
  };
}

export interface SyncResult {
  synced: number;
  message: string;
}

export interface DashboardStats {
  totalRepos: number;
  languages: string[];
  lastSyncedAt: string | null;
}

export const repositoryService = {
  /**
   * Fetches repositories from GitHub and upserts them into the database.
   * Returns the number of repositories synced.
   */
  async syncRepositories(profileId: string, token: string): Promise<SyncResult> {
    log.info('syncRepositories start', { profileId });

    try {
      const githubRepos = await githubService.fetchRepositories(token);

      if (githubRepos.length === 0) {
        log.info('No repositories found on GitHub', { profileId });
        return { synced: 0, message: 'No repositories found on your GitHub account.' };
      }

      const inserts: RepositoryInsert[] = githubRepos.map((r) =>
        mapToRepositoryInsert(r, profileId),
      );

      const synced = await repositoryRepository.upsertMany(inserts);
      log.info('syncRepositories complete', { profileId, synced });

      return {
        synced,
        message: `Successfully synced ${synced} repositor${synced === 1 ? 'y' : 'ies'}.`,
      };
    } catch (err) {
      if (err instanceof AppError) throw err;
      const appErr = toAppError(err);
      log.error('syncRepositories failed', { profileId, error: appErr.message });
      throw appErr;
    }
  },

  /**
   * Lists repositories for a profile with optional filters.
   */
  async listRepositories(
    profileId: string,
    filters: RepositoryFilters = {},
  ): Promise<Repository[]> {
    log.debug('listRepositories', { profileId, filters });
    return repositoryRepository.findByProfileId(profileId, filters);
  },

  /**
   * Returns a single repository by internal ID, validating ownership.
   * Throws NotFoundError if the repo doesn't exist or doesn't belong to the profile.
   */
  async getRepository(profileId: string, id: string): Promise<Repository> {
    log.debug('getRepository', { profileId, id });
    const repo = await repositoryRepository.findById(id, profileId);

    if (!repo) {
      throw new NotFoundError(`Repository ${id} not found.`);
    }

    return repo;
  },

  /**
   * Returns dashboard statistics for a profile.
   */
  async getDashboardStats(profileId: string): Promise<DashboardStats> {
    const [totalRepos, languages, lastSyncedAt] = await Promise.all([
      repositoryRepository.countByProfileId(profileId),
      repositoryRepository.getDistinctLanguages(profileId),
      repositoryRepository.getLastSyncedAt(profileId),
    ]);

    return { totalRepos, languages, lastSyncedAt };
  },
};
