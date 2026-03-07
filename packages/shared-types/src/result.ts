// ============================================================================
// Result Type - Type-safe error handling
// ============================================================================

/** Discriminated union for success/failure results */
export type Result<T, E = Error> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E }

/** Create a success result */
export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value }
}

/** Create a failure result */
export function err<E>(error: E): Result<never, E> {
  return { ok: false, error }
}

/** Type guard for success result */
export function isOk<T, E>(result: Result<T, E>): result is { readonly ok: true; readonly value: T } {
  return result.ok
}

/** Type guard for failure result */
export function isErr<T, E>(result: Result<T, E>): result is { readonly ok: false; readonly error: E } {
  return !result.ok
}
