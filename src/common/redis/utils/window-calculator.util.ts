/**
 * Calculate reset time for a rate limit window
 */
export function calculateResetTime(now: number, windowSeconds: number): number {
  const windowMs = windowSeconds * 1000;
  return Math.ceil(now / windowMs) * windowMs;
}

/**
 * Calculate window start time
 */
export function calculateWindow(now: number, windowSeconds: number): number {
  const windowMs = windowSeconds * 1000;
  return now - windowMs;
}

