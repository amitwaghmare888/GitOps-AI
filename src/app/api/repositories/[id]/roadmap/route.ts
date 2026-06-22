import { createClient } from '@/lib/supabase/server';
import { roadmapService } from '@/lib/services/roadmap.service';
import { createLogger } from '@/lib/logger';
import { toAppError, NotFoundError, DatabaseError } from '@/lib/errors';

const log = createLogger('API:repositories/[id]/roadmap');

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      log.warn('Unauthenticated request to GET /api/repositories/[id]/roadmap');
      return Response.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const { id } = await params;

    if (!id || typeof id !== 'string') {
      return Response.json({ error: 'Invalid repository ID.' }, { status: 400 });
    }

    const roadmap = await roadmapService.getLatestRoadmap(user.id, id);

    log.info('GET /api/repositories/[id]/roadmap', {
      userId: user.id,
      repositoryId: id,
      hasRoadmap: roadmap !== null,
    });

    return Response.json({ roadmap });
  } catch (err) {
    const appErr = toAppError(err);
    log.error('GET /api/repositories/[id]/roadmap failed', { error: appErr.message });

    if (appErr instanceof NotFoundError) {
      return Response.json({ error: appErr.message }, { status: 404 });
    }
    if (appErr instanceof DatabaseError) {
      return Response.json({ error: 'Database error. Please try again.' }, { status: 500 });
    }
    return Response.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
