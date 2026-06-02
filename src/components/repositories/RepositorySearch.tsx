'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export function RepositorySearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get('search') ?? '');

  // Debounce: update URL 350ms after the user stops typing
  useEffect(() => {
    const handler = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set('search', value);
      } else {
        params.delete('search');
      }
      router.replace(`?${params.toString()}`, { scroll: false });
    }, 350);

    return () => clearTimeout(handler);
  }, [value, router, searchParams]);

  const handleClear = useCallback(() => {
    setValue('');
  }, []);

  return (
    <div className="relative flex-1">
      <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-zinc-500"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </div>
      <input
        id="repository-search"
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search repositories…"
        className="w-full rounded-lg border border-[#1a2740] bg-[#0C1222] py-2 pl-9 pr-8 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-colors"
        aria-label="Search repositories"
      />
      {value && (
        <button
          onClick={handleClear}
          className="absolute inset-y-0 right-2 flex items-center px-1 text-zinc-500 hover:text-zinc-300"
          aria-label="Clear search"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
