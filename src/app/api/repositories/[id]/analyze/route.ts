import { createClient } from '@/lib/supabase/server';
import { repositoryAnalysisService } from '@/lib/services/repository-analysis.service';
import { createLogger } from '@/lib/logger';
import { toAppError, NotFoundError, DatabaseError, AIAnalysisError } from '@/lib/errors';

const log = createLogger('API:repositories/[id]/analyze');

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      log.warn('Unauthenticated request to POST /api/repositories/[id]/analyze');
      return Response.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const { id } = await params;

    if (!id || typeof id !== 'string') {
      return Response.json({ error: 'Invalid repository ID.' }, { status: 400 });
    }

    const analysis = await repositoryAnalysisService.analyzeRepository(user.id, id);

    log.info('POST /api/repositories/[id]/analyze', {
      userId: user.id,
      repositoryId: id,
      analysisId: analysis.id,
      healthScore: analysis.health_score,
    });

    return Response.json({ analysis });
  } catch (err) {
    const appErr = toAppError(err);
    log.error('POST /api/repositories/[id]/analyze failed', { error: appErr.message });

    if (appErr instanceof NotFoundError) {
      return Response.json({ error: appErr.message }, { status: 404 });
    }
    if (appErr instanceof AIAnalysisError) {
      return Response.json({ error: appErr.message }, { status: 502 });
    }
    if (appErr instanceof DatabaseError) {
      return Response.json({ error: 'Database error. Please try again.' }, { status: 500 });
    }
    return Response.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
