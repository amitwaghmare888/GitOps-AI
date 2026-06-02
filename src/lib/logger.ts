type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  context: string;
  message: string;
  timestamp: string;
  payload?: unknown;
}

const IS_PROD = process.env.NODE_ENV === 'production';

function formatEntry(entry: LogEntry): string {
  const base = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.context}] ${entry.message}`;
  return entry.payload !== undefined
    ? `${base} ${JSON.stringify(entry.payload)}`
    : base;
}

function log(level: LogLevel, context: string, message: string, payload?: unknown): void {
  if (level === 'debug' && IS_PROD) return;

  const entry: LogEntry = {
    level,
    context,
    message,
    timestamp: new Date().toISOString(),
    payload,
  };

  const formatted = formatEntry(entry);

  switch (level) {
    case 'debug':
      console.debug(formatted);
      break;
    case 'info':
      console.info(formatted);
      break;
    case 'warn':
      console.warn(formatted);
      break;
    case 'error':
      console.error(formatted);
      break;
  }
}

export function createLogger(context: string) {
  return {
    debug: (message: string, payload?: unknown) => log('debug', context, message, payload),
    info:  (message: string, payload?: unknown) => log('info',  context, message, payload),
    warn:  (message: string, payload?: unknown) => log('warn',  context, message, payload),
    error: (message: string, payload?: unknown) => log('error', context, message, payload),
  };
}

/** Top-level logger for use outside of specific contexts */
export const logger = createLogger('app');
