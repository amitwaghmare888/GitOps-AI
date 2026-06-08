import type { IssueAnalysis, IssueAnalysisEvidence } from '@/types/issue-analysis';

// ─── Level badge ────────────────────────────────────────────────────────────

type Level = 'low' | 'medium' | 'high' | 'critical' | 'trivial';

const LEVEL_STYLES: Record<Level, string> = {
  trivial: 'border-zinc-500/30 bg-zinc-500/10 text-zinc-400',
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

// ─── Category labels ─────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  bug: 'Bug', feature: 'Feature', refactor: 'Refactor',
  security: 'Security', documentation: 'Docs', ci_cd: 'CI/CD',
  testing: 'Testing', performance: 'Perf', devops: 'DevOps',
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

// ─── Scorecard cell ──────────────────────────────────────────────────────────

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[#1a2740] bg-[#070D19] px-3 py-2.5">
      <p className="text-[10px] text-zinc-600">{label}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}

// ─── Engineering Scorecard (category · sp · priority · complexity · risk · confidence) ──

function Scorecard({ analysis }: { analysis: IssueAnalysis }) {
  const confidence = CONFIDENCE_COLORS[analysis.confidence];
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6" id="issue-analysis-metrics-row">
      <Cell label="Category">
        <span className="text-xs font-semibold text-purple-400">
          {CATEGORY_LABELS[analysis.category] ?? analysis.category}
        </span>
      </Cell>
      <Cell label="Story Points">
        <span className="text-sm font-bold tabular-nums text-blue-400">{analysis.story_points}</span>
      </Cell>
      <Cell label="Priority">
        <LevelBadge level={analysis.priority} />
      </Cell>
      <Cell label="Complexity">
        <LevelBadge level={analysis.complexity} />
      </Cell>
      <Cell label="Risk">
        <LevelBadge level={analysis.risk} />
      </Cell>
      <Cell label="Confidence">
        <span className={`text-xs font-semibold ${confidence.cls}`}>{confidence.label}</span>
      </Cell>
    </div>
  );
}

// ─── Checklist section (implementation steps / acceptance criteria) ──────────

function ChecklistSection({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-5 border-t border-[#1a2740] pt-4">
      <SectionHeader title={title} />
      <ol className="mt-3 space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-[11px] leading-relaxed text-zinc-400">
            <span className="mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded bg-zinc-800 text-[9px] font-medium tabular-nums text-zinc-500">{i + 1}</span>
            {item}
          </li>
        ))}
      </ol>
    </div>
  );
}

// ─── Tag list section (affected areas / blockers) ───────────────────────────

