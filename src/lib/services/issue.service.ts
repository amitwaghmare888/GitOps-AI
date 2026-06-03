import {
  issueRepository,
  type IssueFilters,
} from '@/lib/repositories/issue.repository';
import { githubIssueRepository } from '@/lib/repositories/github-issue.repository';
import { repositoryService } from '@/lib/services/repository.service';
import { AppError, NotFoundError, toAppError } from '@/lib/errors';
import { createLogger } from '@/lib/logger';
import type { Issue, IssueInsert, GitHubApiIssue } from '@/types/issues';

const log = createLogger('IssueService');

/**
 * Maps a raw GitHub API issue to our DB insert shape.
 */
function mapToIssueInsert(
  issue: GitHubApiIssue,
  repositoryId: string,
  repositoryFullName: string,
): IssueInsert {
  return {
    repository_id: repositoryId,
    github_issue_id: issue.id,
    issue_number: issue.number,
    title: issue.title,
    body: issue.body,
    state: issue.state,
    state_reason: issue.state_reason,
    author_login: issue.user?.login ?? 'ghost',
    author_avatar_url: issue.user?.avatar_url ?? null,
    labels: issue.labels,
    assignees: issue.assignees,
    comments_count: issue.comments,
    html_url: issue.html_url,
    repository_full_name: repositoryFullName,
    is_pull_request: !!issue.pull_request,
    locked: issue.locked,
    github_created_at: issue.created_at,
    github_updated_at: issue.updated_at,
    closed_at: issue.closed_at,
  };
}

export interface SyncResult {
  synced: number;
  message: string;
}

export const issueService = {
  /**
   * Fetches issues for a specific repository from GitHub and upserts them.
   * Validates that the profile owns the repository.
   */
  async syncRepositoryIssues(
    profileId: string,
    repositoryId: string,
    token: string,
  ): Promise<SyncResult> {
    log.info('syncRepositoryIssues start', { profileId, repositoryId });

    try {
      // 1. Verify ownership and get repo details
      const repo = await repositoryService.getRepository(profileId, repositoryId);

      // 2. Fetch issues from GitHub
      const githubIssues = await githubIssueRepository.fetchAllRepoIssues(
        token,
        repo.owner,
        repo.name,
      );

      if (githubIssues.length === 0) {
        log.info('No issues found on GitHub', { repo: repo.full_name });
        return { synced: 0, message: 'No issues found in this repository.' };
      }

      // 3. Map and upsert
      const inserts: IssueInsert[] = githubIssues.map((issue) =>
        mapToIssueInsert(issue, repo.id, repo.full_name),
      );

      const synced = await issueRepository.upsertMany(inserts);
      log.info('syncRepositoryIssues complete', { repositoryId, synced });

      return {
        synced,
        message: `Successfully synced ${synced} issue${synced === 1 ? '' : 's'}.`,
      };
    } catch (err) {
      if (err instanceof AppError) throw err;
      const appErr = toAppError(err);
      log.error('syncRepositoryIssues failed', { repositoryId, error: appErr.message });
      throw appErr;
    }
  },

  /**
   * Lists issues for a specific repository with filters.
   * Validates repository ownership first.
   */
  async getRepositoryIssues(
    profileId: string,
    repositoryId: string,
    filters: IssueFilters = {},
  ): Promise<{ data: Issue[]; count: number }> {
    log.debug('getRepositoryIssues', { profileId, repositoryId, filters });
    
    // Validate ownership
    await repositoryService.getRepository(profileId, repositoryId);
    
    return issueRepository.findByRepositoryId(repositoryId, filters);
  },

  /**
   * Lists issues across all repositories owned by a profile.
   * No repository validation needed since the DB query strictly enforces profile_id joins.
   */
  async getUserIssues(
    profileId: string,
    filters: IssueFilters = {},
  ): Promise<{ data: Issue[]; count: number }> {
    log.debug('getUserIssues', { profileId, filters });
    return issueRepository.findByProfileId(profileId, filters);
  },

  /**
   * Syncs issues across all repositories owned by a profile sequentially.
   */
  async syncAllUserIssues(profileId: string, token: string): Promise<SyncResult> {
    log.info('syncAllUserIssues start', { profileId });

    try {
      const repos = await repositoryService.listRepositories(profileId);
      
      let totalSynced = 0;
      for (const repo of repos) {
        const result = await this.syncRepositoryIssues(profileId, repo.id, token);
        totalSynced += result.synced;
      }

      log.info('syncAllUserIssues complete', { profileId, totalSynced });
      return {
        synced: totalSynced,
        message: `Successfully synced ${totalSynced} issue${totalSynced === 1 ? '' : 's'} across ${repos.length} repositor${repos.length === 1 ? 'y' : 'ies'}.`,
      };
    } catch (err) {
      if (err instanceof AppError) throw err;
      const appErr = toAppError(err);
      log.error('syncAllUserIssues failed', { profileId, error: appErr.message });
      throw appErr;
    }
  },

  /**
   * Returns a single issue by internal ID, validating ownership.
   */
  async getIssue(profileId: string, id: string): Promise<Issue> {
    log.debug('getIssue', { profileId, id });
    const issue = await issueRepository.findById(id);

    if (!issue) {
      throw new NotFoundError(`Issue ${id} not found.`);
    }

    // Validate ownership via repository
    await repositoryService.getRepository(profileId, issue.repository_id);

    return issue;
  },
};
