import {
  pullRequestRepository,
  type PullRequestFilters,
} from '@/lib/repositories/pull-request.repository';
import { githubPRRepository } from '@/lib/repositories/github-pr.repository';
import { repositoryService } from '@/lib/services/repository.service';
import { AppError, NotFoundError, toAppError } from '@/lib/errors';
import { createLogger } from '@/lib/logger';
import type { PullRequest, PullRequestInsert, GitHubApiPullRequest } from '@/types/pull-requests';

const log = createLogger('PullRequestService');

/**
 * Maps a raw GitHub API pull request to our DB insert shape.
 */
function mapToPullRequestInsert(
  pr: GitHubApiPullRequest,
  repositoryId: string,
  repositoryFullName: string,
): PullRequestInsert {
  return {
    repository_id: repositoryId,
    github_pull_request_id: pr.id,
    pull_request_number: pr.number,
    title: pr.title,
    body: pr.body,
    state: pr.state,
    author_login: pr.user?.login ?? 'ghost',
    author_avatar_url: pr.user?.avatar_url ?? null,
    html_url: pr.html_url,
    is_draft: pr.draft ?? false,
    is_merged: pr.merged ?? false,
    repository_full_name: repositoryFullName,
    github_created_at: pr.created_at,
    github_updated_at: pr.updated_at,
    github_merged_at: pr.merged_at,
  };
}

export interface SyncResult {
  synced: number;
  message: string;
}

export const pullRequestService = {
  /**
   * Fetches pull requests for a specific repository from GitHub and upserts them.
   * Validates that the profile owns the repository.
   */
  async syncRepositoryPullRequests(
    profileId: string,
    repositoryId: string,
    token: string,
  ): Promise<SyncResult> {
    log.info('syncRepositoryPullRequests start', { profileId, repositoryId });

    try {
      // 1. Verify ownership and get repo details
      const repo = await repositoryService.getRepository(profileId, repositoryId);

      // 2. Fetch pull requests from GitHub
      const githubPRs = await githubPRRepository.fetchAllRepoPullRequests(
        token,
        repo.owner,
        repo.name,
      );

      if (githubPRs.length === 0) {
        log.info('No pull requests found on GitHub', { repo: repo.full_name });
        return { synced: 0, message: 'No pull requests found in this repository.' };
      }

      // 3. Map GitHub payload to DB insert shape
      const inserts: PullRequestInsert[] = githubPRs.map((pr) =>
        mapToPullRequestInsert(pr, repo.id, repo.full_name),
      );

      // 4. Bulk upsert into Supabase
      const synced = await pullRequestRepository.upsertMany(inserts);
      log.info('syncRepositoryPullRequests complete', { repositoryId, synced });

      return {
        synced,
        message: `Successfully synced ${synced} pull request${synced === 1 ? '' : 's'}.`,
      };
    } catch (err) {
      if (err instanceof AppError) throw err;
      const appErr = toAppError(err);
      log.error('syncRepositoryPullRequests failed', { repositoryId, error: appErr.message });
      throw appErr;
    }
  },

  /**
   * Lists pull requests for a specific repository with filters.
   * Validates repository ownership first.
   */
  async getRepositoryPullRequests(
    profileId: string,
    repositoryId: string,
    filters: PullRequestFilters = {},
  ): Promise<{ data: PullRequest[]; count: number }> {
    log.debug('getRepositoryPullRequests', { profileId, repositoryId, filters });

    // Validate ownership
    await repositoryService.getRepository(profileId, repositoryId);

    return pullRequestRepository.findByRepositoryId(repositoryId, filters);
  },

  /**
   * Returns a single pull request by internal ID, validating ownership.
   */
  async getPullRequest(profileId: string, id: string): Promise<PullRequest> {
    log.debug('getPullRequest', { profileId, id });
    const pr = await pullRequestRepository.findById(id);

    if (!pr) {
      throw new NotFoundError(`Pull request ${id} not found.`);
    }

    // Validate ownership via repository
    await repositoryService.getRepository(profileId, pr.repository_id);

    return pr;
  },
};
