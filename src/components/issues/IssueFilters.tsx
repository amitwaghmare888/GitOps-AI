'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export function IssueFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [searchValue, setSearchValue] = useState(searchParams.get('search') ?? '');
  const activeState = searchParams.get('state') ?? 'all';

  // Keep a ref to the latest searchParams so the debounce effect can read
  // current params without searchParams itself being a reactive dependency.
  // If searchParams were in the dep array, every router.replace() call would
  // return a new ReadonlyURLSearchParams reference and re-fire the effect
  // indefinitely (infinite loop on idle page).
  const searchParamsRef = useRef(searchParams);
  useEffect(() => {
    searchParamsRef.current = searchParams;
  }, [searchParams]);

  // Debounce search updates
  useEffect(() => {
    const handler = setTimeout(() => {
      const params = new URLSearchParams(searchParamsRef.current.toString());
      if (searchValue) {
        params.set('search', searchValue);
      } else {
        params.delete('search');
      }
      router.replace(`?${params.toString()}`, { scroll: false });
    }, 350);

    return () => clearTimeout(handler);
  }, [searchValue, router]);

  const handleStateChange = useCallback((newState: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newState === 'all') {
      params.delete('state');
    } else {
      params.set('state', newState);
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const handleClearSearch = useCallback(() => {
    setSearchValue('');
  }, []);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      {/* State Tabs */}
      <div className="flex rounded-lg border border-[#1a2740] bg-[#0C1222] p-1">
        {['all', 'open', 'closed'].map((s) => (
          <button
            key={s}
            onClick={() => handleStateChange(s)}
            className={`flex-1 rounded-md px-4 py-1.5 text-xs font-medium capitalize transition-colors ${
              activeState === s
                ? 'bg-[#1a2740] text-zinc-100 shadow-sm'
                : 'text-zinc-500 hover:bg-[#1a2740]/50 hover:text-zinc-300'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="relative w-full sm:max-w-xs">
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
          id="issue-search"
          type="search"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder="Search issues…"
          className="w-full rounded-lg border border-[#1a2740] bg-[#0C1222] py-2 pl-9 pr-8 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-colors"
          aria-label="Search issues"
        />
        {searchValue && (
          <button
            onClick={handleClearSearch}
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
    </div>
  );
}
