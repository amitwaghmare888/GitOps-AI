export type ErrorCode =
  | 'AUTH_REQUIRED'
  | 'AUTH_CALLBACK_FAILED'
  | 'AUTH_SIGN_IN_FAILED'
  | 'AUTH_SIGN_OUT_FAILED'
  | 'AUTH_SESSION_MISSING'
  | 'DB_QUERY_FAILED'
  | 'DB_NOT_FOUND'
  | 'PROFILE_CREATE_FAILED'
  | 'GITHUB_TOKEN_MISSING'
  | 'GITHUB_API_FAILED'
  | 'REPO_SYNC_FAILED'
  | 'VALIDATION_ERROR'
  | 'UNKNOWN';

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly cause: unknown;

  constructor(message: string, code: ErrorCode = 'UNKNOWN', cause?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.cause = cause;
  }
}

export class AuthError extends AppError {
  constructor(message: string, code: ErrorCode = 'AUTH_REQUIRED', cause?: unknown) {
    super(message, code, cause);
    this.name = 'AuthError';
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, 'DB_QUERY_FAILED', cause);
    this.name = 'DatabaseError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, 'DB_NOT_FOUND', cause);
    this.name = 'NotFoundError';
  }
}

export class GitHubApiError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, 'GITHUB_API_FAILED', cause);
    this.name = 'GitHubApiError';
  }
}

export class GitHubTokenMissingError extends AppError {
  constructor() {
    super(
      'GitHub token unavailable — please sign out and sign back in to refresh your GitHub access.',
      'GITHUB_TOKEN_MISSING',
    );
    this.name = 'GitHubTokenMissingError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, 'VALIDATION_ERROR', cause);
    this.name = 'ValidationError';
  }
}

/**
 * Safely normalises an unknown thrown value into an AppError.
 */
export function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  if (err instanceof Error) {
    return new AppError(err.message, 'UNKNOWN', err);
  }
  return new AppError(String(err), 'UNKNOWN', err);
}

