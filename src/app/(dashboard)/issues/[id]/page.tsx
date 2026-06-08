import Link from 'next/link';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { issueService } from '@/lib/services/issue.service';
import { issueAnalysisService } from '@/lib/services/issue-analysis.service';
import { AnalyzeIssueButton } from '@/components/issues/AnalyzeIssueButton';
import { IssueAnalysisCard } from '@/components/issues/IssueAnalysisCard';
import { toAppError, NotFoundError } from '@/lib/errors';
import { createLogger } from '@/lib/logger';

const log = createLogger('IssueDetailPage');

interface IssueDetailPageProps {
  params: Promise<{ id: string }>;
}

function IssueStateLabel({ state }: { state: string }) {
  const isOpen = state === 'open';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
        isOpen
          ? 'border-green-500/30 bg-green-500/10 text-green-400'
          : 'border-purple-500/30 bg-purple-500/10 text-purple-400'
      }`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {isOpen ? (
          <>
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="2" />
          </>
        ) : (
          <>
            <circle cx="12" cy="12" r="10" />
            <path d="m9 12 2 2 4-4" />
          </>
        )}
      </svg>
      {isOpen ? 'Open' : 'Closed'}
    </span>
  );
}

export default async function IssueDetailPage({ params }: IssueDetailPageProps) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { id } = await params;

  let issue;
  try {
    issue = await issueService.getIssue(user.id, id);
  } catch (err) {
    const appErr = toAppError(err);
    if (appErr instanceof NotFoundError) {
      redirect('/dashboard');
    }
    log.error('Failed to load issue', { error: appErr.message });
    redirect('/dashboard');
  }

  // Load latest analysis (non-blocking)
  let latestAnalysis = null;
  try {
    latestAnalysis = await issueAnalysisService.getLatestAnalysis(user.id, id);
  } catch (err) {
    log.error('Failed to load issue analysis', { error: toAppError(err).message });
  }

  const createdAt = new Date(issue.github_created_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  const updatedAt = new Date(issue.github_updated_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  const labelEntries = (issue.labels as { name?: string; color?: string }[])
    .filter((l): l is { name: string; color?: string } => typeof l.name === 'string');

  return (
    <div className="min-h-screen bg-[#070D19]">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 border-b border-[#1a2740] bg-[#070D19]/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-blue-500 to-purple-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
            </div>
            <span className="text-sm font-semibold tracking-tight text-zinc-100">GitOps AI</span>
          </div>
          <Link
            href={`/repositories/${issue.repository_id}`}
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 transition-colors hover:text-zinc-300"
            id="back-to-repository"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m12 19-7-7 7-7" />
              <path d="M19 12H5" />
            </svg>
            Back to Repository
          </Link>
        </div>
      </header>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">

        {/* ── Issue details ────────────────────────────────────────────── */}
        <div className="mb-6 rounded-xl border border-[#1a2740] bg-[#0C1222] p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-lg font-semibold text-zinc-100" id="issue-title">
                  {issue.title}
                </h1>
                <IssueStateLabel state={issue.state} />
              </div>
              <p className="mt-0.5 text-xs text-zinc-600">
                #{issue.issue_number} in {issue.repository_full_name}
              </p>
              {issue.body && (
                <p className="mt-3 text-xs leading-relaxed text-zinc-400 line-clamp-4">
                  {issue.body}
                </p>
              )}
            </div>
            <a
              href={issue.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-zinc-600 transition-colors hover:text-zinc-300"
              aria-label="View on GitHub"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          </div>

          {/* Stats row */}
          <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-[#1a2740] pt-3">
            {/* Author */}
            <span className="flex items-center gap-1.5 text-xs text-zinc-400">
              {issue.author_avatar_url ? (
                <Image
                  src={issue.author_avatar_url}
                  alt={issue.author_login}
                  width={16}
                  height={16}
                  className="rounded-full bg-zinc-800 ring-1 ring-[#1a2740]"
                />
              ) : (
                <span className="inline-block h-4 w-4 rounded-full bg-zinc-800 ring-1 ring-[#1a2740]" />
              )}
              {issue.author_login}
            </span>

            {/* Comments */}
            <span className="flex items-center gap-1 text-xs text-zinc-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              {issue.comments_count} comment{issue.comments_count !== 1 ? 's' : ''}
            </span>

            {/* Labels */}
            {labelEntries.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {labelEntries.slice(0, 5).map((label) => (
                  <span
                    key={label.name}
                    className="inline-flex items-center rounded-full border border-zinc-700/50 bg-zinc-800/30 px-2 py-0.5 text-[10px] text-zinc-400"
                    style={{ borderColor: label.color ? `#${label.color}40` : undefined }}
                  >
                    {label.name}
                  </span>
                ))}
              </div>
            )}

            <span className="text-[10px] text-zinc-600">Created {createdAt}</span>
            <span className="text-[10px] text-zinc-600">Updated {updatedAt}</span>
          </div>
        </div>

        {/* ── Actions row ───────────────────────────────────────────────── */}
        <div className="mb-6 flex flex-wrap items-start gap-3" id="issue-actions">
          <AnalyzeIssueButton issueId={issue.id} />
        </div>

        {/* ── Analysis card ─────────────────────────────────────────────── */}
        <section aria-labelledby="issue-analysis-section-heading">
          <h2 className="mb-3 text-sm font-semibold text-zinc-100" id="issue-analysis-section-heading">
            Issue Intelligence
          </h2>
          <IssueAnalysisCard analysis={latestAnalysis} />
        </section>
      </main>
    </div>
  );
}
