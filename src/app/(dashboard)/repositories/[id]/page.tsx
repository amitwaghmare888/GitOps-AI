import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { repositoryService } from '@/lib/services/repository.service';
import { repositoryAnalysisService } from '@/lib/services/repository-analysis.service';
import { issueService } from '@/lib/services/issue.service';
import { roadmapService } from '@/lib/services/roadmap.service';
import { issueAnalysisRepository } from '@/lib/repositories/issue-analysis.repository';
import { SyncIssuesButton } from '@/components/issues/SyncIssuesButton';
import { SyncPullRequestsButton } from '@/components/pull-requests/SyncPullRequestsButton';
import { AnalyzeRepositoryButton } from '@/components/repositories/AnalyzeRepositoryButton';
import { GenerateRoadmapButton } from '@/components/repositories/GenerateRoadmapButton';
import { RepositoryAnalysisCard } from '@/components/repositories/RepositoryAnalysisCard';
import { RoadmapCard } from '@/components/repositories/RoadmapCard';
import { IssueList } from '@/components/issues/IssueList';
import { toAppError, NotFoundError } from '@/lib/errors';
import { createLogger } from '@/lib/logger';

const log = createLogger('RepositoryDetailPage');

interface RepositoryDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function RepositoryDetailPage({ params }: RepositoryDetailPageProps) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { id } = await params;

  let repository;
  try {
    repository = await repositoryService.getRepository(user.id, id);
  } catch (err) {
    const appErr = toAppError(err);
    if (appErr instanceof NotFoundError) {
      redirect('/dashboard');
    }
    log.error('Failed to load repository', { error: appErr.message });
    redirect('/dashboard');
  }

  // Load latest analysis, issues, and roadmap in parallel (non-blocking — page still renders if any fail)
  let latestAnalysis = null;
  let issues: import('@/types/issues').Issue[] = [];
  let issuesError = false;
  let latestRoadmap = null;
  let hasIssueAnalyses = false;

  try {
    const [analysisResult, issuesResult, roadmapResult] = await Promise.allSettled([
      repositoryAnalysisService.getLatestAnalysis(user.id, id),
      issueService.getRepositoryIssues(user.id, id, { limit: 50 }),
      roadmapService.getLatestRoadmap(user.id, id),
    ]);

    if (analysisResult.status === 'fulfilled') {
      latestAnalysis = analysisResult.value;
    } else {
      log.error('Failed to load analysis', { error: toAppError(analysisResult.reason).message });
    }

    if (issuesResult.status === 'fulfilled') {
      issues = issuesResult.value.data;
    } else {
      log.error('Failed to load issues', { error: toAppError(issuesResult.reason).message });
      issuesError = true;
    }

    if (roadmapResult.status === 'fulfilled') {
      latestRoadmap = roadmapResult.value;
    } else {
      log.error('Failed to load roadmap', { error: toAppError(roadmapResult.reason).message });
    }

    // Check if any issue analyses exist (for GenerateRoadmapButton warning)
    if (issues.length > 0) {
      try {
        const issueIds = issues.slice(0, 5).map((i) => i.id);
        const analyses = await issueAnalysisRepository.getLatestForIssues(issueIds);
        hasIssueAnalyses = analyses.length > 0;
      } catch {
        // Non-critical — button will just show warning
      }
    }
  } catch (err) {
    log.error('Failed to load page data', { error: toAppError(err).message });
  }

  const pushedAt = repository.pushed_at
    ? new Date(repository.pushed_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <div className="min-h-screen bg-[#070D19]">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 border-b border-[#1a2740] bg-[#070D19]/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-blue-500 to-purple-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
            </div>
            <span className="text-sm font-semibold tracking-tight text-zinc-100">GitOps AI</span>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 transition-colors hover:text-zinc-300"
            id="back-to-dashboard"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m12 19-7-7 7-7" />
              <path d="M19 12H5" />
            </svg>
            Back to Dashboard
          </Link>
        </div>
      </header>

      {/* ── Main ──────────────────────────────────────────────────────────── */}
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        {/* ── Repository details ──────────────────────────────────────────── */}
        <div className="mb-6 rounded-xl border border-[#1a2740] bg-[#0C1222] p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-lg font-semibold text-zinc-100" id="repo-name">
                  {repository.name}
                </h1>
                <span
                  className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                    repository.visibility === 'private'
                      ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                      : 'border-blue-500/30 bg-blue-500/10 text-blue-400'
                  }`}
                >
                  {repository.visibility}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-zinc-600">{repository.full_name}</p>
              {repository.description && (
                <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                  {repository.description}
                </p>
              )}
            </div>
            <a
              href={repository.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-zinc-600 transition-colors hover:text-zinc-300"
              aria-label="View on GitHub"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          </div>

          {/* Stats row */}
          <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-[#1a2740] pt-3">
            {repository.language && (
              <span className="flex items-center gap-1.5 text-xs text-zinc-400">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-400" aria-hidden="true" />
                {repository.language}
              </span>
            )}
            <span className="flex items-center gap-1 text-xs text-zinc-500" aria-label={`${repository.stars} stars`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              {repository.stars.toLocaleString()}
            </span>
            <span className="flex items-center gap-1 text-xs text-zinc-500" aria-label={`${repository.forks} forks`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="18" r="3" />
                <circle cx="6" cy="6" r="3" />
                <circle cx="18" cy="6" r="3" />
                <path d="M18 9v2c0 .6-.4 1-1 1H7c-.6 0-1-.4-1-1V9" />
                <line x1="12" y1="12" x2="12" y2="15" />
              </svg>
              {repository.forks.toLocaleString()}
            </span>
            <span className="flex items-center gap-1 text-xs text-zinc-500" aria-label={`${repository.open_issues_count} open issues`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {repository.open_issues_count.toLocaleString()} issues
            </span>
            {pushedAt && (
              <span className="text-[10px] text-zinc-600">
                Last pushed {pushedAt}
              </span>
            )}
          </div>
        </div>

        {/* ── Actions row ─────────────────────────────────────────────────── */}
        <div className="mb-6 flex flex-wrap items-start gap-3" id="repo-actions">
          <SyncIssuesButton repositoryId={repository.id} />
          <SyncPullRequestsButton repositoryId={repository.id} />
          <AnalyzeRepositoryButton repositoryId={repository.id} />
          <GenerateRoadmapButton repositoryId={repository.id} hasIssueAnalyses={hasIssueAnalyses} />
        </div>

        {/* ── Analysis card ───────────────────────────────────────────────── */}
        <section aria-labelledby="analysis-section-heading">
          <h2 className="mb-3 text-sm font-semibold text-zinc-100" id="analysis-section-heading">
            AI Analysis
          </h2>
          <RepositoryAnalysisCard analysis={latestAnalysis} />
        </section>

        {/* ── Roadmap ───────────────────────────────────────────────────── */}
        <section aria-labelledby="roadmap-section-heading" className="mt-8" id="roadmap-section">
          <h2 className="mb-3 text-sm font-semibold text-zinc-100" id="roadmap-section-heading">
            Roadmap
          </h2>
          <RoadmapCard roadmap={latestRoadmap} />
        </section>

        {/* ── Issues ───────────────────────────────────────────────────── */}
        <section aria-labelledby="issues-section-heading" className="mt-8">
          <h2 className="mb-3 text-sm font-semibold text-zinc-100" id="issues-section-heading">
            Issues
          </h2>
          <IssueList repositoryId={repository.id} issues={issues} hasError={issuesError} />
        </section>
      </main>
    </div>
  );
}
