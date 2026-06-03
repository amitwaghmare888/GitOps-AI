import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { issueService } from '@/lib/services/issue.service';
import { createLogger } from '@/lib/logger';
import { toAppError, DatabaseError } from '@/lib/errors';
import type { NextRequest } from 'next/server';

const log = createLogger('API:issues');

const QuerySchema = z.object({
  search: z.string().max(100).optional(),
  state: z.enum(['open', 'closed', 'all']).optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      log.warn('Unauthenticated request to GET /api/issues');
      return Response.json({ error: 'Authentication required.' }, { status: 401 });
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

    const { data, count } = await issueService.getUserIssues(user.id, parsed.data);
    log.info('GET /api/issues', { userId: user.id, count });

    return Response.json({ issues: data, total: count });
  } catch (err) {
    const appErr = toAppError(err);
    log.error('GET /api/issues failed', { error: appErr.message });

    if (appErr instanceof DatabaseError) {
      return Response.json({ error: 'Database error. Please try again.' }, { status: 500 });
    }
    return Response.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
