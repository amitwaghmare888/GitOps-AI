import { createClient } from '@/lib/supabase/server';
import { repositoryService } from '@/lib/services/repository.service';
import { createLogger } from '@/lib/logger';
import {
  toAppError,
  GitHubTokenMissingError,
  GitHubApiError,
  DatabaseError,
} from '@/lib/errors';

const log = createLogger('API:repositories/sync');

export async function POST() {
  try {
    const supabase = await createClient();

    // Step 1: Validate auth with getUser() (server-validates the JWT)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      log.warn('Unauthenticated request to POST /api/repositories/sync');
      return Response.json({ error: 'Authentication required.' }, { status: 401 });
    }

    // Step 2: Extract provider_token from the session cookie
    // Note: provider_token is only present on first login. After token refresh
    // it becomes null. We return 401 with a descriptive re-login message.
    const { data: { session } } = await supabase.auth.getSession();
    const providerToken = session?.provider_token;

    if (!providerToken) {
      log.warn('provider_token missing — user must re-login', { userId: user.id });
      throw new GitHubTokenMissingError();
    }

    // Step 3: Sync repositories
    log.info('Starting repository sync', { userId: user.id });
    const result = await repositoryService.syncRepositories(user.id, providerToken);

    log.info('Sync complete', { userId: user.id, synced: result.synced });
    return Response.json(result, { status: 200 });
  } catch (err) {
    const appErr = toAppError(err);
    log.error('POST /api/repositories/sync failed', { error: appErr.message });

    if (appErr instanceof GitHubTokenMissingError) {
      return Response.json({ error: appErr.message }, { status: 401 });
    }
    if (appErr instanceof GitHubApiError) {
      return Response.json({ error: appErr.message }, { status: 502 });
    }
    if (appErr instanceof DatabaseError) {
      return Response.json({ error: 'Database error during sync. Please try again.' }, { status: 500 });
    }
    return Response.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
