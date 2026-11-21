import { describe, expect, it, vi } from 'vitest';
import { isTransientFetchError, retryTransient } from './retryTransient';

describe('isTransientFetchError', () => {
  it('treats fetch failures and server errors as transient', () => {
    expect(isTransientFetchError(new TypeError('Failed to fetch'))).toBe(true);
    expect(isTransientFetchError(Object.assign(new Error('nope'), { status: 503 }))).toBe(true);
    expect(isTransientFetchError(new Error('Failed to fetch translations (502): https://example.test'))).toBe(true);
  });

  it('does not retry missing assets', () => {
    expect(isTransientFetchError(Object.assign(new Error('missing'), { status: 404 }))).toBe(false);
  });
});

describe('retryTransient', () => {
  it('returns the first successful result', async () => {
    const operation = vi.fn().mockResolvedValue('ok');
    await expect(retryTransient(operation, 4, 0)).resolves.toBe('ok');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('retries a failed fetch and then succeeds', async () => {
    const operation = vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce('ok');
    await expect(retryTransient(operation, 4, 0)).resolves.toBe('ok');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('stops on a non-transient error', async () => {
    const error = Object.assign(new Error('missing'), { status: 404 });
    const operation = vi.fn().mockRejectedValue(error);
    await expect(retryTransient(operation, 4, 0)).rejects.toBe(error);
    expect(operation).toHaveBeenCalledTimes(1);
  });
});
