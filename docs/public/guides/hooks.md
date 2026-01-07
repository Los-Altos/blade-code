# 🪝 Hooks 系统

Hooks 允许在工具执行前后自动运行自定义脚本，实现代码格式化、lint 检查等自动化操作。

## 概述

Blade 支持以下 Hook 类型：

| Hook 类型 | 触发时机 | 用途 |
|-----------|----------|------|
| `PreToolUse` | 工具执行前 | 参数验证、预处理 |
| `PostToolUse` | 工具执行后 | 格式化、lint、通知 |

## 配置方式

在 `settings.json` 或 `settings.local.json` 中配置：

```json
{
  "hooks": {
    "enabled": true,
    "timeout": 30000,
    "PostToolUse": {
      "Write": "npx prettier --write {file_path}",
      "Edit": "npx prettier --write {file_path}"
    }
  }
}
```

## 配置字段

| 字段 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| `enabled` | boolean | 是否启用 Hooks | `false` |
| `timeout` | number | 执行超时（毫秒） | `30000` |
| `PreToolUse` | object | 工具执行前的 Hook | `{}` |
| `PostToolUse` | object | 工具执行后的 Hook | `{}` |

## 变量替换

Hook 命令支持变量替换：

| 变量 | 说明 | 适用工具 |
|------|------|----------|
| `{file_path}` | 文件路径 | Write, Edit, Read |
| `{content}` | 文件内容 | Write |
| `{old_string}` | 替换前字符串 | Edit |
| `{new_string}` | 替换后字符串 | Edit |
| `{command}` | 执行的命令 | Bash |
| `{cwd}` | 工作目录 | 所有工具 |

## 常用示例

### 代码格式化

文件写入后自动格式化：

```json
{
  "hooks": {
    "enabled": true,
    "PostToolUse": {
      "Write": "npx prettier --write {file_path}",
      "Edit": "npx prettier --write {file_path}"
    }
  }
}
```

### ESLint 检查

文件修改后运行 lint：

```json
{
  "hooks": {
    "enabled": true,
    "PostToolUse": {
      "Write": "npx eslint --fix {file_path}",
      "Edit": "npx eslint --fix {file_path}"
    }
  }
}
```

### 多命令组合

使用 `&&` 组合多个命令：

```json
{
  "hooks": {
    "enabled": true,
    "PostToolUse": {
      "Write": "npx prettier --write {file_path} && npx eslint --fix {file_path}",
      "Edit": "npx prettier --write {file_path} && npx eslint --fix {file_path}"
    }
  }
}
```

### Python 项目

```json
{
  "hooks": {
    "enabled": true,
    "PostToolUse": {
      "Write": "black {file_path} && isort {file_path}",
      "Edit": "black {file_path} && isort {file_path}"
    }
  }
}
```

### Go 项目

```json
{
  "hooks": {
    "enabled": true,
    "PostToolUse": {
      "Write": "gofmt -w {file_path}",
      "Edit": "gofmt -w {file_path}"
    }
  }
}
```

### 按文件类型配置

可以使用条件判断：

```json
{
  "hooks": {
    "enabled": true,
    "PostToolUse": {
      "Write": "if [[ {file_path} == *.ts ]]; then npx prettier --write {file_path}; fi",
      "Edit": "if [[ {file_path} == *.ts ]]; then npx prettier --write {file_path}; fi"
    }
  }
}
```

## 禁用 Hooks

### 全局禁用

```json
{
  "disableAllHooks": true
}
```

### 禁用特定 Hook

```json
{
  "hooks": {
    "enabled": false
  }
}
```

## 执行流程

```
用户请求 → AI 调用工具
                ↓
        [PreToolUse Hook]
                ↓
           工具执行
                ↓
        [PostToolUse Hook]
                ↓
           返回结果
```

## 错误处理

- Hook 执行失败不会阻止工具执行
- 错误信息会记录到日志
- 超时的 Hook 会被强制终止

## 安全注意事项

1. **避免危险命令** - 不要在 Hook 中执行 `rm -rf` 等危险命令
2. **验证输入** - 变量可能包含特殊字符，注意转义
3. **限制超时** - 设置合理的超时时间
4. **使用 settings.local.json** - 个人 Hook 配置不要提交到仓库

## 调试

启用调试模式查看 Hook 执行日志：

```bash
blade --debug hooks
```

或在配置中启用：

```json
{
  "debug": "hooks"
}
```

## 相关资源

- [配置系统](../configuration/config-system.md) - 完整配置说明
- [权限控制](../configuration/permissions.md) - 工具权限
