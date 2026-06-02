import type { Repository } from '@/types/database';

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572a5',
  Go: '#00add8',
  Rust: '#dea584',
  Java: '#b07219',
  'C++': '#f34b7d',
  C: '#555555',
  Ruby: '#701516',
  Swift: '#fa7343',
  Kotlin: '#a97bff',
  PHP: '#4f5d95',
  CSS: '#563d7c',
  HTML: '#e34c26',
  Shell: '#89e051',
  Dockerfile: '#384d54',
  Vue: '#41b883',
  Svelte: '#ff3e00',
  Dart: '#00b4ab',
  Scala: '#c22d40',
};

function LanguageDot({ language }: { language: string }) {
  const color = LANGUAGE_COLORS[language] ?? '#8b949e';
  return (
    <span className="flex items-center gap-1.5 text-xs text-zinc-400">
      <span
        className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      {language}
    </span>
  );
}

function VisibilityBadge({ visibility }: { visibility: string }) {
  const isPrivate = visibility === 'private';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
        isPrivate
          ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
          : 'border-blue-500/30 bg-blue-500/10 text-blue-400'
      }`}
    >
      {isPrivate ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      )}
      {visibility}
    </span>
  );
}

function StatPill({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <span className="flex items-center gap-1 text-xs text-zinc-500" aria-label={`${value} ${label}`}>
      {icon}
      {value.toLocaleString()}
    </span>
  );
}

interface RepositoryCardProps {
  repository: Repository;
}

export function RepositoryCard({ repository: repo }: RepositoryCardProps) {
  const pushedAt = repo.pushed_at
    ? new Date(repo.pushed_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <article
      className="group relative flex flex-col gap-3 rounded-xl border border-[#1a2740] bg-[#0C1222] p-4 transition-all duration-200 hover:border-[#1e3a5f] hover:bg-[#0d1526]"
      id={`repo-card-${repo.id}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={repo.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-blue-300 hover:text-blue-200 hover:underline transition-colors truncate"
              aria-label={`Open ${repo.full_name} on GitHub`}
            >
              {repo.name}
            </a>
            <VisibilityBadge visibility={repo.visibility} />
          </div>
          <p className="mt-0.5 text-[11px] text-zinc-600 truncate">{repo.owner}</p>
        </div>

        <a
          href={repo.html_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-0.5 shrink-0 text-zinc-600 transition-colors hover:text-zinc-300"
          aria-label={`View ${repo.name} on GitHub`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </a>
      </div>

      {/* Description */}
      {repo.description && (
        <p className="line-clamp-2 text-xs leading-relaxed text-zinc-400">
          {repo.description}
        </p>
      )}

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-3">
          {repo.language && <LanguageDot language={repo.language} />}

          <StatPill
            label="stars"
            value={repo.stars}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            }
          />

          <StatPill
            label="forks"
            value={repo.forks}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="18" r="3" />
                <circle cx="6" cy="6" r="3" />
                <circle cx="18" cy="6" r="3" />
                <path d="M18 9v2c0 .6-.4 1-1 1H7c-.6 0-1-.4-1-1V9" />
                <line x1="12" y1="12" x2="12" y2="15" />
              </svg>
            }
          />
        </div>

        {pushedAt && (
          <span className="text-[10px] text-zinc-600 shrink-0">
            Updated {pushedAt}
          </span>
        )}
      </div>
    </article>
  );
}
