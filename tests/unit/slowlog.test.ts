import { describe, expect, it, vi } from 'vitest';
import { timed } from '@/lib/slowlog';

describe('timed', () => {
  it('passes values through silently when fast', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      await expect(timed(Promise.resolve(7), 'fast-path', 10_000)).resolves.toBe(7);
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it('warns with stage + elapsed when slow, still resolving', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      const slow = new Promise<string>((r) => setTimeout(() => r('late'), 30));
      await expect(timed(slow, 'slow-stage', 5)).resolves.toBe('late');
      expect(warn).toHaveBeenCalledTimes(1);
      const logged = String(warn.mock.calls[0][0]);
      expect(logged).toContain('slow-stage');
    } finally {
      warn.mockRestore();
    }
  });

  it('propagates rejection without a slow warn on fast failure', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      await expect(timed(Promise.reject(new Error('nope')), 'fail-fast', 10_000)).rejects.toThrow('nope');
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });
});
