'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface AnalyzeIssueButtonProps {
  issueId: string;
}

export function AnalyzeIssueButton({ issueId }: AnalyzeIssueButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze() {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/issues/${issueId}/analyze`, { method: 'POST' });
      const body = await res.json();

      if (!res.ok) {
        setError(body.error ?? 'Analysis failed.');
        return;
      }

      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <button
        type="button"
        onClick={handleAnalyze}
        disabled={isLoading}
        className="inline-flex items-center gap-2 rounded-lg border border-purple-500/30 bg-purple-500/10 px-3.5 py-2 text-xs font-medium text-purple-400 transition-all hover:border-purple-500/50 hover:bg-purple-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        id="analyze-issue-btn"
      >
        {isLoading ? (
          <>
            <svg className="h-3.5 w-3.5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Analyzing...
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
            </svg>
            Analyze Issue
          </>
        )}
      </button>
      {error && (
        <p className="text-[11px] text-red-400" role="alert">{error}</p>
      )}
    </div>
  );
}
