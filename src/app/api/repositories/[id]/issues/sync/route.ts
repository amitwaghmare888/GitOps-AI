import { createClient } from '@/lib/supabase/server';
import { issueService } from '@/lib/services/issue.service';
import { createLogger } from '@/lib/logger';
import {
  toAppError,
  GitHubTokenMissingError,
  GitHubApiError,
  DatabaseError,
  NotFoundError,
} from '@/lib/errors';
import type { NextRequest } from 'next/server';

const log = createLogger('API:repositories/[id]/issues/sync');

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();

    // 1. Validate auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      log.warn('Unauthenticated request to POST /api/repositories/[id]/issues/sync');
      return Response.json({ error: 'Authentication required.' }, { status: 401 });
    }

    // 2. Validate route param
    const { id: repositoryId } = await params;
    if (!repositoryId || typeof repositoryId !== 'string') {
      return Response.json({ error: 'Invalid repository ID.' }, { status: 400 });
    }

    // 3. Extract provider_token
    const { data: { session } } = await supabase.auth.getSession();
    const providerToken = session?.provider_token;

    if (!providerToken) {
      log.warn('provider_token missing — user must re-login', { userId: user.id });
      throw new GitHubTokenMissingError();
    }

    // 4. Sync issues
    log.info('Starting repository issue sync', { userId: user.id, repositoryId });
    const result = await issueService.syncRepositoryIssues(user.id, repositoryId, providerToken);

    log.info('Sync complete', { userId: user.id, repositoryId, synced: result.synced });
    return Response.json(result, { status: 200 });
  } catch (err) {
    const appErr = toAppError(err);
    log.error('POST /api/repositories/[id]/issues/sync failed', { error: appErr.message });

    if (appErr instanceof NotFoundError) {
      return Response.json({ error: appErr.message }, { status: 404 });
    }
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
