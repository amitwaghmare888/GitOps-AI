import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createLogger } from '@/lib/logger';
import { profileRepository } from '@/lib/repositories/profile.repository';
import { toAppError } from '@/lib/errors';
import { requireSupabaseEnv } from '@/lib/env';
import type { GitHubUserMetadata } from '@/types/auth';

const log = createLogger('AuthCallback');

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  log.info('OAuth callback received', { hasCode: !!code, next });

  if (!code) {
    log.error('No code in callback');
    return NextResponse.redirect(`${origin}/login?error=no_code`);
  }

  try {
    const cookieStore = await cookies();
    const env = requireSupabaseEnv();
    const supabase = createServerClient(env.url, env.anonKey, {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          },
        },
      },
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      log.error('exchangeCodeForSession failed', { error: error.message });
      return NextResponse.redirect(`${origin}/login?error=auth_failed`);
    }

    if (data.user) {
      log.info('Session established, ensuring profile', { userId: data.user.id });

      const metadata = data.user.user_metadata as GitHubUserMetadata;
      const githubUserId = metadata.sub ?? metadata.provider_id ?? '';
      const githubUsername = metadata.user_name ?? metadata.preferred_username ?? 'unknown';
      const avatarUrl = metadata.avatar_url ?? null;
      const email = data.user.email ?? metadata.email ?? null;

      try {
        await profileRepository.upsert({
          id: data.user.id,
          github_user_id: githubUserId,
          github_username: githubUsername,
          avatar_url: avatarUrl,
          email,
        });
        log.info('Profile ensured successfully', { userId: data.user.id });
      } catch (profileErr) {
        // Log but don't block the redirect — profile can be created later
        const appErr = toAppError(profileErr);
        log.warn('Profile upsert failed (non-blocking)', {
          userId: data.user.id,
          error: appErr.message,
        });
      }
    }

    log.info('Redirecting to', { next });
    return NextResponse.redirect(`${origin}${next}`);
  } catch (err) {
    const appErr = toAppError(err);
    log.error('OAuth callback error', { error: appErr.message });
    return NextResponse.redirect(`${origin}/login?error=callback_failed`);
  }
}
