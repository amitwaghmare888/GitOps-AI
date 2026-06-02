import { githubRepository } from '@/lib/repositories/github.repository';
import { GitHubApiError, toAppError } from '@/lib/errors';
import { createLogger } from '@/lib/logger';
import type { GitHubApiRepository } from '@/types/github';

const log = createLogger('GitHubService');

export const githubService = {
  /**
   * Fetches all repositories for the authenticated GitHub user.
   * Throws GitHubApiError on network or API failures.
   */
  async fetchRepositories(token: string): Promise<GitHubApiRepository[]> {
    log.info('fetchRepositories');
    try {
      const repos = await githubRepository.fetchAllUserRepos(token);
      log.info('fetchRepositories complete', { total: repos.length });
      return repos;
    } catch (err) {
      if (err instanceof GitHubApiError) throw err;
      const appErr = toAppError(err);
      log.error('fetchRepositories failed', { error: appErr.message });
      throw new GitHubApiError(
        `Failed to fetch repositories from GitHub: ${appErr.message}`,
        appErr,
      );
    }
  },
};
