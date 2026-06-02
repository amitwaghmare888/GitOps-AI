export interface AuthUser {
  id: string;
  email: string | null;
  github_username: string;
  avatar_url: string | null;
}

export interface GitHubUserMetadata {
  user_name?: string;
  preferred_username?: string;
  avatar_url?: string;
  sub?: string;
  provider_id?: string;
  email?: string;
  full_name?: string;
  name?: string;
}
