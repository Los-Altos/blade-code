import { beforeAll, afterAll, vi } from 'vitest';

beforeAll(() => {
  process.env.BLADE_E2E_TEST = 'true';
  process.env.NODE_ENV = 'test';

  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterAll(() => {
  delete process.env.BLADE_E2E_TEST;
  vi.restoreAllMocks();
});

export const E2E_TIMEOUT = 60000;
export const E2E_SLOW_TIMEOUT = 120000;
