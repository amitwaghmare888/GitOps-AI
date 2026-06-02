'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string; code?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global error caught:', error);
  }, [error]);

  const isConfigError = error.name === 'ConfigError' || error.message.includes('Missing required configuration');

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0d1117] px-4 text-center">
      <div className="w-full max-w-md rounded-xl border border-red-500/20 bg-white/5 p-8 shadow-2xl backdrop-blur-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20 text-red-400 mb-6">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        {isConfigError ? (
          <>
            <h2 className="text-xl font-bold text-white mb-2">Configuration Error</h2>
            <p className="text-sm text-zinc-400 mb-6">
              The application is missing required environment variables to function correctly.
            </p>
            <div className="rounded-lg bg-[#161b22] p-4 text-left border border-white/10 overflow-auto">
              <code className="text-xs text-red-400 font-mono break-words">
                {error.message}
              </code>
            </div>
            <p className="text-xs text-zinc-500 mt-6">
              Please check your <code>.env.local</code> file and restart the development server.
            </p>
          </>
        ) : (
          <>
            <h2 className="text-xl font-bold text-white mb-2">Something went wrong!</h2>
            <p className="text-sm text-zinc-400 mb-6">
              An unexpected error occurred while loading this page.
            </p>
            <button
              onClick={() => reset()}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-6 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-[#0d1117]"
            >
              Try again
            </button>
          </>
        )}
      </div>
    </div>
  );
}
