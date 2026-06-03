'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface AnalyzeRepositoryButtonProps {
  repositoryId: string;
  className?: string;
}

export function AnalyzeRepositoryButton({ repositoryId, className }: AnalyzeRepositoryButtonProps) {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const handleAnalyze = useCallback(async () => {
    setState('loading');
    setMessage(null);

    try {
      const res = await fetch(`/api/repositories/${repositoryId}/analyze`, { method: 'POST' });
      const data: { analysis?: { health_score?: number }; error?: string } = await res.json();

      if (!res.ok) {
        setState('error');
        setMessage(data.error ?? 'Analysis failed. Please try again.');
        return;
      }

      setState('success');
      setMessage(
        data.analysis?.health_score !== undefined
          ? `Analysis complete — Health Score: ${data.analysis.health_score}/100`
          : 'Analysis complete.',
      );

      // Refresh server data without full page reload
      router.refresh();

      // Auto-reset after 5 seconds
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
        id="analyze-repository-button"
        onClick={handleAnalyze}
        disabled={state === 'loading'}
        className={`inline-flex items-center gap-2 rounded-lg border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-sm font-medium text-purple-300 transition-all duration-200 hover:border-purple-500/50 hover:bg-purple-500/20 hover:text-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500/40 disabled:cursor-not-allowed disabled:opacity-50 ${className ?? ''}`}
        aria-label="Analyze repository with AI"
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
          <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
        </svg>
        {state === 'loading' ? 'Analyzing…' : 'Analyze'}
      </button>

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
