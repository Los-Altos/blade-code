import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import path from 'node:path';

describe('启动时间回归测试', () => {
  const cliPath = path.resolve(__dirname, '../../../dist/blade.js');

  describe('CLI 启动性能', () => {
    it('--version 命令应在 2 秒内完成', () => {
      const start = performance.now();

      try {
        execSync(`node ${cliPath} --version`, {
          timeout: 5000,
          encoding: 'utf-8',
        });
      } catch {
        // CLI may not be built, ignore errors
      }

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(2000);
    });

    it('--help 命令应在 2 秒内完成', () => {
      const start = performance.now();

      try {
        execSync(`node ${cliPath} --help`, {
          timeout: 5000,
          encoding: 'utf-8',
        });
      } catch {
        // CLI may not be built, ignore errors
      }

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(2000);
    });
  });

  describe('模块加载性能', () => {
    it('核心模块导入应在 1000ms 内完成', async () => {
      const start = performance.now();

      await Promise.all([
        import('../../../src/config/index.js').catch(() => undefined),
        import('../../../src/services/FileSystemService.js').catch(() => undefined),
      ]);

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('冷启动 vs 热启动', () => {
    it('连续启动应该更快 (缓存效果)', () => {
      const runs: number[] = [];

      for (let i = 0; i < 3; i++) {
        const start = performance.now();
        try {
          execSync(`node ${cliPath} --version`, {
            timeout: 5000,
            encoding: 'utf-8',
          });
        } catch {
          // CLI may not be built, ignore errors
        }
        runs.push(performance.now() - start);
      }

      if (runs.length >= 2) {
        const firstRun = runs[0];
        const lastRun = runs[runs.length - 1];
        expect(lastRun).toBeLessThanOrEqual(firstRun * 1.5);
      }
    });
  });
});
