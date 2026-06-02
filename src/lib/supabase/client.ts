'use client';

import { createBrowserClient } from '@supabase/ssr';
import { requireSupabaseEnv } from '@/lib/env';

let client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (client) return client;

  const env = requireSupabaseEnv();

  client = createBrowserClient(env.url, env.anonKey);

  return client;
}

