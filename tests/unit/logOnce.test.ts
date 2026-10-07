import { describe, expect, it, vi } from 'vitest';
import { logOnce } from '@/lib/json';

describe('logOnce', () => {
  it('logs the first occurrence and suppresses repeats within TTL', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      logOnce('warn', 'test:key-a', 'first');
      logOnce('warn', 'test:key-a', 'second');
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledWith('first');
    } finally {
      warn.mockRestore();
    }
  });

  it('uses separate keys independently', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      logOnce('warn', 'test:key-b', 'b');
      logOnce('warn', 'test:key-c', 'c');
      expect(warn).toHaveBeenCalledTimes(2);
    } finally {
      warn.mockRestore();
    }
  });
});
