import type { RepositoryRoadmap, RoadmapSprint, RoadmapRisk, RoadmapDependency, RoadmapPriorityItem } from '@/types/roadmap';

// ─── Level badge ────────────────────────────────────────────────────────────

type Level = 'low' | 'medium' | 'high' | 'critical';

const LEVEL_STYLES: Record<Level, string> = {
  low: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
  medium: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  high: 'border-red-500/30 bg-red-500/10 text-red-400',
  critical: 'border-rose-600/30 bg-rose-600/10 text-rose-400',
};

function LevelBadge({ level }: { level: Level }) {
  return (
    <span className={`shrink-0 inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${LEVEL_STYLES[level]}`}>
      {level}
    </span>
  );
}

// ─── Confidence styling ─────────────────────────────────────────────────────

const CONFIDENCE_COLORS: Record<'low' | 'medium' | 'high', { label: string; cls: string }> = {
  low:    { label: 'Low',    cls: 'text-zinc-400' },
  medium: { label: 'Medium', cls: 'text-amber-400' },
  high:   { label: 'High',   cls: 'text-emerald-400' },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h3 className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
      {title}
    </h3>
  );
}

// ─── Coverage color ─────────────────────────────────────────────────────────

function coverageColor(analyzed: number, total: number): string {
  if (total === 0) return 'text-zinc-500';
  const ratio = analyzed / total;
  if (ratio >= 0.7) return 'text-emerald-400';
  if (ratio >= 0.3) return 'text-amber-400';
  return 'text-red-400';
}

// ─── Stats row ──────────────────────────────────────────────────────────────

function StatsRow({ roadmap }: { roadmap: RepositoryRoadmap }) {
  const confidence = CONFIDENCE_COLORS[roadmap.confidence];
  const cvgColor = coverageColor(roadmap.analyzed_issue_count, roadmap.issue_count);

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" id="roadmap-stats-row">
      <div className="rounded-lg border border-[#1a2740] bg-[#070D19] px-3 py-2.5">
        <p className="text-[10px] text-zinc-600">Total Story Points</p>
        <p className="mt-1 text-sm font-bold tabular-nums text-blue-400">{roadmap.total_story_points}</p>
      </div>
      <div className="rounded-lg border border-[#1a2740] bg-[#070D19] px-3 py-2.5">
        <p className="text-[10px] text-zinc-600">Issues Analyzed</p>
        <p className={`mt-1 text-sm font-bold tabular-nums ${cvgColor}`}>
          {roadmap.analyzed_issue_count} / {roadmap.issue_count}
        </p>
      </div>
      <div className="rounded-lg border border-[#1a2740] bg-[#070D19] px-3 py-2.5">
        <p className="text-[10px] text-zinc-600">Sprints</p>
        <p className="mt-1 text-sm font-bold tabular-nums text-purple-400">{roadmap.sprints.length}</p>
      </div>
      <div className="rounded-lg border border-[#1a2740] bg-[#070D19] px-3 py-2.5">
        <p className="text-[10px] text-zinc-600">Confidence</p>
        <p className={`mt-1 text-sm font-semibold ${confidence.cls}`}>{confidence.label}</p>
      </div>
    </div>
  );
}

// ─── Sprint card ────────────────────────────────────────────────────────────

const SPRINT_ACCENT = [
  'border-t-blue-500/50',
  'border-t-purple-500/50',
  'border-t-teal-500/50',
  'border-t-amber-500/50',
  'border-t-rose-500/50',
];

