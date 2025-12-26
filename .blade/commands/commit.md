---
description: 智能生成 Git 提交信息并提交
argument-hint: [可选的额外说明]
allowed-tools:
  - Bash(git:*)
  - Read
  - Glob
---

请帮我完成一次 Git 提交。

## 当前状态

```
!`git status --short`
```

## 变更详情

```
!`git diff --cached --stat`
```

## 要求

1. 分析暂存区的变更，理解修改的目的
2. 生成符合 Conventional Commits 规范的提交信息
3. 提交信息格式：`type(scope): description`
4. 常用 type：feat, fix, docs, style, refactor, test, chore
5. 如果用户提供了额外说明，请结合考虑：$ARGUMENTS

## 示例

```
feat(auth): 添加用户登录功能
fix(api): 修复分页参数解析错误
docs(readme): 更新安装说明
```

请先展示你计划的提交信息，等我确认后再执行 `git commit`。
