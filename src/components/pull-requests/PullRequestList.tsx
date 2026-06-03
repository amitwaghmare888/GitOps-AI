import Image from 'next/image';
import { SyncPullRequestsButton } from '@/components/pull-requests/SyncPullRequestsButton';
import type { PullRequest } from '@/types/pull-requests';

interface PullRequestListProps {
  repositoryId: string;
  pullRequests: PullRequest[];
  hasError?: boolean;
}

function EmptyState({ repositoryId }: { repositoryId: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#1a2740] bg-[#0C1222]/50 py-16 px-6 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-[#1a2740] bg-[#070D19]">
        {/* Git merge icon */}
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
          <circle cx="18" cy="18" r="3" />
          <circle cx="6" cy="6" r="3" />
          <path d="M13 6h3a2 2 0 0 1 2 2v7" />
          <line x1="6" y1="9" x2="6" y2="21" />
        </svg>
      </div>
      <h3 className="mb-1.5 text-sm font-semibold text-zinc-300">No pull requests found</h3>
      <p className="mb-5 max-w-xs text-xs leading-relaxed text-zinc-600">
        Sync this repository to import its pull requests from GitHub.
      </p>
      <SyncPullRequestsButton repositoryId={repositoryId} />
    </div>
  );
}

function ErrorState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-red-900/40 bg-red-950/10 py-12 px-6 text-center">
      <p className="text-sm text-red-400">Failed to load pull requests. Please refresh the page.</p>
    </div>
  );
}

function PRStateIcon({ state, isMerged, isDraft }: { state: string; isMerged: boolean; isDraft: boolean }) {
  // Merged
  if (isMerged) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-500" aria-label="Merged">
        <circle cx="18" cy="18" r="3" />
        <circle cx="6" cy="6" r="3" />
        <path d="M13 6h3a2 2 0 0 1 2 2v7" />
        <line x1="6" y1="9" x2="6" y2="21" />
      </svg>
    );
  }
  // Closed (not merged)
  if (state === 'closed') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500" aria-label="Closed">
        <circle cx="18" cy="18" r="3" />
        <circle cx="6" cy="6" r="3" />
        <path d="M13 6h3a2 2 0 0 1 2 2v7" />
        <line x1="6" y1="9" x2="6" y2="21" />
      </svg>
    );
  }
  // Draft open
  if (isDraft) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500" aria-label="Draft">
        <circle cx="18" cy="18" r="3" />
        <circle cx="6" cy="6" r="3" />
        <path d="M13 6h3a2 2 0 0 1 2 2v7" />
        <line x1="6" y1="9" x2="6" y2="21" />
      </svg>
    );
  }
  // Open
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500" aria-label="Open">
      <circle cx="18" cy="18" r="3" />
      <circle cx="6" cy="6" r="3" />
      <path d="M13 6h3a2 2 0 0 1 2 2v7" />
      <line x1="6" y1="9" x2="6" y2="21" />
    </svg>
  );
}

export function PullRequestList({ repositoryId, pullRequests, hasError }: PullRequestListProps) {
  if (hasError) return <ErrorState />;
  if (pullRequests.length === 0) return <EmptyState repositoryId={repositoryId} />;

  return (
    <div className="overflow-hidden rounded-xl border border-[#1a2740] bg-[#0C1222]">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-zinc-300">
          <thead className="border-b border-[#1a2740] bg-[#070D19]/50 text-xs text-zinc-500 uppercase tracking-wider">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">Pull Request</th>
              <th scope="col" className="px-4 py-3 font-medium">State</th>
              <th scope="col" className="px-4 py-3 font-medium">Author</th>
              <th scope="col" className="px-4 py-3 font-medium">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1a2740]/50">
            {pullRequests.map((pr) => {
              const updatedAt = new Date(pr.github_updated_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });

              const stateLabel = pr.is_merged
                ? 'Merged'
                : pr.is_draft
                ? 'Draft'
                : pr.state === 'closed'
                ? 'Closed'
                : 'Open';

              const stateLabelColor = pr.is_merged
                ? 'text-purple-400'
                : pr.state === 'closed' && !pr.is_merged
                ? 'text-red-400'
                : pr.is_draft
                ? 'text-zinc-500'
                : 'text-green-400';

              return (
                <tr key={pr.id} className="transition-colors hover:bg-[#1a2740]/20">
                  {/* PR Number + Title */}
                  <td className="px-4 py-3 max-w-[340px]">
                    <div className="flex flex-col gap-1">
                      <a
                        href={pr.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-zinc-200 hover:text-blue-400 hover:underline truncate"
                        title={pr.title}
                      >
                        {pr.title}
                      </a>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-zinc-500">
                          #{pr.pull_request_number}
                        </span>
                        {/* Draft badge */}
                        {pr.is_draft && !pr.is_merged && pr.state === 'open' && (
                          <span className="inline-flex items-center rounded border border-zinc-700/50 bg-zinc-800/40 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">
                            Draft
                          </span>
                        )}
                        {/* Merged badge */}
                        {pr.is_merged && (
                          <span className="inline-flex items-center rounded border border-purple-700/40 bg-purple-900/20 px-1.5 py-0.5 text-[10px] font-medium text-purple-400">
                            Merged
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* State */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <PRStateIcon
                        state={pr.state}
                        isMerged={pr.is_merged}
                        isDraft={pr.is_draft}
                      />
                      <span className={`text-xs capitalize ${stateLabelColor}`}>
                        {stateLabel}
                      </span>
                    </div>
                  </td>

                  {/* Author */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {pr.author_avatar_url ? (
                        <Image
                          src={pr.author_avatar_url}
                          alt={pr.author_login}
                          width={20}
                          height={20}
                          className="rounded-full bg-zinc-800 ring-1 ring-[#1a2740]"
                        />
                      ) : (
                        <div className="h-5 w-5 rounded-full bg-zinc-800 ring-1 ring-[#1a2740]" />
                      )}
                      <span className="text-xs text-zinc-400">{pr.author_login}</span>
                    </div>
                  </td>

                  {/* Updated */}
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-zinc-500">
                    {updatedAt}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
