import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': root,
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      // Gate the framework-free branching: these carry no Next safety net.
      include: ['lib/**/*.ts'],
      // Measured 2026-10-06: statements 27.02 / branches 18.93 / functions
      // 18.37 / lines 27.71. Floors sit just below the measured values so the
      // gate is real (any deletion trips it) but honest (it does not claim the
      // 80% target the suite has not earned yet — most of lib/ has no unit
      // coverage; raising the floor is follow-up work, not a config edit).
      thresholds: {
        lines: 27,
        functions: 18,
        branches: 18,
        statements: 26,
      },
    },
  },
});
