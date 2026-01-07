# 📎 @ 文件提及

@ 文件提及功能允许你在对话中直接引用项目文件，Blade 会自动读取文件内容并作为上下文发送给 AI。

## 快速开始

### 基本用法

在消息中使用 `@` 引用文件：

```
请帮我分析 @src/agent/Agent.ts 中的错误处理逻辑
```

输入 `@` 后会自动显示文件建议列表，使用方向键选择，`Tab` 确认。

### 语法格式

| 语法 | 说明 | 示例 |
|------|------|------|
| `@path` | 裸路径 | `@src/index.ts` |
| `@"path"` | 带引号路径（有空格） | `@"my file.ts"` |
| `@path#L10` | 单行引用 | `@config.json#L5` |
| `@path#L10-20` | 行范围引用 | `@agent.ts#L100-150` |
| `@directory/` | 目录引用 | `@src/utils/` |

## 使用示例

### 分析单个文件

```
帮我分析 @src/agent/Agent.ts 中的错误处理逻辑
```

### 指定行号范围

```
解释 @src/agent/Agent.ts#L100-150 这段代码的作用
```

### 对比多个文件

```
对比 @src/agent/Agent.ts 和 @src/agent/ExecutionEngine.ts 的实现差异
```

### 引用目录

```
分析 @src/utils/ 目录下的工具函数
```

### 结合其他功能

```
基于 @package.json 和 @tsconfig.json 的配置，帮我优化 @src/index.ts 的导入语句
```

## 路径解析规则

### 相对路径

相对于当前工作目录解析：

```
@src/agent.ts → /project/src/agent.ts
```

### 绝对路径

必须在工作区内：

```
@/Users/you/project/src/agent.ts → ✅ 允许（在工作区内）
@/etc/passwd → ❌ 拒绝（在工作区外）
```

### 路径遍历

禁止使用 `..` 跳出工作区：

```
@../../etc/passwd → ❌ 拒绝
```

## 安全限制

以下路径被禁止访问：

| 路径 | 原因 |
|------|------|
| `.git/` | Git 仓库目录 |
| `.blade/` | Blade 配置目录 |
| `node_modules/` | 依赖包目录 |
| `.env`, `.env.local` | 环境变量文件 |

## 文件限制

| 限制项 | 默认值 |
|--------|--------|
| 最大文件大小 | 1 MB |
| 最大行数 | 2000 行 |
| 最大目录文件数 | 50 个 |

超过限制会自动截断或省略。

## 行号引用

使用行号引用时，Blade 会：

1. 自动添加行号前缀
2. 验证行号范围是否有效
3. 在文件内容前显示元数据

输出示例：

```xml
<file path="src/agent.ts" range=" (lines 100-150)">
100: export class Agent {
101:   private config: Config;
102:   ...
150: }
</file>
```

## 多文件引用

一次对话中可以引用多个文件：

```
基于 @package.json 和 @tsconfig.json 的配置，
帮我优化 @src/index.ts 的导入语句
```

Blade 会按顺序读取所有文件，并将内容一起发送给 AI。

## 文件缓存

Blade 会缓存读取的文件内容（60 秒）：

- ✅ 同一文件在 60 秒内重复引用会命中缓存
- ✅ 不同行号范围会重新读取
- ✅ 文件修改后下次引用会自动刷新

## 与其他功能结合

### 结合 Plan 模式

```bash
blade --permission-mode plan

# 然后在对话中：
基于 @README.md 的说明，制定一个实现计划
```

### 结合工具调用

```
读取 @src/config.ts，然后使用 Write 工具创建一个类似的配置模板
```

## 常见问题

### Q: 为什么文件引用失败？

可能原因：

1. **文件不存在** - 检查路径拼写
2. **在受限目录** - 尝试访问 `.git`、`node_modules` 等
3. **路径遍历** - 使用了 `..` 跳出工作区
4. **文件过大** - 超过 1 MB 限制

### Q: 如何引用包含空格的文件？

使用双引号包裹路径：

```
@"my folder/my file.ts"
```

### Q: @ 提及会消耗多少 Token？

文件内容会追加到消息中，Token 消耗取决于文件大小：

- 粗略估算：1 Token ≈ 4 字符
- 建议：使用行号范围引用减少 Token 消耗

### Q: 可以引用二进制文件吗？

不支持。Blade 只能读取文本文件。

### Q: 目录引用只显示部分文件？

出于性能考虑，目录引用限制为最多 50 个文件。建议：

- 引用更具体的子目录
- 直接引用需要的文件

## 技术细节

### 消息格式

@ 提及处理后的消息格式：

```xml
原始消息内容

<system-reminder>
The following files were mentioned with @ syntax:

<file path="src/agent.ts" range=" (lines 100-150)">
100: export class Agent {
101:   ...
</file>
</system-reminder>
```

### 错误处理

如果某个文件读取失败：

1. 继续处理其他文件
2. 在消息末尾追加错误信息
3. 不会中断对话流程

## 相关资源

- [快速开始](../getting-started/quick-start.md) - 基础使用
- [权限控制](../configuration/permissions.md) - 文件访问权限
