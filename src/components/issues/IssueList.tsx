import Image from 'next/image';
import { SyncIssuesButton } from '@/components/issues/SyncIssuesButton';
import type { Issue } from '@/types/issues';

interface IssueListProps {
  repositoryId: string;
  issues: Issue[];
  hasError?: boolean;
}

function EmptyState({ repositoryId }: { repositoryId: string }) {
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
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h3 className="mb-1.5 text-sm font-semibold text-zinc-300">No issues found</h3>
      <p className="mb-5 max-w-xs text-xs leading-relaxed text-zinc-600">
        Sync this repository to import its issues and pull requests into GitOps AI.
      </p>
      <SyncIssuesButton repositoryId={repositoryId} />
    </div>
  );
}

function ErrorState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-red-900/40 bg-red-950/10 py-12 px-6 text-center">
      <p className="text-sm text-red-400">Failed to load issues. Please refresh the page.</p>
    </div>
  );
}

function IssueStateIcon({ state, isPullRequest }: { state: string; isPullRequest: boolean }) {
  if (isPullRequest) {
    if (state === 'closed') {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-500" aria-label="Merged PR">
          <circle cx="18" cy="18" r="3" />
          <circle cx="6" cy="6" r="3" />
          <path d="M13 6h3a2 2 0 0 1 2 2v7" />
          <line x1="6" y1="9" x2="6" y2="21" />
        </svg>
      );
    }
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500" aria-label="Open PR">
        <circle cx="18" cy="18" r="3" />
        <circle cx="6" cy="6" r="3" />
        <path d="M13 6h3a2 2 0 0 1 2 2v7" />
        <line x1="6" y1="9" x2="6" y2="21" />
      </svg>
    );
  }

  if (state === 'closed') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-500" aria-label="Closed issue">
        <circle cx="12" cy="12" r="10" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    );
  }

  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500" aria-label="Open issue">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

export function IssueList({ repositoryId, issues, hasError }: IssueListProps) {
  if (hasError) return <ErrorState />;
  if (issues.length === 0) return <EmptyState repositoryId={repositoryId} />;

  return (
    <div className="overflow-hidden rounded-xl border border-[#1a2740] bg-[#0C1222]">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-zinc-300">
          <thead className="border-b border-[#1a2740] bg-[#070D19]/50 text-xs text-zinc-500 uppercase tracking-wider">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">Issue</th>
              <th scope="col" className="px-4 py-3 font-medium">Status</th>
              <th scope="col" className="px-4 py-3 font-medium">Labels</th>
              <th scope="col" className="px-4 py-3 font-medium">Author</th>
              <th scope="col" className="px-4 py-3 font-medium">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1a2740]/50">
            {issues.map((issue) => {
              const updatedAt = new Date(issue.github_updated_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });

              return (
                <tr key={issue.id} className="transition-colors hover:bg-[#1a2740]/20">
                  <td className="px-4 py-3 max-w-[300px]">
                    <div className="flex flex-col gap-1">
                      <a
                        href={issue.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-zinc-200 hover:text-blue-400 hover:underline truncate"
                        title={issue.title}
                      >
                        {issue.title}
                      </a>
                      <span className="text-[11px] text-zinc-500">
                        #{issue.issue_number}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <IssueStateIcon state={issue.state} isPullRequest={issue.is_pull_request} />
                      <span className="text-xs capitalize text-zinc-400">
                        {issue.is_pull_request ? 'PR' : 'Issue'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {issue.labels.slice(0, 3).map((label: Record<string, unknown>) => (
                        <span
                          key={String(label.id)}
                          className="inline-flex items-center rounded-full border border-zinc-700/50 bg-zinc-800/30 px-2 py-0.5 text-[10px] text-zinc-400"
                          style={{ borderColor: label.color ? `#${String(label.color)}40` : undefined }}
                        >
                          {String(label.name ?? '')}
                        </span>
                      ))}
                      {issue.labels.length > 3 && (
                        <span className="inline-flex items-center rounded-full border border-zinc-700/50 bg-zinc-800/30 px-2 py-0.5 text-[10px] text-zinc-500">
                          +{issue.labels.length - 3}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {issue.author_avatar_url ? (
                        <Image
                          src={issue.author_avatar_url}
                          alt={issue.author_login}
                          width={20}
                          height={20}
                          className="rounded-full bg-zinc-800 ring-1 ring-[#1a2740]"
                        />
                      ) : (
                        <div className="h-5 w-5 rounded-full bg-zinc-800 ring-1 ring-[#1a2740]" />
                      )}
                      <span className="text-xs text-zinc-400">{issue.author_login}</span>
                    </div>
                  </td>
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
