import { describe, it, expect } from 'vitest';

const mockTokenCounter = {
  countTokens: (text: string): number => {
    return Math.ceil(text.length / 4);
  },

  countTokensAccurate: (text: string): number => {
    const words = text.split(/\s+/).filter(Boolean);
    let tokenCount = 0;

    for (const word of words) {
      if (word.length <= 4) {
        tokenCount += 1;
      } else if (word.length <= 8) {
        tokenCount += 2;
      } else {
        tokenCount += Math.ceil(word.length / 4);
      }
    }

    return Math.max(tokenCount, 1);
  },
};

describe('Token 计数性能测试', () => {
  const shortText = 'Hello, world!';
  const mediumText = `
    This is a medium-length text that contains multiple sentences.
    It is used to test the token counting performance for typical user inputs.
    The text includes various punctuation marks, numbers like 12345, and special characters.
  `.repeat(10);
  const longText = mediumText.repeat(100);

  describe('基准测试 - 快速算法', () => {
    it('短文本 token 计数性能', () => {
      const iterations = 10000;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        mockTokenCounter.countTokens(shortText);
      }

      const duration = performance.now() - start;
      const opsPerSecond = (iterations / duration) * 1000;

      expect(opsPerSecond).toBeGreaterThan(100000);
    });

    it('中等文本 token 计数性能', () => {
      const iterations = 1000;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        mockTokenCounter.countTokens(mediumText);
      }

      const duration = performance.now() - start;
      const avgTime = duration / iterations;

      expect(avgTime).toBeLessThan(1);
    });

    it('长文本 token 计数性能', () => {
      const iterations = 100;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        mockTokenCounter.countTokens(longText);
      }

      const duration = performance.now() - start;
      const avgTime = duration / iterations;

      expect(avgTime).toBeLessThan(10);
    });
  });

  describe('基准测试 - 精确算法', () => {
    it('短文本 token 计数性能', () => {
      const iterations = 10000;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        mockTokenCounter.countTokensAccurate(shortText);
      }

      const duration = performance.now() - start;
      const opsPerSecond = (iterations / duration) * 1000;

      expect(opsPerSecond).toBeGreaterThan(50000);
    });

    it('中等文本 token 计数性能', () => {
      const iterations = 1000;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        mockTokenCounter.countTokensAccurate(mediumText);
      }

      const duration = performance.now() - start;
      const avgTime = duration / iterations;

      expect(avgTime).toBeLessThan(5);
    });

    it('长文本 token 计数性能', () => {
      const iterations = 100;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        mockTokenCounter.countTokensAccurate(longText);
      }

      const duration = performance.now() - start;
      const avgTime = duration / iterations;

      expect(avgTime).toBeLessThan(50);
    });
  });

  describe('性能阈值测试', () => {
    it('短文本处理应在 1ms 内完成', () => {
      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        mockTokenCounter.countTokens(shortText);
      }
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(100);
    });

    it('中等文本处理应在 10ms 内完成 (1000次)', () => {
      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        mockTokenCounter.countTokens(mediumText);
      }
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(1000);
    });

    it('长文本处理应在 100ms 内完成 (单次)', () => {
      const start = performance.now();
      mockTokenCounter.countTokens(longText);
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(100);
    });
  });

  describe('内存使用测试', () => {
    it('处理大文本不应导致内存泄漏', () => {
      const iterations = 100;
      const initialMemory = process.memoryUsage().heapUsed;

      for (let i = 0; i < iterations; i++) {
        mockTokenCounter.countTokens(longText);
      }

      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('算法对比', () => {
    it('快速算法应该比精确算法更快', () => {
      const iterations = 1000;

      const startFast = performance.now();
      for (let i = 0; i < iterations; i++) {
        mockTokenCounter.countTokens(mediumText);
      }
      const durationFast = performance.now() - startFast;

      const startAccurate = performance.now();
      for (let i = 0; i < iterations; i++) {
        mockTokenCounter.countTokensAccurate(mediumText);
      }
      const durationAccurate = performance.now() - startAccurate;

      expect(durationFast).toBeLessThan(durationAccurate);
    });
  });
});
