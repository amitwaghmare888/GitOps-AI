import { RepositoryCard } from '@/components/repositories/RepositoryCard';
import { SyncButton } from '@/components/repositories/SyncButton';
import type { Repository } from '@/types/database';

interface RepositoryListProps {
  repositories: Repository[];
  hasError?: boolean;
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#1a2740] bg-[#0C1222]/50 py-16 px-6 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-[#1a2740] bg-[#070D19]">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-zinc-600"
          aria-hidden="true"
        >
          <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
          <path d="M9 18c-4.51 2-5-2-7-2" />
        </svg>
      </div>
      <h3 className="mb-1.5 text-sm font-semibold text-zinc-300">No repositories synced</h3>
      <p className="mb-5 max-w-xs text-xs leading-relaxed text-zinc-600">
        Click <span className="font-medium text-zinc-400">Sync Repositories</span> to import your GitHub repositories into GitOps AI.
      </p>
      <SyncButton />
    </div>
  );
}

function ErrorState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-red-900/40 bg-red-950/10 py-12 px-6 text-center">
      <p className="text-sm text-red-400">Failed to load repositories. Please refresh the page.</p>
    </div>
  );
}

export function RepositoryList({ repositories, hasError }: RepositoryListProps) {
  if (hasError) return <ErrorState />;
  if (repositories.length === 0) return <EmptyState />;

  return (
    <section aria-label="Repository list">
      <p className="mb-3 text-xs text-zinc-600">
        {repositories.length.toLocaleString()} repositor{repositories.length === 1 ? 'y' : 'ies'}
      </p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {repositories.map((repo) => (
          <RepositoryCard key={repo.id} repository={repo} />
        ))}
      </div>
    </section>
  );
}
