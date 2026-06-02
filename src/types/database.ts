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
