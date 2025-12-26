---
description: 重构指定文件或函数
argument-hint: <文件路径> [重构目标]
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash(npm:*)
  - Bash(npx:*)
---

请帮我重构以下代码。

## 目标

文件：$1
重构说明：$2

## 当前代码

@$1

## 重构原则

1. **保持行为不变**：重构不应改变外部可观察的行为
2. **小步前进**：每次只做一个小改动
3. **测试保护**：确保有测试覆盖，或先补充测试
4. **代码整洁**：
   - 函数单一职责
   - 避免过深嵌套
   - 有意义的命名
   - 减少重复代码

## 重构清单

请按以下步骤进行：

1. **分析现状**：指出当前代码的问题
2. **制定计划**：列出重构步骤
3. **逐步执行**：每一步都展示变更
4. **验证结果**：运行类型检查和测试

## 常用重构手法

- 提取函数 (Extract Function)
- 内联函数 (Inline Function)
- 提取变量 (Extract Variable)
- 重命名 (Rename)
- 移动函数 (Move Function)
- 用多态替换条件 (Replace Conditional with Polymorphism)

请先分析代码问题，然后告诉我你的重构计划，等我确认后再开始执行。
