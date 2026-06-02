import { redirect } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { authService } from '@/lib/services/auth.service';
import { LogoutButton } from '@/components/auth/LogoutButton';
import type { GitHubUserMetadata } from '@/types/auth';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const authUser = authService.getAuthUser({
    id: user.id,
    email: user.email,
    user_metadata: user.user_metadata as GitHubUserMetadata,
  });

  return (
    <div className="min-h-screen bg-[#0d1117]">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#161b22]">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-blue-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
            </div>
            <span className="text-lg font-semibold text-white">GitOps AI</span>
          </div>

          <div className="flex items-center gap-4">
            {/* User info */}
            <div className="flex items-center gap-3">
              {authUser.avatar_url && (
                <Image
                  src={authUser.avatar_url}
                  alt={`${authUser.github_username}'s avatar`}
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-full ring-2 ring-white/10"
                  id="user-avatar"
                />
              )}
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-white" id="user-name">
                  {authUser.github_username}
                </p>
                {authUser.email && (
                  <p className="text-xs text-zinc-400" id="user-email">
                    {authUser.email}
                  </p>
                )}
              </div>
            </div>

            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Welcome section */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white" id="dashboard-heading">
            Welcome, {authUser.github_username}
          </h1>
          <p className="mt-1 text-zinc-400">
            Your GitOps AI dashboard — manage repositories and workflows with AI.
          </p>
        </div>

        {/* Stats cards placeholder */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-colors hover:bg-white/[0.07]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                  <path d="M9 18c-4.51 2-5-2-7-2" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-zinc-400">Repositories</p>
                <p className="text-xl font-semibold text-white">—</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-colors hover:bg-white/[0.07]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 1v6m0 6v6m8.66-9H15m-6 0H1.34M20.49 3.51l-4.24 4.24M7.76 16.24l-4.25 4.25m12.98 0-4.24-4.25M7.76 7.76 3.51 3.51" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-zinc-400">AI Workflows</p>
                <p className="text-xl font-semibold text-white">—</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-colors hover:bg-white/[0.07]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/20 text-green-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-zinc-400">Activity</p>
                <p className="text-xl font-semibold text-white">—</p>
              </div>
            </div>
          </div>
        </div>

        {/* Placeholder for future content */}
        <div className="mt-8 rounded-xl border border-dashed border-white/10 p-12 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-zinc-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
            </div>
            <p className="text-sm text-zinc-400">
              More features coming in Phase 5. Stay tuned!
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
