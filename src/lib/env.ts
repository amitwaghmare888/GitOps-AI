import { AppError } from '@/lib/errors';

export class ConfigError extends AppError {
  constructor(missingVars: string[]) {
    super(
      `Missing required configuration: ${missingVars.join(', ')}`,
      'UNKNOWN'
    );
    this.name = 'ConfigError';
  }
}

/**
 * Validates and returns Supabase environment variables.
 * Throws a ConfigError if any required variable is missing.
 */
export function requireSupabaseEnv() {
  const missing: string[] = [];
  
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) missing.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!anonKey) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');

  if (missing.length > 0) {
    throw new ConfigError(missing);
  }

  return { url: url!, anonKey: anonKey! };
}

/**
 * Validates and returns the Supabase Service Role key.
 * Throws a ConfigError if missing.
 */
export function requireSupabaseServiceRole() {
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRole) {
    throw new ConfigError(['SUPABASE_SERVICE_ROLE_KEY']);
  }
  return serviceRole;
}
