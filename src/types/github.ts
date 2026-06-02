/**
 * Raw repository object returned by the GitHub REST API.
 * Reference: GET /user/repos
 */
export interface GitHubApiRepository {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
    avatar_url: string;
  };
  description: string | null;
  private: boolean;
  visibility: string;
  default_branch: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  html_url: string;
  pushed_at: string | null;
  created_at: string;
  fork: boolean;
  archived: boolean;
  disabled: boolean;
}

/**
 * Paginated response from GET /user/repos.
 * GitHub uses Link headers for pagination; this type represents one page.
 */
export type GitHubApiRepositoryPage = GitHubApiRepository[];
