# Spec Mode 用户指南

Spec Mode（规格驱动开发模式）是 Blade Code 的高级功能，帮助你在编码前先定义清晰的规格说明，提高 AI 辅助编码的质量和效率。

## 什么是 Spec-Driven Development？

Spec-Driven Development (SDD) 是一种结构化的开发方法论，核心理念是：

1. **先规划后编码** - 在编写代码前，先记录项目目标、架构和需求
2. **单一信息源** - 通过 spec 文件作为项目的权威参考
3. **结构化工作流** - 遵循 Requirements → Design → Tasks → Implementation 的流程

研究表明，使用结构化规格的 LLM 输出质量显著提高：

> "1 iteration with structure was of similar accuracy to 8 iterations with unstructured prompts"

## 快速开始

### 进入 Spec 模式

按 `Shift+Tab` 循环切换模式：

```
DEFAULT → AUTO_EDIT → PLAN → SPEC → DEFAULT
```

状态栏会显示当前模式和进度：

```
📋 spec: tasks 3/5 (shift+tab to cycle)
```

### 对话驱动工作流

进入 Spec 模式后，**无需记忆任何命令**，只需与 AI 自然对话：

**示例对话：**

```
你: 我想实现用户认证功能

AI: 好的，让我为你创建一个新的 Spec。
    [调用 EnterSpecMode 工具]
    ✅ 已创建 Spec: user-auth

    现在让我们定义需求。这个认证功能需要支持哪些登录方式？

你: 需要支持邮箱密码登录和 OAuth2

AI: 明白了，让我更新需求文档...
    [调用 UpdateSpec 工具]

    需求已记录。接下来进入设计阶段，还是直接开始任务分解？

你: 直接开始任务分解

AI: [调用 TransitionSpecPhase 工具]
    已进入任务分解阶段。让我创建任务列表...
    [调用 AddTask 工具]

    任务 1: 创建 User 模型
    任务 2: 实现邮箱密码登录
    任务 3: 集成 OAuth2

    准备好开始实现了吗？

你: 开始吧

AI: [调用 UpdateTaskStatus 工具]
    开始任务 1: 创建 User 模型...
```

## 六阶段工作流

Spec Mode 遵循六个阶段：

```
┌───────┐    ┌─────────────┐    ┌──────────┐    ┌───────┐    ┌──────────────┐    ┌──────┐
│ init  │ → │ requirements│ → │  design  │ → │ tasks │ → │implementation│ → │ done │
│提案创建│    │  需求定义    │    │ 架构设计  │    │任务分解│    │    实现中     │    │已完成│
└───────┘    └─────────────┘    └──────────┘    └───────┘    └──────────────┘    └──────┘
```

### 1. Init（提案创建）

进入 Spec 模式后，告诉 AI 你想实现什么功能，AI 会自动创建 Spec。

**你可以说：**
- "我想实现用户认证功能"
- "帮我添加暗黑模式支持"
- "重构订单处理模块"

### 2. Requirements（需求定义）

AI 会使用 EARS 格式帮你定义需求：

- **Ubiquitous** - "系统应..."
- **Event-driven** - "当 [触发条件] 时，系统应..."
- **Unwanted** - "如果 [条件]，则系统应..."
- **State-driven** - "当处于 [状态] 时，系统应..."

**你可以说：**
- "需求定义好了，继续"
- "还需要添加一个需求：支持记住登录状态"

### 3. Design（架构设计）

可选阶段，AI 会创建技术架构文档，包含：

- 组件图（Mermaid）
- 数据流图
- API 契约
- 数据库 Schema 变更

**你可以说：**
- "跳过设计阶段，直接任务分解"
- "帮我画一个架构图"

### 4. Tasks（任务分解）

AI 会将设计拆分为原子任务，每个任务包含：

- 标题和描述
- 复杂度（low/medium/high）
- 依赖关系
- 影响的文件

**你可以说：**
- "任务分解好了，开始实现"
- "把这个任务拆成两个更小的任务"

### 5. Implementation（实现）

AI 会逐个执行任务，你可以：

**你可以说：**
- "开始实现"
- "这个任务完成了"
- "先跳过这个任务"

### 6. Done（完成）

当所有任务完成后，AI 会归档 Spec 并自动退出 Spec 模式。

**你可以说：**
- "全部完成了"
- "归档这个 Spec"

## AI 工具

