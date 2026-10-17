const TRANSIENT_MESSAGE = /failed to fetch|network error|load failed|timeout|timed out|client is offline/i;

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function isTransientFetchError(error: unknown): boolean {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const status = Number((error as { status: unknown }).status);
    return status === 0 || status >= 500;
  }
  if (error instanceof TypeError) return true;
  const message = error instanceof Error ? error.message : '';
  return TRANSIENT_MESSAGE.test(message);
}

export async function retryTransient<T>(operation: () => Promise<T>, attempts = 4, baseDelayMs = 1000): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isTransientFetchError(error) || attempt === attempts - 1) throw error;
      await wait(baseDelayMs * 2 ** attempt);
    }
  }
  throw lastError;
}
