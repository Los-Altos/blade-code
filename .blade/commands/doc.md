---
description: 为代码生成文档注释
argument-hint: <文件路径>
allowed-tools:
  - Read
  - Edit
  - Glob
---

请为以下代码添加文档注释。

## 目标文件

@$1

## 文档规范

### TypeScript/JavaScript

使用 JSDoc 格式：

```typescript
/**
 * 函数简要描述
 *
 * 详细描述（可选）
 *
 * @param paramName - 参数描述
 * @returns 返回值描述
 * @throws {ErrorType} 错误描述
 * @example
 * ```typescript
 * const result = myFunction('input');
 * console.log(result); // 'output'
 * ```
 */
```

### 类和接口

```typescript
/**
 * 类/接口的简要描述
 *
 * 详细描述，包括：
 * - 主要职责
 * - 使用场景
 * - 重要注意事项
 */
```

## 要求

1. **只添加缺失的文档**：已有文档的跳过
2. **保持简洁**：一句话能说清就不用两句
3. **有意义的描述**：不要重复函数名
4. **添加示例**：对于复杂 API 添加 @example
5. **标注参数类型**：如果 TypeScript 类型不够清晰

## 输出

请使用 Edit 工具逐个添加文档注释，每次添加后简短说明添加了什么。
