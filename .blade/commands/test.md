---
description: 运行测试并分析失败原因
argument-hint: [测试文件或模式]
allowed-tools:
  - Bash(npm:*)
  - Bash(npx:*)
  - Bash(pnpm:*)
  - Read
  - Glob
  - Grep
---

请运行测试并分析结果。

## 测试范围

$ARGUMENTS

## 执行测试

如果指定了测试范围，运行特定测试；否则运行全部测试。

## 分析要求

1. **运行测试**：执行 `npm test $ARGUMENTS` 或 `npx vitest $ARGUMENTS`
2. **分析结果**：
   - 如果全部通过 ✅，给出简短总结
   - 如果有失败 ❌，详细分析原因
3. **失败分析**：
   - 定位失败的测试用例
   - 阅读相关源代码
   - 找出问题根因
   - 提供修复建议

## 输出格式

```
📊 测试结果：X passed, Y failed, Z skipped

✅ 通过的测试模块
  - module1.test.ts (10 tests)
  - module2.test.ts (5 tests)

❌ 失败的测试
  - module3.test.ts > should handle edge case
    原因：...
    建议：...
```

如果有失败的测试，请询问我是否需要你来修复。
