import type { RepositoryAnalysis } from '@/types/analysis';

// ─── Severity badge (findings / risks / recommendations) ─────────────────────

type Level = 'low' | 'medium' | 'high';

const LEVEL_STYLES: Record<Level, string> = {
  low: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
  medium: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  high: 'border-red-500/30 bg-red-500/10 text-red-400',
};

function LevelBadge({ level }: { level: Level }) {
  return (
    <span className={`shrink-0 inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${LEVEL_STYLES[level]}`}>
      {level}
    </span>
  );
}

// ─── Confidence — distinct styling from severity ──────────────────────────────
// Low=gray, Medium=amber, High=green (intentionally different from risk palette)

const CONFIDENCE_COLORS: Record<'low' | 'medium' | 'high', { label: string; cls: string }> = {
  low:    { label: 'Low',    cls: 'text-zinc-400' },
  medium: { label: 'Medium', cls: 'text-amber-400' },
  high:   { label: 'High',   cls: 'text-emerald-400' },
};

// ─── Stage ───────────────────────────────────────────────────────────────────

const STAGE_META: Record<string, { label: string; color: string }> = {
  early:    { label: 'Early Development', color: 'text-purple-400' },
  active:   { label: 'Active Development', color: 'text-emerald-400' },
  inactive: { label: 'Inactive',          color: 'text-amber-400' },
  abandoned:{ label: 'Abandoned',         color: 'text-red-400' },
};

// ─── Health score color ───────────────────────────────────────────────────────

function scoreColor(score: number): string {
  return score >= 80 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-red-400';
}

function scoreRingColor(score: number): string {
  return score >= 80 ? 'stroke-emerald-400' : score >= 50 ? 'stroke-amber-400' : 'stroke-red-400';
}

// ─── Time helper ─────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// ─── Section header ──────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <h3 className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
      {title}
    </h3>
  );
}

// ─── Top metrics row ─────────────────────────────────────────────────────────

function TopMetrics({ analysis }: { analysis: RepositoryAnalysis }) {
  const circumference = 2 * Math.PI * 32;
  const offset = circumference - (analysis.health_score / 100) * circumference;
  const stage = STAGE_META[analysis.stage] ?? STAGE_META.active;
  const confidence = CONFIDENCE_COLORS[analysis.confidence];

  return (
    <div className="grid grid-cols-3 gap-3" id="analysis-metrics-row">

      {/* Health Score */}
      <div className="flex items-center gap-3 rounded-lg border border-[#1a2740] bg-[#070D19] px-4 py-3">
        <div className="relative h-[52px] w-[52px] shrink-0">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle cx="50" cy="50" r="32" fill="none" stroke="currentColor" strokeWidth="8" className="text-zinc-800" />
            <circle cx="50" cy="50" r="32" fill="none" strokeWidth="8" strokeLinecap="round"
              className={scoreRingColor(analysis.health_score)}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-base font-bold tabular-nums ${scoreColor(analysis.health_score)}`}>
              {analysis.health_score}
            </span>
          </div>
        </div>
        <div>
          <p className="text-[10px] text-zinc-500">Health Score</p>
          <p className={`text-sm font-semibold ${scoreColor(analysis.health_score)}`}>
            {analysis.health_score}/100
          </p>
        </div>
      </div>

      {/* Repository Stage */}
      <div className="flex items-center gap-3 rounded-lg border border-[#1a2740] bg-[#070D19] px-4 py-3">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 ${stage.color}`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        </div>
        <div>
          <p className="text-[10px] text-zinc-500">Repository Stage</p>
          <p className={`text-sm font-semibold ${stage.color}`}>{stage.label}</p>
        </div>
      </div>

      {/* Analysis Confidence */}
      <div className="flex items-center gap-3 rounded-lg border border-[#1a2740] bg-[#070D19] px-4 py-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-zinc-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
        </div>
        <div>
          <p className="text-[10px] text-zinc-500">Confidence</p>
          <p className={`text-sm font-semibold ${confidence.cls}`}>{confidence.label}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Evidence grid ────────────────────────────────────────────────────────────

function EvidenceGrid({ analysis }: { analysis: RepositoryAnalysis }) {
  const stage = STAGE_META[analysis.stage] ?? STAGE_META.active;
  const rows = [
    { label: 'Analyzed',       value: timeAgo(analysis.created_at) },
    { label: 'Stage',          value: stage.label },
    { label: 'Model',          value: analysis.model_name },
    { label: 'Prompt Version', value: analysis.prompt_version },
  ];

  return (
    <div className="mt-5 border-t border-[#1a2740] pt-4">
      <SectionHeader title="Evidence" />
      <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {rows.map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-[#1a2740] bg-[#070D19] px-3 py-2">
            <dt className="text-[10px] text-zinc-600">{label}</dt>
            <dd className="mt-0.5 truncate text-[11px] font-medium text-zinc-300" title={value}>{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

// ─── List section ─────────────────────────────────────────────────────────────

type ListItem =
  | { category: string; detail: string; severity: Level }
  | { area: string; description: string; impact: Level }
  | { title: string; description: string; priority: Level };

function getLabel(item: ListItem): string {
  if ('category' in item) return item.category;
  if ('area' in item) return item.area;
  return item.title;
}

function getDetail(item: ListItem): string {
  if ('detail' in item) return item.detail;
  return item.description;
}

function getLevel(item: ListItem): Level {
  if ('severity' in item) return item.severity;
  if ('impact' in item) return item.impact;
  return item.priority;
}

function ListSection({ title, items }: { title: string; items: ListItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-5 border-t border-[#1a2740] pt-4">
      <SectionHeader title={title} />
      <ul className="mt-3 space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2.5 rounded-lg border border-[#1a2740] bg-[#070D19] px-3 py-2.5">
            <LevelBadge level={getLevel(item)} />
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-zinc-300">{getLabel(item)}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-500">{getDetail(item)}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────

interface RepositoryAnalysisCardProps {
  analysis: RepositoryAnalysis | null;
}

export function RepositoryAnalysisCard({ analysis }: RepositoryAnalysisCardProps) {
  if (!analysis) {
    return (
      <div className="rounded-xl border border-dashed border-[#1a2740] bg-[#0C1222] p-8 text-center" id="analysis-empty-state">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/10">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className="text-purple-400" aria-hidden="true">
            <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
          </svg>
        </div>
        <p className="text-sm text-zinc-400">No analysis yet</p>
        <p className="mt-1 text-xs text-zinc-600">
          Click <span className="text-purple-400">Analyze</span> to generate AI-powered repository insights.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#1a2740] bg-[#0C1222] p-5" id="analysis-card">

      {/* 1. Top Metrics */}
      <TopMetrics analysis={analysis} />

      {/* 2. Executive Summary */}
      <div className="mt-5 border-t border-[#1a2740] pt-4">
        <SectionHeader title="Executive Summary" />
        <p className="mt-2 text-xs leading-relaxed text-zinc-400" id="analysis-summary">
          {analysis.summary}
        </p>
      </div>

      {/* 3. Evidence */}
      <EvidenceGrid analysis={analysis} />

      {/* 4. Key Findings */}
      <ListSection title="Key Findings" items={analysis.findings} />

      {/* 5. Risks */}
      <ListSection title="Risks" items={analysis.risks} />

      {/* 6. Recommendations */}
      <ListSection title="Recommendations" items={analysis.recommendations} />

    </div>
  );
}
