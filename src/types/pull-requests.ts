export interface PullRequest {
  id: string;
  repository_id: string;
  github_pull_request_id: number;
  pull_request_number: number;
  title: string;
  body: string | null;
  state: string;
  author_login: string;
  author_avatar_url: string | null;
  html_url: string;
  is_draft: boolean;
  is_merged: boolean;
  repository_full_name: string;
  github_created_at: string;
  github_updated_at: string;
  github_merged_at: string | null;
  synced_at: string;
  created_at: string;
  updated_at: string;
}

export type PullRequestInsert = Omit<PullRequest, 'id' | 'synced_at' | 'created_at' | 'updated_at'>;
export type PullRequestUpdate = Partial<Omit<PullRequest, 'id' | 'repository_id' | 'github_pull_request_id' | 'created_at'>>;

export interface GitHubApiPullRequest {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: string;
  user: {
    login: string;
    avatar_url: string;
  } | null;
  html_url: string;
  draft: boolean;
  merged: boolean;
  merged_at: string | null;
  created_at: string;
  updated_at: string;
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
    sha: string;
  };
}

export type GitHubApiPullRequestPage = GitHubApiPullRequest[];