function TagSection({ title, items, color }: { title: string; items: string[]; color: string }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-5 border-t border-[#1a2740] pt-4">
      <SectionHeader title={title} />
      <div className="mt-3 flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span key={item} className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${color}`}>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Evidence section ───────────────────────────────────────────────────────

const SOURCE_STYLES: Record<string, string> = {
  title:    'border-blue-500/20 bg-blue-500/5 text-blue-400',
  body:     'border-purple-500/20 bg-purple-500/5 text-purple-400',
  labels:   'border-amber-500/20 bg-amber-500/5 text-amber-400',
  comments: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400',
  metadata: 'border-zinc-500/20 bg-zinc-500/5 text-zinc-400',
};

function EvidenceSection({ evidence }: { evidence: IssueAnalysisEvidence[] }) {
  if (evidence.length === 0) return null;
  return (
    <div className="mt-5 border-t border-[#1a2740] pt-4">
      <SectionHeader title="Evidence" />
      <ul className="mt-3 space-y-2">
        {evidence.map((item, i) => (
          <li key={i} className="flex items-start gap-2.5 rounded-lg border border-[#1a2740] bg-[#070D19] px-3 py-2.5">
            <span className={`shrink-0 inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${SOURCE_STYLES[item.source] ?? SOURCE_STYLES.metadata}`}>
              {item.source}
            </span>
            <p className="min-w-0 text-[11px] leading-relaxed text-zinc-400">
              &ldquo;{item.text}&rdquo;
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Metadata grid ──────────────────────────────────────────────────────────

function MetadataGrid({ analysis }: { analysis: IssueAnalysis }) {
  const confidence = CONFIDENCE_COLORS[analysis.confidence];
  const rows = [
    { label: 'Analyzed',       value: timeAgo(analysis.created_at) },
    { label: 'Confidence',     value: confidence.label, cls: confidence.cls },
    { label: 'Model',          value: analysis.model_name },
    { label: 'Prompt Version', value: analysis.prompt_version },
  ];

  return (
    <div className="mt-5 border-t border-[#1a2740] pt-4">
      <SectionHeader title="Metadata" />
      <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {rows.map(({ label, value, cls }) => (
          <div key={label} className="rounded-lg border border-[#1a2740] bg-[#070D19] px-3 py-2">
            <dt className="text-[10px] text-zinc-600">{label}</dt>
            <dd className={`mt-0.5 truncate text-[11px] font-medium ${cls ?? 'text-zinc-300'}`} title={value}>{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

interface IssueAnalysisCardProps {
  analysis: IssueAnalysis | null;
}

export function IssueAnalysisCard({ analysis }: IssueAnalysisCardProps) {
  if (!analysis) {
    return (
      <div className="rounded-xl border border-dashed border-[#1a2740] bg-[#0C1222] p-8 text-center" id="issue-analysis-empty-state">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/10">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className="text-purple-400" aria-hidden="true">
            <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
          </svg>
        </div>
        <p className="text-sm text-zinc-400">No analysis yet</p>
        <p className="mt-1 text-xs text-zinc-600">
          Click <span className="text-purple-400">Analyze Issue</span> to generate AI-powered intelligence.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#1a2740] bg-[#0C1222] p-5" id="issue-analysis-card">

      {/* 1. Engineering Scorecard */}
      <Scorecard analysis={analysis} />

      {/* 2. Summary */}
      <div className="mt-5 border-t border-[#1a2740] pt-4">
        <SectionHeader title="Summary" />
        <p className="mt-2 text-xs leading-relaxed text-zinc-400" id="issue-analysis-summary">
          {analysis.summary}
        </p>
      </div>

      {/* 3. Root Cause */}
      <div className="mt-5 border-t border-[#1a2740] pt-4">
        <SectionHeader title="Root Cause" />
        <p className="mt-2 text-xs leading-relaxed text-zinc-400">
          {analysis.root_cause}
        </p>
      </div>

      {/* 4. Suggested Fix */}
      <div className="mt-5 border-t border-[#1a2740] pt-4">
        <SectionHeader title="Suggested Fix" />
        <p className="mt-2 text-xs leading-relaxed text-zinc-400">
          {analysis.suggested_fix}
        </p>
      </div>

      {/* 5. Implementation Steps */}
      <ChecklistSection title="Implementation Steps" items={analysis.implementation_steps} />

      {/* 6. Acceptance Criteria */}
      <ChecklistSection title="Acceptance Criteria" items={analysis.acceptance_criteria} />

      {/* 7. Affected Areas */}
      <TagSection
        title="Affected Areas"
        items={analysis.affected_areas}
        color="border-blue-500/20 bg-blue-500/5 text-blue-400"
      />

      {/* 8. Blockers */}
      <TagSection
        title="Blockers"
        items={analysis.blockers}
        color="border-red-500/20 bg-red-500/5 text-red-400"
      />

      {/* 9. Evidence */}
      <EvidenceSection evidence={analysis.evidence} />

      {/* 10. Labels Analyzed */}
      {analysis.labels_used.length > 0 && (
        <div className="mt-5 border-t border-[#1a2740] pt-4">
          <SectionHeader title="Labels Analyzed" />
          <div className="mt-3 flex flex-wrap gap-1.5">
            {analysis.labels_used.map((label) => (
              <span key={label} className="inline-flex items-center rounded-full border border-zinc-700/50 bg-zinc-800/30 px-2 py-0.5 text-[10px] text-zinc-400">
                {label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 11. Metadata */}
      <MetadataGrid analysis={analysis} />
    </div>
  );
}
