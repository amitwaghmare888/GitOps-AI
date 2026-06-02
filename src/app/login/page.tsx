import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ConfigError } from '@/lib/env';
import { GitHubLoginButton } from '@/components/auth/GitHubLoginButton';

interface LoginPageProps {
  searchParams: Promise<{ error?: string; redirectTo?: string }>;
}

const ERROR_MESSAGES: Record<string, string> = {
  no_code: 'Authentication failed — no authorization code received.',
  auth_failed: 'Authentication failed — could not verify your GitHub account.',
  callback_failed: 'Something went wrong during sign-in. Please try again.',
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  let user = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (error) {
    if (!(error instanceof ConfigError)) {
      throw error;
    }
  }

  if (user) {
    redirect('/dashboard');
  }

  const params = await searchParams;
  const errorKey = params.error;
  const errorMessage = errorKey ? (ERROR_MESSAGES[errorKey] ?? 'An unknown error occurred.') : null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0d1117] px-4">
      {/* Background gradient effects */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-purple-600/10 blur-3xl" />
        <div className="absolute -bottom-40 left-1/4 h-[400px] w-[600px] rounded-full bg-blue-600/8 blur-3xl" />
      </div>

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-8">
        {/* Logo / App name */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 shadow-lg shadow-purple-500/25">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="28"
              height="28"
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
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              GitOps AI
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Sign in to manage your repositories with AI
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="w-full rounded-xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-sm">
          {errorMessage && (
            <div
              className="mb-5 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
              role="alert"
              id="login-error"
            >
              <div className="flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="shrink-0"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          <GitHubLoginButton />

          <p className="mt-5 text-center text-xs text-zinc-500">
            By signing in, you agree to grant read access to your GitHub profile.
          </p>
        </div>

        <p className="text-xs text-zinc-600">
          Powered by Supabase Auth
        </p>
      </div>
    </div>
  );
}
