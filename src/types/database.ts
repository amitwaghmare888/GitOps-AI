export interface Profile {
  id: string;
  github_user_id: string;
  github_username: string;
  avatar_url: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export type ProfileInsert = Omit<Profile, 'created_at' | 'updated_at'>;
export type ProfileUpdate = Partial<Omit<Profile, 'id' | 'created_at'>>;

// ─── Repository ──────────────────────────────────────────────────────────────

export interface Repository {
  id: string;
  profile_id: string;
  github_repository_id: number;
  name: string;
  full_name: string;
  owner: string;
  description: string | null;
  visibility: string;
  default_branch: string;
  language: string | null;
  stars: number;
  forks: number;
  open_issues_count: number;
  html_url: string;
  pushed_at: string | null;
  github_created_at: string | null;
  synced_at: string;
  created_at: string;
  updated_at: string;
}

export type RepositoryInsert = Omit<Repository, 'id' | 'synced_at' | 'created_at' | 'updated_at'>;
export type RepositoryUpdate = Partial<Omit<Repository, 'id' | 'profile_id' | 'github_repository_id' | 'created_at'>>;

