# 子会话语义化对齐落地方案（不向下兼容）

## 目标
- 将 subagent 的执行结果从“工具输出”升级为“独立子会话”
- 主会话仅保存对子会话的引用与摘要，完整过程在子会话中保留
- CLI 与 Web 的 UI 体验一致，可浏览子会话的完整消息流

## 不做的事
- 不考虑向下兼容既有 JSONL schema 或旧会话加载逻辑
- 不保留旧 subagent JSONL 文件与旧会话列表过滤逻辑

## 现状基线
- 会话持久化基于 JSONL，写入入口在 PersistentStore
- subagent 当前由 Task 工具执行，结果回填主会话

## 新的领域模型
### Session
字段建议
- id
- rootId
- parentId
- relationType: "subagent" | null
- title
- status: "running" | "completed" | "failed"
- agentType
- model
- permission
- createdAt
- updatedAt

### Message
- id
- sessionId
- role: "system" | "user" | "assistant"
- parentId
- createdAt

### Part
类型建议
- text
- tool_call
- tool_result
- diff
- patch
- summary
- subtask_ref

### SubtaskRef
挂载在主会话的 message.parts 中
- childSessionId
- agentType
- model
- status
- summary
- startedAt
- finishedAt

## 新的 JSONL schema
建议按事件序列化，一行一条
- session_created
- session_updated
- message_created
- part_created
- part_updated

示例
- {"type":"session_created","data":{...}}
- {"type":"message_created","data":{...}}
- {"type":"part_created","data":{"partType":"subtask_ref",...}}

## 存储与索引
- session 元信息与消息、part 仍落在 JSONL
- 增加子会话索引文件 children/{parentId}.json
- 子会话不再使用 agent_*.jsonl 命名，统一 sessionId.jsonl

## API 设计
### Session API
- createSession({parentId, relationType, agentType, model, permission})
- listSessions({parentId})
- getSession(sessionId)
- updateSession(sessionId, patch)

### Message API
- listMessages(sessionId)
- appendMessage(sessionId, message)
- appendPart(messageId, part)

### Subtask API
- createSubtask({parentSessionId, agentType, prompt, model, permission})
- getSubtask(childSessionId)
- summarizeSubtask(childSessionId)

### Event API
- subscribeSession(sessionId)
- subscribeChildren(parentSessionId)

## 运行时执行流
1. 主会话触发 subagent
2. 生成子会话 sessionId 与 parentId
3. 子会话进入独立 Agent loop
4. 子会话完成时生成 summary part
5. 主会话写入 subtask_ref part

## 权限与治理
- 子会话权限默认独立配置
- 主会话只控制是否允许创建子会话
- 子会话工具权限与模型选择由 agentType 或显式配置决定

## CLI UI 设计
### 主会话展示
- Subtask 卡片
  - 标题：@agentType
  - 状态：running/completed/failed
  - 摘要：summary
  - 快捷键：打开子会话

### 子会话展示
- 与主会话一致的消息流展示
- 支持返回父会话

## Web UI 设计
### 主会话展示
- SubtaskCard 组件
  - 展示状态与摘要
  - 点击打开子会话面板

### 子会话面板
- 独立消息流
- 实时更新状态与新消息

## 关键改造点
### 工具层
- Task 工具不再直接返回完整文本结果
- Task 工具返回 subtask_ref 并触发子会话创建

### 存储层
- SessionService 统一加载新 JSONL 事件
- 删除旧 agent_*.jsonl 的过滤逻辑

### Agent 运行时
- Subagent 执行器从“工具执行”转为“子会话执行”
- 子会话完成后生成 summary part

## 任务拆解
### 数据与存储
- 设计新的 JSONL 事件 schema 与类型定义
- 实现 Session/Message/Part 的新读写层
- 实现 children 索引与查询
- 统一 sessionId 命名与文件路径规则

### 运行时与执行
- Task 工具改造为子会话创建器
- Subagent 执行器改为独立会话运行
- 子会话完成后写入 summary part
- 主会话追加 subtask_ref part

### 权限与配置
- 子会话权限规则定义与解析
- 子会话模型选择规则
- 主会话创建子会话的权限控制

### CLI UI
- SubtaskCard 组件
- 子会话视图与导航
- 主会话与子会话的状态同步

### Web UI
- SubtaskCard 组件
- 子会话面板与路由
- Session 与 Subsession 的 store 拆分

### 观测与测试
- JSONL 事件写入完整性测试
- 子会话创建与回放测试
- CLI/Web UI 的状态一致性验证

## 风险与约束
- 旧会话不可读取
- 子会话与主会话的权限隔离需严格执行
- JSONL 事件增长可能带来性能压力

## 交付里程碑
1. 新 JSONL schema 与 Session/Message/Part 基础读写
2. Task → 子会话执行链路打通
3. CLI 与 Web 子会话 UI 完成
4. 权限与模型策略完善
