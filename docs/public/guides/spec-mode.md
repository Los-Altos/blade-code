# 📐 Spec 模式

Spec 模式是 Blade 的结构化开发工作流，通过规格文件（Spec）驱动复杂功能的迭代开发。

## 概述

Spec 模式的核心理念：

1. **规格先行** - 先定义功能规格，再实现代码
2. **变更追踪** - 记录每次变更的详细信息
3. **迭代开发** - 支持多轮迭代，逐步完善
4. **可审计** - 所有变更可追溯

## 启动方式

### CLI 参数

```bash
blade --permission-mode spec
```

### 运行时切换

在交互界面按 `Shift+Tab` 循环切换权限模式，直到显示 `Spec`。

## 工作流程

```
┌─────────────────────────────────────────────────────────────┐
│                      Spec 模式工作流                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   1. 进入 Spec 模式                                         │
│      blade --permission-mode spec                           │
│                         ↓                                   │
│   2. 描述功能需求                                           │
│      "实现用户认证功能"                                      │
│                         ↓                                   │
│   3. AI 创建/更新 Spec 文件                                 │
│      .blade/specs/user-auth.md                              │
│                         ↓                                   │
│   4. 用户审核 Spec                                          │
│      确认功能范围和实现方案                                  │
│                         ↓                                   │
│   5. AI 实现功能                                            │
│      按 Spec 逐步实现                                       │
│                         ↓                                   │
│   6. 记录变更                                               │
│      .blade/changes/001-user-model.md                       │
│                         ↓                                   │
│   7. 迭代优化                                               │
│      根据反馈更新 Spec 和实现                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 文件结构

```
.blade/
  ├─ specs/              # 规格文件目录
  │   ├─ user-auth.md    # 用户认证规格
  │   └─ api-design.md   # API 设计规格
  └─ changes/            # 变更记录目录
      ├─ 001-user-model.md
      ├─ 002-auth-service.md
      └─ 003-api-endpoints.md
```

## Spec 文件格式

```markdown
# 用户认证系统

## 概述

实现完整的用户认证功能，包括注册、登录、密码重置。

## 功能需求

### 用户注册

- [ ] 邮箱注册
- [ ] 密码强度验证
- [ ] 邮箱验证

### 用户登录

- [ ] 邮箱/密码登录
- [ ] JWT Token 生成
- [ ] 会话管理

### 密码重置

- [ ] 发送重置邮件
- [ ] 重置链接验证
- [ ] 密码更新

## 技术方案

### 数据模型

```typescript
interface User {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### API 设计

| 端点 | 方法 | 说明 |
|------|------|------|
| /auth/register | POST | 用户注册 |
| /auth/login | POST | 用户登录 |
| /auth/reset-password | POST | 密码重置 |

## 实现状态

- [x] 数据模型设计
- [x] 注册接口
- [ ] 登录接口
- [ ] 密码重置
```

## 变更记录格式

```markdown
# 变更 001: 用户数据模型

## 变更信息

- **日期**: 2024-01-15
- **关联 Spec**: user-auth.md
- **状态**: 已完成

## 变更内容

### 新增文件

- `src/models/User.ts` - 用户数据模型
- `src/types/user.ts` - 用户类型定义

### 修改文件

- `src/index.ts` - 添加模型导出

## 代码变更

```diff
+ // src/models/User.ts
+ export interface User {
+   id: string;
+   email: string;
+   passwordHash: string;
+ }
```

## 测试

- [x] 类型检查通过
- [x] 单元测试通过
```

## Spec 工具

Spec 模式提供专用工具：

| 工具 | 说明 |
|------|------|
| `SpecCreate` | 创建新的 Spec 文件 |
| `SpecUpdate` | 更新现有 Spec |
| `SpecRead` | 读取 Spec 内容 |
| `ChangeRecord` | 记录变更 |

## 使用示例

### 创建新功能

```bash
blade --permission-mode spec

用户: 帮我实现一个用户认证系统

AI: 我来创建功能规格文件...
    [创建 .blade/specs/user-auth.md]
    
    规格文件已创建，包含以下内容：
    - 功能需求
    - 技术方案
    - 实现计划
    
    请审核规格，确认后我将开始实现。
```

### 迭代开发

```bash
用户: 开始实现用户注册功能

AI: 好的，我将按照规格实现用户注册...
    [创建 src/models/User.ts]
    [创建 src/services/auth.ts]
    [记录变更到 .blade/changes/001-user-model.md]
    
    用户注册功能已实现，变更已记录。
    下一步是实现登录功能。
```

### 更新规格

```bash
用户: 需要添加 OAuth 登录支持

AI: 我来更新规格文件...
    [更新 .blade/specs/user-auth.md]
    
    规格已更新，新增 OAuth 登录需求：
    - GitHub OAuth
    - Google OAuth
    
    确认后我将开始实现。
```

## 与 Plan 模式的区别

| 特性 | Spec 模式 | Plan 模式 |
|------|-----------|-----------|
| 用途 | 结构化开发 | 调研和规划 |
| 产出 | Spec + Changes | 方案文档 |
| 工作流 | 迭代开发 | 单次规划 |
| 持久化 | 规格和变更持久化 | 方案文档 |
| 适用场景 | 复杂功能开发 | 技术调研 |

## 最佳实践

### 1. 规格先行

先创建完整的 Spec，再开始实现：

```
帮我创建一个完整的用户认证系统规格，
包括功能需求、技术方案、API 设计
```

### 2. 小步迭代

每次只实现一个小功能，及时记录变更：

```
先实现用户注册功能，完成后记录变更
```

### 3. 及时更新规格

需求变化时更新 Spec：

```
需求变更：需要支持手机号登录，请更新规格
```

### 4. 审核变更记录

定期审核变更记录，确保实现符合规格：

```
显示所有变更记录，我需要审核
```

## 相关资源

- [权限控制](../configuration/permissions.md) - 权限模式详解
- [Plan 模式](plan-mode.md) - 调研和规划
- [Subagents](subagents.md) - 子代理系统
