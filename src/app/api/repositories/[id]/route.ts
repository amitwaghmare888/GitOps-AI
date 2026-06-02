import { createClient } from '@/lib/supabase/server';
import { repositoryService } from '@/lib/services/repository.service';
import { createLogger } from '@/lib/logger';
import { toAppError, NotFoundError, DatabaseError } from '@/lib/errors';

const log = createLogger('API:repositories/[id]');

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      log.warn('Unauthenticated request to GET /api/repositories/[id]');
      return Response.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const { id } = await params;

    if (!id || typeof id !== 'string') {
      return Response.json({ error: 'Invalid repository ID.' }, { status: 400 });
    }

    const repository = await repositoryService.getRepository(user.id, id);
    log.info('GET /api/repositories/[id]', { userId: user.id, id });
    return Response.json({ repository });
  } catch (err) {
    const appErr = toAppError(err);
    log.error('GET /api/repositories/[id] failed', { error: appErr.message });

    if (appErr instanceof NotFoundError) {
      return Response.json({ error: appErr.message }, { status: 404 });
    }
    if (appErr instanceof DatabaseError) {
      return Response.json({ error: 'Database error. Please try again.' }, { status: 500 });
    }
    return Response.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
