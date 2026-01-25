/**
 * Blade Web 类型定义
 * 与后端 src/config/types.ts 和 src/store/types.ts 保持一致
 */

export type ProviderType =
  | 'openai-compatible'
  | 'anthropic'
  | 'gemini'
  | 'azure-openai'
  | 'antigravity'
  | 'copilot'

export enum PermissionMode {
  DEFAULT = 'default',
  AUTO_EDIT = 'autoEdit',
  YOLO = 'yolo',
  PLAN = 'plan',
  SPEC = 'spec',
}

export interface ModelConfig {
  id: string
  name: string
  provider: ProviderType
  apiKey: string
  baseUrl: string
  model: string
  temperature?: number
  maxContextTokens?: number
  maxOutputTokens?: number
  topP?: number
  topK?: number
  supportsThinking?: boolean
  thinkingBudget?: number
  apiVersion?: string
  projectId?: string
  providerId?: string
}

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool'

export interface SessionMessage {
  id: string
  role: MessageRole
  content: string
  timestamp: number
  metadata?: Record<string, unknown>
  thinkingContent?: string
}

export interface SessionMetadata {
  sessionId: string
  projectPath: string
  title?: string
  gitBranch?: string
  messageCount: number
  firstMessageTime: string
  lastMessageTime: string
  hasErrors: boolean
  filePath?: string
  isActive?: boolean
}

export interface BusEvent {
  type: string
  properties: Record<string, unknown>
}
