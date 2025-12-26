---
description: 创建 Pull Request
argument-hint: [目标分支，默认 main]
allowed-tools:
  - Bash(git:*)
  - Bash(gh:*)
  - Read
  - Glob
---

请帮我创建一个 Pull Request。

## 当前状态

```
!`git branch --show-current`
```

## 变更摘要

```
!`git log --oneline origin/main..HEAD 2>/dev/null || git log --oneline -5`
```

## 变更文件

```
!`git diff --stat origin/main..HEAD 2>/dev/null || git diff --stat HEAD~5..HEAD`
```

## PR 目标分支

$1

## 要求

1. **分析变更**：理解这些 commits 完成了什么功能
2. **生成 PR 标题**：简洁明了，符合 Conventional Commits
3. **生成 PR 描述**：
   - ## Summary：概述变更内容
   - ## Changes：列出主要变更点
   - ## Testing：说明如何测试
   - ## Screenshots：如果是 UI 变更
4. **使用 gh 命令创建 PR**

## PR 模板

```markdown
## Summary
[一句话描述这个 PR 做了什么]

## Changes
- [变更点 1]
- [变更点 2]

## Testing
- [ ] 单元测试通过
- [ ] 手动测试通过

## Related Issues
Closes #xxx
```

请先展示 PR 的标题和描述，等我确认后再执行 `gh pr create`。
