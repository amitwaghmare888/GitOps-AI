import { createClient } from '@/lib/supabase/server';
import { repositoryAnalysisService } from '@/lib/services/repository-analysis.service';
import { createLogger } from '@/lib/logger';
import { toAppError, NotFoundError, DatabaseError } from '@/lib/errors';

const log = createLogger('API:repositories/[id]/analysis');

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      log.warn('Unauthenticated request to GET /api/repositories/[id]/analysis');
      return Response.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const { id } = await params;

    if (!id || typeof id !== 'string') {
      return Response.json({ error: 'Invalid repository ID.' }, { status: 400 });
    }

    const analysis = await repositoryAnalysisService.getLatestAnalysis(user.id, id);

    log.info('GET /api/repositories/[id]/analysis', {
      userId: user.id,
      repositoryId: id,
      hasAnalysis: analysis !== null,
    });

    return Response.json({ analysis });
  } catch (err) {
    const appErr = toAppError(err);
    log.error('GET /api/repositories/[id]/analysis failed', { error: appErr.message });

    if (appErr instanceof NotFoundError) {
      return Response.json({ error: appErr.message }, { status: 404 });
    }
    if (appErr instanceof DatabaseError) {
      return Response.json({ error: 'Database error. Please try again.' }, { status: 500 });
    }
    return Response.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
