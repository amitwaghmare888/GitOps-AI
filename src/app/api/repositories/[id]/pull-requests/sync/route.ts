import { createClient } from '@/lib/supabase/server';
import { pullRequestService } from '@/lib/services/pull-request.service';
import { createLogger } from '@/lib/logger';
import {
  toAppError,
  NotFoundError,
  GitHubTokenMissingError,
  GitHubApiError,
  DatabaseError,
} from '@/lib/errors';

const log = createLogger('API:repositories/[id]/pull-requests/sync');

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();

    // Step 1: Validate auth with getUser() (server-validates the JWT)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      log.warn('Unauthenticated request to POST /api/repositories/[id]/pull-requests/sync');
      return Response.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const { id: repositoryId } = await params;
    if (!repositoryId || typeof repositoryId !== 'string') {
      return Response.json({ error: 'Invalid repository ID.' }, { status: 400 });
    }

    // Step 2: Extract provider_token from the session cookie
    const { data: { session } } = await supabase.auth.getSession();
    const providerToken = session?.provider_token;

    if (!providerToken) {
      log.warn('provider_token missing — user must re-login', { userId: user.id });
      throw new GitHubTokenMissingError();
    }

    // Step 3: Sync pull requests
    log.info('Starting PR sync', { userId: user.id, repositoryId });
    const result = await pullRequestService.syncRepositoryPullRequests(
      user.id,
      repositoryId,
      providerToken,
    );

    log.info('PR sync complete', { userId: user.id, repositoryId, synced: result.synced });
    return Response.json(result, { status: 200 });
  } catch (err) {
    const appErr = toAppError(err);
    log.error('POST /api/repositories/[id]/pull-requests/sync failed', {
      error: appErr.message,
    });

    if (appErr instanceof GitHubTokenMissingError) {
      return Response.json({ error: appErr.message }, { status: 401 });
    }
    if (appErr instanceof NotFoundError) {
      return Response.json({ error: appErr.message }, { status: 404 });
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