function SprintCard({ sprint, index }: { sprint: RoadmapSprint; index: number }) {
  const accent = SPRINT_ACCENT[index % SPRINT_ACCENT.length];

  return (
    <div className={`rounded-lg border border-[#1a2740] border-t-2 ${accent} bg-[#070D19] p-3`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
          Sprint {index + 1}
        </p>
        <span className="text-[10px] tabular-nums text-zinc-600">
          {sprint.duration_weeks}w · {sprint.story_points}sp
        </span>
      </div>
      <p className="mt-1.5 text-xs font-medium text-zinc-300">{sprint.goal}</p>
      <span className="mt-1 inline-flex items-center rounded-full border border-zinc-700/50 bg-zinc-800/30 px-2 py-0.5 text-[10px] text-zinc-500">
        {sprint.theme}
      </span>

      <ul className="mt-3 space-y-1.5">
        {(sprint.issues ?? []).map((issue, i) => (
          <li key={issue.issue_id || i} className="flex items-center justify-between gap-2 text-[11px]">
            <span className="min-w-0 truncate text-zinc-400">{issue.title}</span>
            <span className="flex shrink-0 items-center gap-1.5">
              <LevelBadge level={issue.priority} />
              <span className="tabular-nums text-zinc-600">{issue.story_points}sp</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Priority order section ─────────────────────────────────────────────────

function PrioritySection({ items }: { items: RoadmapPriorityItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-5 border-t border-[#1a2740] pt-4">
      <SectionHeader title="Recommended Priority Order" />
      <ol className="mt-3 space-y-1.5">
        {items.map((item, i) => (
          <li key={item.issue_id || i} className="flex items-start gap-2 text-[11px] leading-relaxed text-zinc-400">
            <span className="mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded bg-zinc-800 text-[9px] font-medium tabular-nums text-zinc-500">
              {i + 1}
            </span>
            <div className="min-w-0">
              <span className="font-medium text-zinc-300">{item.title}</span>
              <span className="text-zinc-600"> — {item.rationale}</span>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ─── Critical risks section ─────────────────────────────────────────────────

function RisksSection({ risks }: { risks: RoadmapRisk[] }) {
  if (risks.length === 0) return null;
  return (
    <div className="mt-5 border-t border-[#1a2740] pt-4">
      <SectionHeader title="Critical Risks" />
      <ul className="mt-3 space-y-2">
        {risks.map((risk, i) => (
          <li key={i} className="flex items-start gap-2.5 rounded-lg border border-[#1a2740] bg-[#070D19] px-3 py-2.5">
            <LevelBadge level={risk.impact} />
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-zinc-300">{risk.description}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-500">
                <span className="text-emerald-400/80">Mitigation:</span> {risk.mitigation}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Dependencies section ───────────────────────────────────────────────────

function DependenciesSection({ dependencies }: { dependencies: RoadmapDependency[] }) {
  if (dependencies.length === 0) return null;
  return (
    <div className="mt-5 border-t border-[#1a2740] pt-4">
      <SectionHeader title="Dependencies" />
      <ul className="mt-3 space-y-1.5">
        {dependencies.map((dep, i) => (
          <li key={i} className="flex items-start gap-2 text-[11px] text-zinc-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className="mt-0.5 shrink-0 text-zinc-600" aria-hidden="true">
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
            <span>
              <span className="text-zinc-300">{dep.from_issue_title}</span>
              <span className="text-zinc-600"> → </span>
              <span className="text-zinc-300">{dep.to_issue_title}</span>
              <span className="text-zinc-600"> — {dep.reason}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Metadata grid ──────────────────────────────────────────────────────────

function MetadataGrid({ roadmap }: { roadmap: RepositoryRoadmap }) {
  const rows = [
    { label: 'Generated', value: timeAgo(roadmap.created_at) },
    { label: 'Model', value: roadmap.model_name },
    { label: 'Prompt Version', value: roadmap.prompt_version },
    { label: 'Coverage', value: `${roadmap.analyzed_issue_count}/${roadmap.issue_count} issues` },
  ];

  return (
    <div className="mt-5 border-t border-[#1a2740] pt-4">
      <SectionHeader title="Metadata" />
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

// ─── Main component ─────────────────────────────────────────────────────────

interface RoadmapCardProps {
  roadmap: RepositoryRoadmap | null;
}

export function RoadmapCard({ roadmap }: RoadmapCardProps) {
  if (!roadmap) {
    return (
      <div className="rounded-xl border border-dashed border-[#1a2740] bg-[#0C1222] p-8 text-center" id="roadmap-empty-state">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-teal-500/10">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className="text-teal-400" aria-hidden="true">
            <path d="M8 6h10" />
            <path d="M6 12h9" />
            <path d="M11 18h7" />
            <path d="m3 8 2-2-2-2" />
            <path d="m3 14 2-2-2-2" />
            <path d="m3 20 2-2-2-2" />
          </svg>
        </div>
        <p className="text-sm text-zinc-400">No roadmap yet</p>
        <p className="mt-1 text-xs text-zinc-600">
          Click <span className="text-teal-400">Roadmap</span> to generate an AI-powered sprint plan.
        </p>
      </div>
    );
  }

  const sprints = roadmap.sprints ?? [];

  return (
    <div className="rounded-xl border border-[#1a2740] bg-[#0C1222] p-5" id="roadmap-card">

      {/* 1. Stats Row */}
      <StatsRow roadmap={roadmap} />

      {/* 2. Executive Summary */}
      <div className="mt-5 border-t border-[#1a2740] pt-4">
        <SectionHeader title="Executive Summary" />
        <p className="mt-2 text-xs leading-relaxed text-zinc-400" id="roadmap-executive-summary">
          {roadmap.executive_summary}
        </p>
      </div>

      {/* 3. Sprint Cards */}
      {sprints.length > 0 && (
        <div className="mt-5 border-t border-[#1a2740] pt-4">
          <SectionHeader title="Sprints" />
          <div className={`mt-3 grid gap-3 ${sprints.length === 1 ? 'grid-cols-1' : sprints.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-3'}`}>
            {sprints.map((sprint, i) => (
              <SprintCard key={i} sprint={sprint} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* 4. Priority Order */}
      <PrioritySection items={roadmap.priority_order ?? []} />

      {/* 5. Critical Risks */}
      <RisksSection risks={roadmap.critical_risks ?? []} />

      {/* 6. Dependencies */}
      <DependenciesSection dependencies={roadmap.dependencies ?? []} />

      {/* 7. Metadata */}
      <MetadataGrid roadmap={roadmap} />
    </div>
  );
}
