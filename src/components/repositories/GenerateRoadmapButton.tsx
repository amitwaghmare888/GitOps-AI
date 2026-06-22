'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface GenerateRoadmapButtonProps {
  repositoryId: string;
  hasIssueAnalyses: boolean;
  className?: string;
}

export function GenerateRoadmapButton({
  repositoryId,
  hasIssueAnalyses,
  className,
}: GenerateRoadmapButtonProps) {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    setState('loading');
    setMessage(null);

    try {
      const res = await fetch(`/api/repositories/${repositoryId}/roadmap/generate`, {
        method: 'POST',
      });
      const data: { roadmap?: { confidence?: string }; error?: string } = await res.json();

      if (!res.ok) {
        setState('error');
        setMessage(data.error ?? 'Roadmap generation failed. Please try again.');
        return;
      }

      setState('success');
      setMessage(
        data.roadmap?.confidence
          ? `Roadmap generated — Confidence: ${data.roadmap.confidence}`
          : 'Roadmap generated.',
      );

      router.refresh();

      setTimeout(() => {
        setState('idle');
        setMessage(null);
      }, 5000);
    } catch {
      setState('error');
      setMessage('Network error. Please check your connection.');
    }
  }, [router, repositoryId]);

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        id="generate-roadmap-button"
        onClick={handleGenerate}
        disabled={state === 'loading'}
        className={`inline-flex items-center gap-2 rounded-lg border border-teal-500/30 bg-teal-500/10 px-4 py-2 text-sm font-medium text-teal-300 transition-all duration-200 hover:border-teal-500/50 hover:bg-teal-500/20 hover:text-teal-200 focus:outline-none focus:ring-2 focus:ring-teal-500/40 disabled:cursor-not-allowed disabled:opacity-50 ${className ?? ''}`}
        aria-label="Generate AI-powered roadmap"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={state === 'loading' ? 'animate-pulse' : ''}
        >
          <path d="M8 6h10" />
          <path d="M6 12h9" />
          <path d="M11 18h7" />
          <path d="m3 8 2-2-2-2" />
          <path d="m3 14 2-2-2-2" />
          <path d="m3 20 2-2-2-2" />
        </svg>
        {state === 'loading' ? 'Generating…' : 'Roadmap'}
      </button>

      {!hasIssueAnalyses && state === 'idle' && (
        <p className="text-[10px] text-amber-400/80">
          Analyze issues first for best results.
        </p>
      )}

      {message && (
        <p
          className={`text-xs ${state === 'error' ? 'text-red-400' : 'text-emerald-400'}`}
          role="status"
        >
          {message}
        </p>
      )}
    </div>
  );
}
