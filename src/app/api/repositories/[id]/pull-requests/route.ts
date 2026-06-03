import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { pullRequestService } from '@/lib/services/pull-request.service';
import { createLogger } from '@/lib/logger';
import { toAppError, NotFoundError, DatabaseError } from '@/lib/errors';
import type { NextRequest } from 'next/server';

const log = createLogger('API:repositories/[id]/pull-requests');

const QuerySchema = z.object({
  search: z.string().max(100).optional(),
  state: z.enum(['open', 'closed', 'merged', 'all']).optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      log.warn('Unauthenticated request to GET /api/repositories/[id]/pull-requests');
      return Response.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const { id: repositoryId } = await params;
    if (!repositoryId || typeof repositoryId !== 'string') {
      return Response.json({ error: 'Invalid repository ID.' }, { status: 400 });
    }

    const raw = {
      search: request.nextUrl.searchParams.get('search') ?? undefined,
      state: request.nextUrl.searchParams.get('state') ?? undefined,
      limit: request.nextUrl.searchParams.get('limit') ?? undefined,
      offset: request.nextUrl.searchParams.get('offset') ?? undefined,
    };

    const parsed = QuerySchema.safeParse(raw);
    if (!parsed.success) {
      return Response.json(
        { error: 'Invalid query parameters.', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { data, count } = await pullRequestService.getRepositoryPullRequests(
      user.id,
      repositoryId,
      parsed.data,
    );

    log.info('GET /api/repositories/[id]/pull-requests', {
      repositoryId,
      userId: user.id,
      count,
    });

    return Response.json({ pullRequests: data, total: count });
  } catch (err) {
    const appErr = toAppError(err);
    log.error('GET /api/repositories/[id]/pull-requests failed', { error: appErr.message });

    if (appErr instanceof NotFoundError) {
      return Response.json({ error: appErr.message }, { status: 404 });
    }
    if (appErr instanceof DatabaseError) {
      return Response.json({ error: 'Database error. Please try again.' }, { status: 500 });
    }
    return Response.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
