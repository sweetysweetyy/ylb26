// Retry helper with exponential backoff.
// Usage: await withRetry(() => fetch(...), { label: "gmail.send" })

export type RetryStep = { attempt: number; delay_ms: number; error: string; at: string };

export interface RetryResult<T> {
  value: T;
  attempts: number;
  duration_ms: number;
  steps: RetryStep[];
}

function shouldRetryError(err: unknown): boolean {
  const msg = String((err as Error)?.message ?? err ?? "");
  // Retry on transient network / rate limit / server errors
  return /(429|500|502|503|504|ETIMEDOUT|ECONNRESET|EAI_AGAIN|network|timeout|fetch failed)/i.test(msg);
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { label: string; maxAttempts?: number; baseDelayMs?: number } = { label: "op" },
): Promise<RetryResult<T>> {
  const maxAttempts = opts.maxAttempts ?? 4;
  const baseDelay = opts.baseDelayMs ?? 400;
  const started = Date.now();
  const steps: RetryStep[] = [];
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const value = await fn();
      return { value, attempts: attempt, duration_ms: Date.now() - started, steps };
    } catch (e) {
      lastErr = e;
      const retriable = shouldRetryError(e);
      const delay = Math.min(8000, baseDelay * Math.pow(2, attempt - 1)) + Math.floor(Math.random() * 200);
      steps.push({ attempt, delay_ms: retriable ? delay : 0, error: String((e as Error)?.message ?? e), at: new Date().toISOString() });
      if (!retriable || attempt === maxAttempts) break;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  const err = new Error(`[${opts.label}] failed after ${steps.length} attempt(s): ${String((lastErr as Error)?.message ?? lastErr)}`);
  (err as Error & { steps?: RetryStep[] }).steps = steps;
  throw err;
}