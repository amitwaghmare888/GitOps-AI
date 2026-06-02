import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { repositoryService } from '@/lib/services/repository.service';
import { createLogger } from '@/lib/logger';
import { toAppError, NotFoundError, DatabaseError } from '@/lib/errors';
import type { NextRequest } from 'next/server';

const log = createLogger('API:repositories');

const QuerySchema = z.object({
  search: z.string().max(100).optional(),
  language: z.string().max(50).optional(),
  visibility: z.enum(['public', 'private', 'internal']).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      log.warn('Unauthenticated request to GET /api/repositories');
      return Response.json({ error: 'Authentication required.' }, { status: 401 });
    }

    // Validate query params
    const raw = {
      search: request.nextUrl.searchParams.get('search') ?? undefined,
      language: request.nextUrl.searchParams.get('language') ?? undefined,
      visibility: request.nextUrl.searchParams.get('visibility') ?? undefined,
    };

    const parsed = QuerySchema.safeParse(raw);
    if (!parsed.success) {
      return Response.json(
        { error: 'Invalid query parameters.', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const repositories = await repositoryService.listRepositories(user.id, parsed.data);
    const total = repositories.length;

    log.info('GET /api/repositories', { userId: user.id, total });
    return Response.json({ repositories, total });
  } catch (err) {
    const appErr = toAppError(err);
    log.error('GET /api/repositories failed', { error: appErr.message });

    if (appErr instanceof NotFoundError) {
      return Response.json({ error: appErr.message }, { status: 404 });
    }
    if (appErr instanceof DatabaseError) {
      return Response.json({ error: 'Database error. Please try again.' }, { status: 500 });
    }
    return Response.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
