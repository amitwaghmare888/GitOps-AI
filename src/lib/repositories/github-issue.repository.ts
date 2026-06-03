import { GitHubApiError } from '@/lib/errors';
import { createLogger } from '@/lib/logger';
import type { GitHubApiIssue } from '@/types/issues';

const log = createLogger('GitHubIssueRepository');

const GITHUB_API_BASE = 'https://api.github.com';
const PER_PAGE = 100;
const MAX_PAGES = 10; // Safety cap: max 1,000 issues per sync

/**
 * Fetches a single page of issues for a repository from the GitHub API.
 */
async function fetchIssuesPage(
  token: string,
  owner: string,
  repo: string,
  page: number,
): Promise<GitHubApiIssue[]> {
  const url = new URL(`${GITHUB_API_BASE}/repos/${owner}/${repo}/issues`);
  url.searchParams.set('per_page', String(PER_PAGE));
  url.searchParams.set('page', String(page));
  url.searchParams.set('state', 'all'); // Fetch both open and closed
  url.searchParams.set('sort', 'updated');
  url.searchParams.set('direction', 'desc');

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    // Opt out of Next.js data cache for API calls — always fresh
    cache: 'no-store',
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    log.error('GitHub API request failed', {
      status: response.status,
      page,
      repo: `${owner}/${repo}`,
      body: body.slice(0, 200),
    });
    throw new GitHubApiError(
      `GitHub API error ${response.status}: ${response.statusText}`,
    );
  }

  const data = await response.json() as GitHubApiIssue[];
  log.debug('Fetched issues page', { page, count: data.length });
  return data;
}

export const githubIssueRepository = {
  /**
   * Paginates through repository issues up to MAX_PAGES.
   * Note: GitHub's issues API returns both issues and pull requests.
   */
  async fetchAllRepoIssues(
    token: string,
    owner: string,
    repo: string,
  ): Promise<GitHubApiIssue[]> {
    log.info('fetchAllRepoIssues start', { repo: `${owner}/${repo}` });
    const all: GitHubApiIssue[] = [];

    for (let page = 1; page <= MAX_PAGES; page++) {
      const issues = await fetchIssuesPage(token, owner, repo, page);
      all.push(...issues);

      if (issues.length < PER_PAGE) {
        break;
      }
    }

    log.info('fetchAllRepoIssues complete', { total: all.length });
    return all;
  },
};
