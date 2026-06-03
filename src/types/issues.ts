export interface Issue {
  id: string;
  repository_id: string;
  github_issue_id: number;
  issue_number: number;
  title: string;
  body: string | null;
  state: string;
  state_reason: string | null;
  author_login: string;
  author_avatar_url: string | null;
  labels: Record<string, unknown>[];
  assignees: Record<string, unknown>[];
  comments_count: number;
  html_url: string;
  repository_full_name: string;
  is_pull_request: boolean;
  locked: boolean;
  github_created_at: string;
  github_updated_at: string;
  closed_at: string | null;
  synced_at: string;
  created_at: string;
  updated_at: string;
}

export type IssueInsert = Omit<Issue, 'id' | 'synced_at' | 'created_at' | 'updated_at'>;
export type IssueUpdate = Partial<Omit<Issue, 'id' | 'repository_id' | 'github_issue_id' | 'created_at'>>;

export interface GitHubApiIssue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: string;
  state_reason: string | null;
  user: {
    login: string;
    avatar_url: string;
  } | null;
  labels: {
    id: number;
    name: string;
    color: string;
    description: string | null;
  }[];
  assignees: {
    login: string;
    avatar_url: string;
  }[];
  comments: number;
  html_url: string;
  repository_url: string;
  pull_request?: {
    url: string;
    html_url: string;
    diff_url: string;
    patch_url: string;
  };
  locked: boolean;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

export type GitHubApiIssuePage = GitHubApiIssue[];
