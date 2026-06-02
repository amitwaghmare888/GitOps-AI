import { GitHubApiError } from '@/lib/errors';
import { createLogger } from '@/lib/logger';
import type { GitHubApiRepository } from '@/types/github';

const log = createLogger('GitHubRepository');

const GITHUB_API_BASE = 'https://api.github.com';
const PER_PAGE = 100;
const MAX_PAGES = 10; // Safety cap: max 1,000 repositories

/**
 * Fetches a single page of repositories from the GitHub API.
 */
async function fetchReposPage(
  token: string,
  page: number,
): Promise<GitHubApiRepository[]> {
  const url = new URL(`${GITHUB_API_BASE}/user/repos`);
  url.searchParams.set('per_page', String(PER_PAGE));
  url.searchParams.set('page', String(page));
  url.searchParams.set('sort', 'updated');
  url.searchParams.set('affiliation', 'owner,collaborator,organization_member');

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
      body: body.slice(0, 200),
    });
    throw new GitHubApiError(
      `GitHub API error ${response.status}: ${response.statusText}`,
    );
  }

  const data = await response.json() as GitHubApiRepository[];
  log.debug('Fetched page', { page, count: data.length });
  return data;
}

export const githubRepository = {
  /**
   * Paginates through all user repositories up to MAX_PAGES.
   * Returns the complete array of raw GitHub API repository objects.
   */
  async fetchAllUserRepos(token: string): Promise<GitHubApiRepository[]> {
    log.info('fetchAllUserRepos start');
    const all: GitHubApiRepository[] = [];

    for (let page = 1; page <= MAX_PAGES; page++) {
      const repos = await fetchReposPage(token, page);
      all.push(...repos);

      // GitHub returns fewer items than per_page when we've hit the last page
      if (repos.length < PER_PAGE) {
        break;
      }
    }

    log.info('fetchAllUserRepos complete', { total: all.length });
    return all;
  },
};
