import { describe, expect, it, vi } from 'vitest';
import { withTimeout } from '@/lib/withTimeout';

describe('withTimeout', () => {
  it('resolves fast promises unchanged', async () => {
    await expect(withTimeout(Promise.resolve(42), 't', 1000)).resolves.toBe(42);
  });

  it('rejects a hung promise after the timeout with a labelled error', async () => {
    const never = new Promise<never>(() => undefined);
    await expect(withTimeout(never, 'myLabel', 20)).rejects.toThrow('[db-timeout] myLabel exceeded 20ms');
  }, 5000);

  it('propagates the original rejection, not a timeout', async () => {
    await expect(withTimeout(Promise.reject(new Error('boom')), 't', 1000)).rejects.toThrow('boom');
  });

  it('clears the timer so it cannot fire late (no unhandled rejection)', async () => {
    vi.useFakeTimers();
    try {
      const p = withTimeout(Promise.resolve('ok'), 't', 50);
      await vi.advanceTimersByTimeAsync(10);
      await expect(p).resolves.toBe('ok');
      await vi.advanceTimersByTimeAsync(1000);
    } finally {
      vi.useRealTimers();
    }
  });
});
