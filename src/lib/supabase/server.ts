import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { requireSupabaseEnv } from '@/lib/env';

export async function createClient() {
  const cookieStore = await cookies();

  const env = requireSupabaseEnv();

  return createServerClient(env.url, env.anonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // The `setAll` method is called from a Server Component where
            // cookies cannot be set. This can be safely ignored if the
            // middleware is refreshing user sessions.
          }
        },
      },
    },
  );
}