在 Spec 模式下，AI 会自动使用这些工具：

| 工具 | 用途 |
|------|------|
| `EnterSpecMode` | 创建新 Spec |
| `UpdateSpec` | 更新文档（proposal/requirements/design/tasks） |
| `GetSpecContext` | 获取当前上下文和进度 |
| `TransitionSpecPhase` | 阶段转换 |
| `AddTask` | 添加任务 |
| `UpdateTaskStatus` | 更新任务状态 |
| `ValidateSpec` | 验证完整性 |
| `ExitSpecMode` | 退出/归档 |

## 目录结构

Spec Mode 在项目根目录创建以下结构：

```
.blade/
├── specs/              # 权威规格（单一信息源）
│   └── [domain]/
│       └── spec.md
├── changes/            # 活跃的变更提案
│   └── <feature>/
│       ├── proposal.md    # 提案描述
│       ├── spec.md        # 规格文件
│       ├── requirements.md # 需求文档
│       ├── design.md      # 设计文档
│       ├── tasks.md       # 任务分解
│       └── .meta.json     # 元数据
├── archive/            # 已完成的变更
└── steering/           # 全局治理文档
    ├── constitution.md # 项目治理原则
    ├── product.md      # 产品愿景
    ├── tech.md         # 技术栈约束
    └── structure.md    # 代码组织模式
```

## Steering Documents

Steering Documents 是项目级的全局治理文档，为 AI 提供上下文：

### constitution.md

定义项目的核心原则和约束，例如：
- 代码风格要求
- 安全准则
- 性能目标

### product.md

描述产品愿景和目标：
- 目标用户
- 核心功能
- 成功指标

### tech.md

记录技术栈和约束：
- 使用的框架和库
- 兼容性要求
- 部署环境

### structure.md

描述代码组织模式：
- 目录结构
- 命名约定
- 模块划分

## 最佳实践

### 1. 从小开始

对于简单任务，使用 Plan Mode 即可。Spec Mode 更适合：
- 需要多个文件变更的功能
- 涉及架构决策的任务
- 需要团队协作的特性

### 2. 保持 Spec 小而聚焦

每个 Spec 应该解决一个明确的问题。如果 Spec 太大，考虑拆分为多个独立的 Specs。

### 3. 清晰表达意图

虽然是对话驱动，但清晰表达你的需求可以让 AI 更好地理解和执行：

- ✅ "我需要一个支持 JWT 和 OAuth2 的用户认证系统"
- ❌ "帮我做个登录"

### 4. 利用 Steering Documents

在开始任何 Spec 之前，先告诉 AI 你的项目约束，AI 会自动创建 Steering Documents。

### 5. 及时反馈

如果 AI 的理解有偏差，及时纠正：

- "不是这样的，我需要的是..."
- "这个任务太大了，拆成更小的步骤"

## 与 Plan Mode 的区别

| 特性 | Plan Mode | Spec Mode |
|------|-----------|-----------|
| 复杂度 | 简单任务 | 复杂功能 |
| 文档 | 单个计划文件 | 多个结构化文档 |
| 阶段 | 单阶段 | 六阶段工作流 |
| 持久化 | 临时 | 永久归档 |
| 任务追踪 | 无 | 依赖管理、进度显示 |
| 适用场景 | Bug 修复、小改动 | 新功能、重构 |
| 模式切换 | Shift+Tab | Shift+Tab |
| 状态栏 | `‖ plan mode on` | `📋 spec: tasks 3/5` |

## 故障排除

### AI 没有使用 Spec 工具

确保你已经通过 Shift+Tab 进入了 Spec 模式，状态栏应该显示 `📋 spec:`。

### 阶段转换失败

某些阶段转换是不允许的，例如不能直接从 `init` 跳到 `implementation`。按顺序完成各阶段即可。

### 任务进度显示 0/0

确保在任务分解阶段让 AI 使用 `AddTask` 工具添加任务。你可以说："帮我添加任务到任务列表"。

### 想要退出 Spec 模式

按 `Shift+Tab` 切换到其他模式，或者说"退出 Spec 模式"。

## 参考资源

- [GitHub Spec Kit](https://github.com/github/spec-kit) - GitHub 官方 SDD 工具包
- [OpenSpec](https://github.com/Fission-AI/OpenSpec) - 轻量级规格工作流
- [Anthropic Best Practices](https://www.anthropic.com/engineering/claude-code-best-practices)
