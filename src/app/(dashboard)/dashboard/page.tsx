import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { authService } from '@/lib/services/auth.service';
import { repositoryService } from '@/lib/services/repository.service';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { SyncButton } from '@/components/repositories/SyncButton';
import { RepositorySearch } from '@/components/repositories/RepositorySearch';
import { RepositoryList } from '@/components/repositories/RepositoryList';
import { toAppError } from '@/lib/errors';
import { measure, logTimingTable, type TimingEntry } from '@/lib/perf';
import type { GitHubUserMetadata } from '@/types/auth';
import type { Repository } from '@/types/database';

// ─── Stats card ──────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  accent: string;
}

function StatCard({ label, value, sub, icon, accent }: StatCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-[#1a2740] bg-[#0C1222] px-5 py-4 transition-colors hover:border-[#1e3a5f]">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${accent}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-600">{label}</p>
        <p className="text-xl font-bold text-zinc-100 tabular-nums">{value}</p>
        {sub && <p className="mt-0.5 truncate text-[10px] text-zinc-600">{sub}</p>}
      </div>
    </div>
  );
}

// ─── In-memory stats computation ──────────────────────────────────────────────

function computeStatsFromRepos(allRepos: Repository[]) {
  const totalRepos = allRepos.length;

  const langSet = new Set<string>();
  let lastSyncedAt: string | null = null;
  for (const repo of allRepos) {
    if (repo.language) langSet.add(repo.language);
    if (repo.synced_at && (!lastSyncedAt || repo.synced_at > lastSyncedAt)) {
      lastSyncedAt = repo.synced_at;
    }
  }

  return {
    totalRepos,
    languages: Array.from(langSet).sort(),
    lastSyncedAt,
  };
}

// ─── Client-side filtering ────────────────────────────────────────────────────

interface PageSearchParams {
  search?: string;
  language?: string;
  visibility?: string;
}

function filterRepos(repos: Repository[], filters: PageSearchParams): Repository[] {
  let result = repos;

  if (filters.search) {
    const q = filters.search.toLowerCase();
    result = result.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.full_name.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q)),
    );
  }

  if (filters.language) {
    const lang = filters.language.toLowerCase();
    result = result.filter((r) => r.language && r.language.toLowerCase() === lang);
  }

  if (filters.visibility) {
    result = result.filter((r) => r.visibility === filters.visibility);
  }

  return result;
}

// ─── Data fetching (OPTIMIZED: 1 Supabase query → in-memory stats) ───────────

interface RepoData {
  repositories: Repository[];
  totalRepos: number;
  languages: string[];
  lastSyncedAt: string | null;
  hasError: boolean;
  timings: TimingEntry[];
}

async function fetchRepoData(profileId: string, filters: PageSearchParams): Promise<RepoData> {
  try {
    // OPTIMIZATION: Single query fetches ALL repos (unfiltered).
    // Stats are computed in-memory. Filtering is applied in-memory.
    // This eliminates 3 redundant Supabase roundtrips (count, languages, lastSyncedAt).
    const { result: allRepos, entry: t1 } = await measure(
      'listRepositories (unfiltered)',
      () => repositoryService.listRepositories(profileId),
    );

    const startStats = performance.now();
    const stats = computeStatsFromRepos(allRepos);
    const filteredRepos = filterRepos(allRepos, filters);
    const statsMs = Math.round((performance.now() - startStats) * 100) / 100;
    const t2: TimingEntry = { label: 'in-memory stats+filter', durationMs: statsMs };

    return {
      repositories: filteredRepos,
      totalRepos: stats.totalRepos,
      languages: stats.languages,
      lastSyncedAt: stats.lastSyncedAt,
      hasError: false,
      timings: [t1, t2],
    };
  } catch (err) {
    const appErr = toAppError(err);
    console.error('[DashboardPage] fetchRepoData failed', appErr.message);
    return {
      repositories: [],
      totalRepos: 0,
      languages: [],
      lastSyncedAt: null,
      hasError: true,
      timings: [],
    };
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface DashboardPageProps {
  searchParams: Promise<PageSearchParams>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const allTimings: TimingEntry[] = [];

  const { result: supabase, entry: t0 } = await measure(
    'createClient()',
    () => createClient(),
  );
  allTimings.push(t0);

  const { result: { data: { user } }, entry: t1 } = await measure(
    'auth.getUser() [page]',
    () => supabase.auth.getUser(),
  );
  allTimings.push(t1);

  if (!user) {
    redirect('/login');
  }

  const authUser = authService.getAuthUser({
    id: user.id,
    email: user.email,
    user_metadata: user.user_metadata as GitHubUserMetadata,
  });

  // Await search params (Next.js 16 async searchParams)
  const filters = await searchParams;

  const { result: repoResult, entry: t2 } = await measure(
    'fetchRepoData (total)',
    () => fetchRepoData(user.id, filters),
  );
  allTimings.push(t2);
  allTimings.push(...repoResult.timings);

  const { repositories, totalRepos, languages, lastSyncedAt, hasError } = repoResult;

  logTimingTable('Dashboard Page', allTimings);

  const lastSyncLabel = lastSyncedAt
    ? new Date(lastSyncedAt).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Never';

  return (
    <div className="min-h-screen bg-[#070D19]">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 border-b border-[#1a2740] bg-[#070D19]/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          {/* Logo */}
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

          {/* User + Actions */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              {authUser.avatar_url && (
                <Image
                  src={authUser.avatar_url}
                  alt={`${authUser.github_username}'s avatar`}
                  width={28}
                  height={28}
                  className="h-7 w-7 rounded-full ring-1 ring-white/10"
                  id="user-avatar"
                />
              )}
              <div className="hidden sm:block">
                <p className="text-xs font-medium text-zinc-200" id="user-name">
                  {authUser.github_username}
                </p>
                {authUser.email && (
                  <p className="text-[10px] text-zinc-500" id="user-email">
                    {authUser.email}
                  </p>
                )}
              </div>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* ── Main ───────────────────────────────────────────────────────────── */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* Page title */}
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-zinc-100" id="dashboard-heading">
            Repositories
          </h1>
          <p className="mt-0.5 text-xs text-zinc-600">
            Manage and monitor your GitHub repositories
          </p>
        </div>

        {/* ── Stats bar ────────────────────────────────────────────────────── */}
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <StatCard
            label="Total Repositories"
            value={totalRepos}
            accent="bg-blue-500/10 text-blue-400"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                <path d="M9 18c-4.51 2-5-2-7-2" />
              </svg>
            }
          />
          <StatCard
            label="Languages"
            value={languages.length}
            sub={languages.slice(0, 4).join(', ') || '—'}
            accent="bg-purple-500/10 text-purple-400"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
            }
          />
          <StatCard
            label="Last Synced"
            value={lastSyncLabel}
            accent="bg-emerald-500/10 text-emerald-400"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                <path d="M16 16h5v5" />
              </svg>
            }
          />
        </div>

        {/* ── Toolbar ──────────────────────────────────────────────────────── */}
        <div className="mb-4 flex items-center gap-3">
          <Suspense fallback={<div className="h-9 flex-1 animate-pulse rounded-lg bg-[#0C1222]" />}>
            <RepositorySearch />
          </Suspense>
          <SyncButton />
        </div>

        {/* ── Repository list ───────────────────────────────────────────────── */}
        <RepositoryList repositories={repositories} hasError={hasError} />
      </main>
    </div>
  );
}
