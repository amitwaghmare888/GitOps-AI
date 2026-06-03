import { Suspense } from 'react';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { repositoryService } from '@/lib/services/repository.service';
import { issueService } from '@/lib/services/issue.service';
import { pullRequestService } from '@/lib/services/pull-request.service';
import { toAppError, NotFoundError } from '@/lib/errors';

import { IssueList } from '@/components/issues/IssueList';
import { IssueFilters } from '@/components/issues/IssueFilters';
import { SyncIssuesButton } from '@/components/issues/SyncIssuesButton';
import { PullRequestList } from '@/components/pull-requests/PullRequestList';
import { PullRequestFilters } from '@/components/pull-requests/PullRequestFilters';
import { SyncPullRequestsButton } from '@/components/pull-requests/SyncPullRequestsButton';

import type { Repository } from '@/types/database';
import type { Issue } from '@/types/issues';
import type { PullRequest } from '@/types/pull-requests';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    tab?: string;
    search?: string;
    state?: string;
    pr_search?: string;
    pr_state?: string;
  }>;
}

// ─── Data Fetching ────────────────────────────────────────────────────────────

async function fetchPageData(
  profileId: string,
  repositoryId: string,
  searchParams: Record<string, string | string[] | undefined>,
) {
  let repo: Repository | null = null;
  let issues: Issue[] = [];
  let totalIssues = 0;
  let pullRequests: PullRequest[] = [];
  let totalPullRequests = 0;
  let hasError = false;

  const scalar = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v;

  try {
    // Ownership is validated inside each service call
    repo = await repositoryService.getRepository(profileId, repositoryId);

    const activeTab = searchParams.tab === 'pull-requests' ? 'pull-requests' : 'issues';

    const [issueResult, prResult] = await Promise.all([
      issueService.getRepositoryIssues(profileId, repositoryId, activeTab === 'issues' ? {
        search: scalar(searchParams.search),
        state: scalar(searchParams.state),
        limit: 100,
      } : { limit: 0 }),
      pullRequestService.getRepositoryPullRequests(profileId, repositoryId, activeTab === 'pull-requests' ? {
        search: scalar(searchParams.pr_search),
        state: scalar(searchParams.pr_state),
        limit: 100,
      } : { limit: 0 }),
    ]);

    issues = issueResult.data;
    totalIssues = issueResult.count;
    pullRequests = prResult.data;
    totalPullRequests = prResult.count;
  } catch (err) {
    const appErr = toAppError(err);
    if (appErr instanceof NotFoundError) {
      return { repo: null, issues: [], totalIssues: 0, pullRequests: [], totalPullRequests: 0, hasError: false };
    }
    hasError = true;
  }

  return { repo, issues, totalIssues, pullRequests, totalPullRequests, hasError };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function RepositoryDetailPage({ params, searchParams }: PageProps) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { id: repositoryId } = await params;
  const filters = await searchParams;

  const { repo, issues, totalIssues, pullRequests, totalPullRequests, hasError } =
    await fetchPageData(user.id, repositoryId, filters);

  if (!repo && !hasError) {
    notFound();
  }

  // Active tab — defaults to 'issues'
  const activeTab = filters.tab === 'pull-requests' ? 'pull-requests' : 'issues';

  return (
    <div className="min-h-screen bg-[#070D19] pb-12">
      {/* ── Breadcrumb Header ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 border-b border-[#1a2740] bg-[#070D19]/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center px-4 sm:px-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
            Dashboard
          </Link>
          <span className="mx-2 text-zinc-600">/</span>
          {repo ? (
            <span className="text-sm font-semibold text-zinc-200">{repo.name}</span>
          ) : (
            <span className="text-sm text-zinc-500">Loading...</span>
          )}
        </div>
      </header>

      {hasError && (
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <div className="rounded-lg bg-red-950/20 border border-red-900/50 p-4">
            <p className="text-sm text-red-400">An error occurred while loading this page.</p>
          </div>
        </div>
      )}

      {repo && (
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          {/* ── Repository Summary ──────────────────────────────────────── */}
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-3">
                {repo.name}
                <span className="rounded border border-[#1a2740] bg-[#0C1222] px-2 py-0.5 text-xs font-medium text-zinc-400">
                  {repo.visibility}
                </span>
              </h1>
              {repo.description && (
                <p className="mt-2 max-w-2xl text-sm text-zinc-400">{repo.description}</p>
              )}
              <div className="mt-4 flex items-center gap-4 text-xs text-zinc-500">
                {repo.language && (
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                    {repo.language}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                  {repo.stars.toLocaleString()} stars
                </span>
                <span className="flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="18" r="3" /><circle cx="6" cy="6" r="3" /><circle cx="18" cy="6" r="3" /><path d="M18 9v2c0 .6-.4 1-1 1H7c-.6 0-1-.4-1-1V9" /><line x1="12" y1="12" x2="12" y2="15" /></svg>
                  {repo.forks.toLocaleString()} forks
                </span>
              </div>
            </div>

            <div className="flex-shrink-0 pt-1">
              <a
                href={repo.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-[#1a2740] bg-[#0C1222] px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-[#2d3a54] hover:bg-[#151e32]"
              >
                View on GitHub
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
              </a>
            </div>
          </div>

          {/* ── Tab Navigation ───────────────────────────────────────────── */}
          <div className="mb-6 border-b border-[#1a2740]">
            <nav className="-mb-px flex gap-1" aria-label="Repository sections">
              <Link
                href={`?tab=issues`}
                className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === 'issues'
                    ? 'border-blue-500 text-zinc-100'
                    : 'border-transparent text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
                }`}
                aria-current={activeTab === 'issues' ? 'page' : undefined}
              >
                {/* Issue circle icon */}
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="2" />
                </svg>
                Issues
                <span className="rounded-full bg-[#1a2740] px-2 py-0.5 text-[10px] font-medium text-zinc-400">
                  {totalIssues.toLocaleString()}
                </span>
              </Link>

              <Link
                href={`?tab=pull-requests`}
                className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === 'pull-requests'
                    ? 'border-blue-500 text-zinc-100'
                    : 'border-transparent text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
                }`}
                aria-current={activeTab === 'pull-requests' ? 'page' : undefined}
              >
                {/* Git merge icon */}
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="18" cy="18" r="3" />
                  <circle cx="6" cy="6" r="3" />
                  <path d="M13 6h3a2 2 0 0 1 2 2v7" />
                  <line x1="6" y1="9" x2="6" y2="21" />
                </svg>
                Pull Requests
                <span className="rounded-full bg-[#1a2740] px-2 py-0.5 text-[10px] font-medium text-zinc-400">
                  {totalPullRequests.toLocaleString()}
                </span>
              </Link>
            </nav>
          </div>

          {/* ── Issues Tab ──────────────────────────────────────────────── */}
          {activeTab === 'issues' && (
            <section aria-label="Issues">
              <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-100">Issues</h2>
                  <p className="mt-1 text-xs text-zinc-500">
                    {totalIssues.toLocaleString()} total imported
                  </p>
                </div>
                <SyncIssuesButton repositoryId={repositoryId} />
              </div>

              <div className="mb-4">
                <Suspense fallback={<div className="h-9 w-full animate-pulse rounded-lg bg-[#0C1222]" />}>
                  <IssueFilters />
                </Suspense>
              </div>

              <IssueList repositoryId={repositoryId} issues={issues} hasError={hasError} />
            </section>
          )}

          {/* ── Pull Requests Tab ────────────────────────────────────────── */}
          {activeTab === 'pull-requests' && (
            <section aria-label="Pull Requests">
              <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-100">Pull Requests</h2>
                  <p className="mt-1 text-xs text-zinc-500">
                    {totalPullRequests.toLocaleString()} total imported
                  </p>
                </div>
                <SyncPullRequestsButton repositoryId={repositoryId} />
              </div>

              <div className="mb-4">
                <Suspense fallback={<div className="h-9 w-full animate-pulse rounded-lg bg-[#0C1222]" />}>
                  <PullRequestFilters />
                </Suspense>
              </div>

              <PullRequestList
                repositoryId={repositoryId}
                pullRequests={pullRequests}
                hasError={hasError}
              />
            </section>
          )}
        </main>
      )}
    </div>
  );
}
