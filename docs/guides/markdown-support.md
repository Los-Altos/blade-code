# 📝 Markdown 支持

Blade 在终端中提供完整的 Markdown 渲染支持，包括语法高亮、表格、代码块等。

## 支持的语法

### 标题

```markdown
# 一级标题
## 二级标题
### 三级标题
```

### 文本样式

```markdown
**粗体文本**
*斜体文本*
~~删除线~~
`行内代码`
```

### 列表

```markdown
- 无序列表项 1
- 无序列表项 2
  - 嵌套列表项

1. 有序列表项 1
2. 有序列表项 2
```

### 代码块

支持语法高亮的代码块：

````markdown
```typescript
function hello(name: string): string {
  return `Hello, ${name}!`;
}
```

```python
def hello(name: str) -> str:
    return f"Hello, {name}!"
```
````

### 表格

```markdown
| 列 1 | 列 2 | 列 3 |
|------|------|------|
| 数据 | 数据 | 数据 |
| 数据 | 数据 | 数据 |
```

### 引用

```markdown
> 这是一段引用文本
> 可以跨多行
```

### 链接

```markdown
[链接文本](https://example.com)
```

### 分隔线

```markdown
---
```

## 语法高亮

Blade 支持多种编程语言的语法高亮：

| 语言 | 标识符 |
|------|--------|
| TypeScript | `typescript`, `ts` |
| JavaScript | `javascript`, `js` |
| Python | `python`, `py` |
| Go | `go`, `golang` |
| Rust | `rust`, `rs` |
| Java | `java` |
| C/C++ | `c`, `cpp` |
| Shell | `bash`, `sh`, `shell` |
| JSON | `json` |
| YAML | `yaml`, `yml` |
| Markdown | `markdown`, `md` |
| SQL | `sql` |
| HTML | `html` |
| CSS | `css` |
| Diff | `diff` |

## 主题适配

Markdown 渲染会自动适配当前主题的配色方案：

- 代码块背景色
- 语法高亮颜色
- 表格边框颜色
- 引用文本颜色

使用 `/theme` 命令切换主题时，Markdown 渲染会自动更新。

## 终端限制

由于终端的限制，部分 Markdown 语法可能无法完美渲染：

| 语法 | 支持情况 |
|------|----------|
| 图片 | ❌ 不支持（显示为链接） |
| 复杂表格 | ⚠️ 部分支持 |
| HTML 标签 | ❌ 不支持 |
| 脚注 | ❌ 不支持 |
| 任务列表 | ✅ 支持 |
| 嵌套列表 | ✅ 支持 |
| 代码块 | ✅ 支持 |

## AI 输出格式

AI 的回复会自动使用 Markdown 格式：

```
用户: 解释什么是 TypeScript

AI: ## TypeScript 简介

TypeScript 是 JavaScript 的超集，添加了静态类型系统。

### 主要特性

1. **静态类型** - 编译时类型检查
2. **类型推断** - 自动推断变量类型
3. **接口** - 定义对象结构

### 示例代码

```typescript
interface User {
  name: string;
  age: number;
}

function greet(user: User): string {
  return `Hello, ${user.name}!`;
}
```
```

## 相关资源

- [主题配置](../configuration/themes.md) - 主题自定义
- [快速开始](../getting-started/quick-start.md) - 基础使用
