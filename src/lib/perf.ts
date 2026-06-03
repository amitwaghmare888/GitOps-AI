import { createLogger } from '@/lib/logger';

const log = createLogger('Perf');

export interface TimingEntry {
  label: string;
  durationMs: number;
}

/**
 * Measures the duration of an async operation and returns both the result and timing.
 */
export async function measure<T>(label: string, fn: () => Promise<T>): Promise<{ result: T; entry: TimingEntry }> {
  const start = performance.now();
  const result = await fn();
  const durationMs = Math.round((performance.now() - start) * 100) / 100;
  return { result, entry: { label, durationMs } };
}

/**
 * Logs a timing table to the server console.
 */
export function logTimingTable(context: string, entries: TimingEntry[]) {
  const totalMs = entries.reduce((sum, e) => sum + e.durationMs, 0);
  const rows = entries.map((e) => ({
    operation: e.label,
    'duration (ms)': e.durationMs,
    '% of total': totalMs > 0 ? `${Math.round((e.durationMs / totalMs) * 100)}%` : '0%',
  }));

  log.info(`── ${context} Timing ──`, { totalMs });
  for (const row of rows) {
    log.info(`  ${row.operation}: ${row['duration (ms)']}ms (${row['% of total']})`);
  }
}
