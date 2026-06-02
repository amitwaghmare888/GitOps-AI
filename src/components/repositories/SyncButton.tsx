'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface SyncButtonProps {
  className?: string;
}

export function SyncButton({ className }: SyncButtonProps) {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const handleSync = useCallback(async () => {
    setState('loading');
    setMessage(null);

    try {
      const res = await fetch('/api/repositories/sync', { method: 'POST' });
      const data: { synced?: number; message?: string; error?: string } = await res.json();

      if (!res.ok) {
        setState('error');
        setMessage(data.error ?? 'Sync failed. Please try again.');
        return;
      }

      setState('success');
      setMessage(data.message ?? `Synced ${data.synced ?? 0} repositories.`);
      // Refresh server data without full page reload
      router.refresh();

      // Auto-reset after 4 seconds
      setTimeout(() => {
        setState('idle');
        setMessage(null);
      }, 4000);
    } catch {
      setState('error');
      setMessage('Network error. Please check your connection.');
    }
  }, [router]);

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        id="sync-repositories-button"
        onClick={handleSync}
        disabled={state === 'loading'}
        className={`inline-flex items-center gap-2 rounded-lg border border-[#1e3a5f] bg-[#0d2137] px-4 py-2 text-sm font-medium text-blue-300 transition-all duration-200 hover:border-blue-500/50 hover:bg-[#0f2a4a] hover:text-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-50 ${className ?? ''}`}
        aria-label="Sync repositories from GitHub"
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
          className={state === 'loading' ? 'animate-spin' : ''}
        >
          <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
          <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
          <path d="M16 16h5v5" />
        </svg>
        {state === 'loading' ? 'Syncing…' : 'Sync Repositories'}
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
