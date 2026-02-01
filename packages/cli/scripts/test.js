#!/usr/bin/env node

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testTypes = {
  unit: {
    name: '单元测试',
    project: 'unit',
    timeout: 45000,
  },
  integration: {
    name: '集成测试',
    project: 'integration',
    timeout: 90000,
  },
  cli: {
    name: 'CLI 测试',
    project: 'cli',
    timeout: 60000,
  },
  e2e: {
    name: 'E2E 测试',
    project: 'e2e',
    timeout: 180000,
  },
  performance: {
    name: '性能测试',
    project: 'performance',
    timeout: 300000,
  },
  snapshot: {
    name: '快照测试',
    project: 'snapshot',
    timeout: 45000,
  },
  security: {
    name: '安全测试',
    project: 'security',
    timeout: 90000,
  },
  all: {
    name: '所有测试',
    project: null,
    timeout: 600000,
  },
};

function printUsage() {
  console.log(`
🧪 Blade 测试运行器

用法:
  npm run test [类型] [选项]

测试类型:
  unit        运行单元测试
  integration 运行集成测试
  cli         运行 CLI 行为测试
  e2e         运行端到端测试
  performance 运行性能测试
  snapshot    运行快照测试
  security    运行安全测试
  all         运行所有项目

选项:
  --coverage  生成覆盖率报告
  --watch     监听模式运行测试
  --debug     启用调试模式
  --verbose   详细输出
  --update    更新快照
  --help      显示此帮助信息

示例:
  npm run test unit
  npm run test integration --coverage
  npm run test all --watch
  npm run test cli --debug
  npm run test snapshot --update
  npm run test security
`);
}

function runTest(testType, options = {}) {
  const config = testTypes[testType];
  if (!config) {
    console.error(`❌ 未知的测试类型: ${testType}`);
    printUsage();
    process.exit(1);
  }

  console.log(`🚀 开始运行${config.name}...`);

  if (options.watch && options.coverage) {
    console.warn('⚠️ 监听模式暂不支持覆盖率统计，忽略 --coverage');
    options.coverage = false;
  }

  const baseArgs = ['vitest'];
  if (options.watch) {
    baseArgs.push('--watch');
  } else {
    baseArgs.push('run');
  }

  baseArgs.push('--config', path.join(__dirname, '..', 'vitest.config.ts'));

  if (config.project) {
    baseArgs.push('--project', config.project);
  }

  if (options.coverage) {
    baseArgs.push('--coverage');
  }

  if (options.update) {
    baseArgs.push('--update');
  }

  if (options.debug) {
    process.env.DEBUG_TESTS = 'true';
  }

  if (options.verbose) {
    process.env.VERBOSE_TESTS = 'true';
  }

  const command = baseArgs.join(' ');

  try {
    console.log(`📝 执行命令: ${command}`);

    const startTime = Date.now();
    execSync(command, {
      stdio: 'inherit',
      cwd: process.cwd(),
      timeout: config.timeout,
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ ${config.name}完成! 耗时: ${duration}s`);
  } catch (error) {
    console.error(`❌ ${config.name}失败:`, error.message);
    process.exit(1);
  }
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help')) {
    printUsage();
    return;
  }
  
  const testType = args[0];
  const options = {
    coverage: args.includes('--coverage'),
    watch: args.includes('--watch'),
    debug: args.includes('--debug'),
    verbose: args.includes('--verbose'),
    update: args.includes('--update'),
  };
  
  if (!testTypes[testType]) {
    console.error(`❌ 未知的测试类型: ${testType}`);
    printUsage();
    process.exit(1);
  }
  
  runTest(testType, options);
}

process.on('uncaughtException', (error) => {
  console.error('❌ 未捕获的异常:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ 未处理的Promise拒绝:', reason);
  process.exit(1);
});

main();
