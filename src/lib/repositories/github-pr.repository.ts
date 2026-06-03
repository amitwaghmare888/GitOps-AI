import { GitHubApiError } from '@/lib/errors';
import { createLogger } from '@/lib/logger';
import type { GitHubApiPullRequest } from '@/types/pull-requests';

const log = createLogger('GitHubPRRepository');

const GITHUB_API_BASE = 'https://api.github.com';
const PER_PAGE = 100;
const MAX_PAGES = 10; // Safety cap: max 1,000 PRs per sync

/**
 * Fetches a single page of pull requests for a repository from the GitHub API.
 */
async function fetchPullRequestsPage(
  token: string,
  owner: string,
  repo: string,
  state: 'open' | 'closed' | 'all',
  page: number,
): Promise<GitHubApiPullRequest[]> {
  const url = new URL(`${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls`);
  url.searchParams.set('per_page', String(PER_PAGE));
  url.searchParams.set('page', String(page));
  url.searchParams.set('state', state);
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
      state,
      repo: `${owner}/${repo}`,
      body: body.slice(0, 200),
    });
    throw new GitHubApiError(
      `GitHub API error ${response.status}: ${response.statusText}`,
    );
  }

  const data = await response.json() as GitHubApiPullRequest[];
  log.debug('Fetched pull requests page', { page, state, count: data.length });
  return data;
}

export const githubPRRepository = {
  /**
   * Paginates through all repository pull requests (open + closed) up to MAX_PAGES.
   * GitHub's /pulls endpoint does NOT return merged PRs via state=all the same way
   * as the issues API — it returns them with state=closed and merged=true.
   * Fetching state='all' covers open, closed, and merged PRs in one pass.
   */
  async fetchAllRepoPullRequests(
    token: string,
    owner: string,
    repo: string,
  ): Promise<GitHubApiPullRequest[]> {
    log.info('fetchAllRepoPullRequests start', { repo: `${owner}/${repo}` });
    const all: GitHubApiPullRequest[] = [];

    for (let page = 1; page <= MAX_PAGES; page++) {
      const prs = await fetchPullRequestsPage(token, owner, repo, 'all', page);
      all.push(...prs);

      if (prs.length < PER_PAGE) {
        break;
      }
    }

    log.info('fetchAllRepoPullRequests complete', { total: all.length });
    return all;
  },
};
