/**
 * Google Antigravity Chat Service
 *
 * 使用 Antigravity API 实现聊天服务。
 * Antigravity 是 Google 的统一网关 API，通过 Gemini 风格接口访问多种 AI 模型。
 *
 * API 特点：
 * 1. 使用 OAuth 2.0 Bearer token 认证
 * 2. 端点：cloudcode-pa.googleapis.com
 * 3. 请求格式：Gemini 风格（contents, systemInstruction, tools）
 * 4. 支持模型：Claude、Gemini、GPT-OSS
 */

import type { ChatCompletionMessageToolCall } from 'openai/resources/chat';
import { createLogger, LogCategory } from '../logging/Logger.js';
import { AntigravityAuth } from './antigravity/AntigravityAuth.js';
import {
  ANTIGRAVITY_API_ENDPOINTS,
  ANTIGRAVITY_API_PATHS,
  type AntigravityContent,
  type AntigravityPart,
  type AntigravityRequest,
  type AntigravityResponse,
  type AntigravityStreamChunk,
  type AntigravityTool,
} from './antigravity/types.js';
import type {
  ChatConfig,
  ChatResponse,
  ContentPart,
  IChatService,
  Message,
  StreamChunk,
} from './ChatServiceInterface.js';

const logger = createLogger(LogCategory.CHAT);

// 默认项目 ID（用户可通过配置覆盖）
const DEFAULT_PROJECT_ID = 'blade-client';

/**
 * 过滤孤儿 tool 消息
 */
function filterOrphanToolMessages(messages: Message[]): Message[] {
  const availableToolCallIds = new Set<string>();
  for (const msg of messages) {
    if (msg.role === 'assistant' && msg.tool_calls) {
      for (const tc of msg.tool_calls) {
        availableToolCallIds.add(tc.id);
      }
    }
  }

  return messages.filter((msg) => {
    if (msg.role === 'tool') {
      if (!msg.tool_call_id) {
        return false;
      }
      return availableToolCallIds.has(msg.tool_call_id);
    }
    return true;
  });
}

/**
 * 将内部 Message 内容转为纯文本
 */
function getTextContent(content: string | ContentPart[]): string {
  if (typeof content === 'string') {
    return content;
  }
  return content
    .filter((p) => p.type === 'text')
    .map((p) => p.text)
    .join('\n');
}

/**
 * 清理 JSON Schema 以符合 Antigravity API 要求
 * 不支持的字段：const, $ref, $defs, $schema, $id, default, examples
 */
function cleanJsonSchemaForAntigravity(
  schema: Record<string, unknown>
): Record<string, unknown> {
  const unsupportedFields = [
    'const',
    '$ref',
    '$defs',
    '$schema',
    '$id',
    'default',
    'examples',
  ];
  const cleaned: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(schema)) {
    // 跳过不支持的字段
    if (unsupportedFields.includes(key)) {
      // const 转换为 enum
      if (key === 'const') {
        cleaned.enum = [value];
      }
      continue;
    }

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      cleaned[key] = cleanJsonSchemaForAntigravity(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      cleaned[key] = value.map((item) =>
        item && typeof item === 'object' && !Array.isArray(item)
          ? cleanJsonSchemaForAntigravity(item as Record<string, unknown>)
          : item
      );
    } else {
      cleaned[key] = value;
    }
  }

  return cleaned;
}

export class AntigravityChatService implements IChatService {
  private config: ChatConfig;
  private auth: AntigravityAuth;
  private projectId: string;
  private projectIdInitialized = false;

  constructor(config: ChatConfig) {
    this.config = config;
    this.auth = AntigravityAuth.getInstance();
    // 从 config 中获取 projectId，或使用默认值
    // biome-ignore lint/suspicious/noExplicitAny: config 可能包含 projectId
    this.projectId = (config as any).projectId || DEFAULT_PROJECT_ID;

    logger.debug('🚀 [AntigravityChatService] Initializing');
    logger.debug('⚙️ [AntigravityChatService] Config:', {
      model: config.model,
      projectId: this.projectId,
      temperature: config.temperature,
      maxOutputTokens: config.maxOutputTokens,
    });
  }

  /**
   * 调用 loadCodeAssist 获取项目信息
   * 在首次请求前调用，确保有有效的项目 ID
   */
  private async ensureProjectId(): Promise<void> {
    if (this.projectIdInitialized) {
      return;
    }

    try {
      logger.debug('🔄 [AntigravityChatService] Loading project info via loadCodeAssist...');

      const accessToken = await this.auth.getAccessToken();
      const url = `${ANTIGRAVITY_API_ENDPOINTS.production}${ANTIGRAVITY_API_PATHS.loadCodeAssist}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'antigravity/1.11.5 darwin/arm64',
          'X-Goog-Api-Client': 'google-cloud-sdk vscode_cloudshelleditor/0.1',
          'Client-Metadata': JSON.stringify({
            ideType: 'IDE_UNSPECIFIED',
            platform: 'PLATFORM_UNSPECIFIED',
            pluginType: 'GEMINI',
          }),
        },
        body: JSON.stringify({}),
      });

      if (response.ok) {
        const data = await response.json();
        logger.debug('[AntigravityChatService] loadCodeAssist response:', JSON.stringify(data));

        // 尝试从响应中获取项目 ID
        const projectId =
          data.project ||
          data.projectId ||
          data.cloudProject?.projectId ||
          data.cloudProject?.project;

        if (projectId) {
          this.projectId = projectId;
          logger.debug(`✅ [AntigravityChatService] Got project ID: ${this.projectId}`);
        } else {
          // 如果没有获取到项目 ID，尝试调用 onboardUser
          logger.debug('⚠️ [AntigravityChatService] No project ID, trying onboardUser...');
          const onboardProjectId = await this.tryOnboardUser();
          if (onboardProjectId) {
            this.projectId = onboardProjectId;
          } else {
            // 最后尝试不设置项目 ID（设为空字符串）
            this.projectId = '';
            logger.debug('⚠️ [AntigravityChatService] Using empty project ID');
          }
        }
      } else {
        const errorText = await response.text();
        logger.warn(`loadCodeAssist failed: ${response.status} - ${errorText}`);
        // 尝试 onboardUser
        const onboardProjectId = await this.tryOnboardUser();
        this.projectId = onboardProjectId || '';
      }
    } catch (error) {
      logger.warn('Failed to load project info:', error);
      this.projectId = '';
    }

    this.projectIdInitialized = true;
  }

  /**
   * 尝试调用 onboardUser API 获取项目 ID
   */
  private async tryOnboardUser(): Promise<string | null> {
    try {
      const accessToken = await this.auth.getAccessToken();
      const url = `${ANTIGRAVITY_API_ENDPOINTS.production}${ANTIGRAVITY_API_PATHS.onboardUser}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'antigravity/1.11.5 darwin/arm64',
          'X-Goog-Api-Client': 'google-cloud-sdk vscode_cloudshelleditor/0.1',
          'Client-Metadata': JSON.stringify({
            ideType: 'IDE_UNSPECIFIED',
            platform: 'PLATFORM_UNSPECIFIED',
            pluginType: 'GEMINI',
          }),
        },
        body: JSON.stringify({
          tierId: 'standard-tier',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        logger.debug('[AntigravityChatService] onboardUser response:', JSON.stringify(data));

        const projectId =
          data.project ||
          data.projectId ||
          data.cloudProject?.projectId ||
          data.cloudProject?.project;

        if (projectId) {
          logger.debug(`✅ [AntigravityChatService] Got project ID from onboardUser: ${projectId}`);
          return projectId;
        }
      } else {
        const errorText = await response.text();
        logger.debug(`onboardUser failed: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      logger.debug('onboardUser error:', error);
    }
    return null;
  }

  /**
   * 将内部 Message[] 转换为 Antigravity API 格式
   */
  private convertToAntigravityMessages(messages: Message[]): {
    systemInstruction: { parts: Array<{ text: string }> } | undefined;
    contents: AntigravityContent[];
  } {
    // 1. 提取 system 消息
    const systemMsg = messages.find((m) => m.role === 'system');
    const systemInstruction = systemMsg
      ? { parts: [{ text: getTextContent(systemMsg.content) }] }
      : undefined;

    // 2. 转换其他消息
    const contents: AntigravityContent[] = [];
    const nonSystemMessages = messages.filter((m) => m.role !== 'system');

    // 收集 tool_call id 到 name 的映射
    const toolCallIdToName = new Map<string, string>();
    for (const msg of nonSystemMessages) {
      if (msg.role === 'assistant' && msg.tool_calls) {
        for (const tc of msg.tool_calls) {
          if (tc.type === 'function') {
            toolCallIdToName.set(tc.id, tc.function.name);
          }
        }
      }
    }

    for (const msg of nonSystemMessages) {
      if (msg.role === 'user') {
        // User 消息
        const parts: AntigravityPart[] = [];

        if (Array.isArray(msg.content)) {
          for (const part of msg.content) {
            if (part.type === 'text') {
              parts.push({ text: part.text });
            }
            // 图片暂不支持
          }
        } else {
          parts.push({ text: msg.content });
        }

        contents.push({ role: 'user', parts });
      } else if (msg.role === 'assistant') {
        // Assistant (model) 消息
        const parts: AntigravityPart[] = [];

        // 添加文本内容
        const text = getTextContent(msg.content);
        if (text) {
          parts.push({ text });
        }

        // 转换 tool_calls 为 functionCall
        if (msg.tool_calls) {
          for (const tc of msg.tool_calls) {
            if (tc.type !== 'function') continue;

            let args: Record<string, unknown> = {};
            try {
              args = JSON.parse(tc.function.arguments || '{}');
            } catch {
              logger.warn(`Failed to parse tool arguments: ${tc.function.arguments}`);
            }

            parts.push({
              functionCall: {
                name: tc.function.name,
                args,
                id: tc.id,
              },
            });
          }
        }

        if (parts.length > 0) {
          contents.push({ role: 'model', parts });
        }
      } else if (msg.role === 'tool') {
        // Tool 消息转为 functionResponse
        const toolName = toolCallIdToName.get(msg.tool_call_id || '');
        if (toolName) {
          let result: Record<string, unknown>;
          try {
            result = JSON.parse(getTextContent(msg.content));
          } catch {
            result = { result: getTextContent(msg.content) };
          }

          contents.push({
            role: 'user',
            parts: [
              {
                functionResponse: {
                  name: toolName,
                  id: msg.tool_call_id,
                  response: result,
                },
              },
            ],
          });
        }
      }
    }

    // Antigravity 要求消息必须交替（user/model），并且以 user 开始
    // 合并相邻的同角色消息
    const mergedContents: AntigravityContent[] = [];
    for (const content of contents) {
      const lastContent = mergedContents[mergedContents.length - 1];
      if (lastContent?.role === content.role) {
        lastContent.parts = [...lastContent.parts, ...content.parts];
      } else {
        mergedContents.push(content);
      }
    }

    // 确保第一条消息是 user
    if (mergedContents.length > 0 && mergedContents[0].role !== 'user') {
      mergedContents.unshift({
        role: 'user',
        parts: [{ text: '[Conversation start]' }],
      });
    }

    return { systemInstruction, contents: mergedContents };
  }

  /**
   * 将工具定义转换为 Antigravity API 格式
   */
  private convertToAntigravityTools(
    tools?: Array<{ name: string; description: string; parameters: unknown }>
  ): AntigravityTool[] | undefined {
    if (!tools || tools.length === 0) {
      return undefined;
    }

    const functionDeclarations = tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: cleanJsonSchemaForAntigravity(
        (tool.parameters as Record<string, unknown>) || {
          type: 'object',
          properties: {},
        }
      ),
    }));

    return [{ functionDeclarations }];
  }

  /**
   * 发起 API 请求
   */
  private async makeRequest(
    path: string,
    body: AntigravityRequest,
    signal?: AbortSignal
  ): Promise<Response> {
    const accessToken = await this.auth.getAccessToken();
    const url = `${ANTIGRAVITY_API_ENDPOINTS.production}${path}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'antigravity/1.11.5 darwin/arm64',
        'X-Goog-Api-Client': 'google-cloud-sdk vscode_cloudshelleditor/0.1',
        'Client-Metadata': JSON.stringify({
          ideType: 'IDE_UNSPECIFIED',
          platform: 'PLATFORM_UNSPECIFIED',
          pluginType: 'GEMINI',
        }),
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`Antigravity API error: ${response.status} - ${errorText}`);

      if (response.status === 401) {
        throw new Error('Authentication expired. Please run /login again.');
      }
      if (response.status === 403) {
        throw new Error(
          'Permission denied. Please check your Google account permissions.'
        );
      }
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please wait a moment and try again.');
      }

      throw new Error(`Antigravity API error: ${response.status} - ${errorText}`);
    }

    return response;
  }

  async chat(
    messages: Message[],
    tools?: Array<{ name: string; description: string; parameters: unknown }>,
    signal?: AbortSignal
  ): Promise<ChatResponse> {
    const startTime = Date.now();
    logger.debug('🚀 [AntigravityChatService] Starting chat request');
    logger.debug('📝 [AntigravityChatService] Messages count:', messages.length);

    // 确保有有效的项目 ID
    await this.ensureProjectId();

    // 过滤孤儿 tool 消息
    const filteredMessages = filterOrphanToolMessages(messages);
    if (filteredMessages.length < messages.length) {
      logger.debug(
        `Filtered ${messages.length - filteredMessages.length} orphan tool messages`
      );
    }

    const { systemInstruction, contents } =
      this.convertToAntigravityMessages(filteredMessages);
    const antigravityTools = this.convertToAntigravityTools(tools);

    const requestBody: AntigravityRequest = {
      project: this.projectId,
      model: this.config.model,
      request: {
        contents,
        systemInstruction,
        generationConfig: {
          maxOutputTokens: this.config.maxOutputTokens ?? 8192,
          temperature: this.config.temperature ?? 0.7,
        },
        tools: antigravityTools,
      },
      userAgent: 'blade',
      requestId: `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    };

    logger.debug('📤 [AntigravityChatService] Request:', {
      model: this.config.model,
      contentsCount: contents.length,
      hasSystemInstruction: !!systemInstruction,
      toolsCount: antigravityTools?.[0]?.functionDeclarations?.length || 0,
    });

    try {
      const response = await this.makeRequest(
        ANTIGRAVITY_API_PATHS.generateContent,
        requestBody,
        signal
      );

      const data = (await response.json()) as AntigravityResponse;

      const requestDuration = Date.now() - startTime;
      logger.debug(
        '📥 [AntigravityChatService] Response received in',
        requestDuration,
        'ms'
      );

      // 解析响应
      let textContent = '';
      const toolCalls: ChatCompletionMessageToolCall[] = [];

      const candidate = data.response?.candidates?.[0];
      const parts = candidate?.content?.parts || [];

      for (const part of parts) {
        if (part.text) {
          textContent += part.text;
        } else if (part.functionCall) {
          const fc = part.functionCall;
          toolCalls.push({
            id: fc.id || `call_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
            type: 'function',
            function: {
              name: fc.name,
              arguments: JSON.stringify(fc.args || {}),
            },
          });
        }
      }

      const usageMetadata = data.response?.usageMetadata;

      const result: ChatResponse = {
        content: textContent,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        usage: {
          promptTokens: usageMetadata?.promptTokenCount || 0,
          completionTokens: usageMetadata?.candidatesTokenCount || 0,
          totalTokens: usageMetadata?.totalTokenCount || 0,
        },
      };

      logger.debug('✅ [AntigravityChatService] Chat completed:', {
        contentLength: result.content.length,
        toolCallsCount: result.toolCalls?.length || 0,
        usage: result.usage,
      });

      return result;
    } catch (error) {
      const requestDuration = Date.now() - startTime;
      logger.error(
        '❌ [AntigravityChatService] Chat failed after',
        requestDuration,
        'ms'
      );
      logger.error('❌ [AntigravityChatService] Error:', error);
      throw error;
    }
  }

  async *streamChat(
    messages: Message[],
    tools?: Array<{ name: string; description: string; parameters: unknown }>,
    signal?: AbortSignal
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const startTime = Date.now();
    logger.debug('🚀 [AntigravityChatService] Starting stream request');

    // 确保有有效的项目 ID
    await this.ensureProjectId();

    // 过滤孤儿 tool 消息
    const filteredMessages = filterOrphanToolMessages(messages);
    const { systemInstruction, contents } =
      this.convertToAntigravityMessages(filteredMessages);
    const antigravityTools = this.convertToAntigravityTools(tools);

    const requestBody: AntigravityRequest = {
      project: this.projectId,
      model: this.config.model,
      request: {
        contents,
        systemInstruction,
        generationConfig: {
          maxOutputTokens: this.config.maxOutputTokens ?? 8192,
          temperature: this.config.temperature ?? 0.7,
        },
        tools: antigravityTools,
      },
      userAgent: 'blade',
      requestId: `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    };

    try {
      const accessToken = await this.auth.getAccessToken();
      const url = `${ANTIGRAVITY_API_ENDPOINTS.production}${ANTIGRAVITY_API_PATHS.streamGenerateContent}?alt=sse`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          'User-Agent': 'antigravity/1.11.5 darwin/arm64',
          'X-Goog-Api-Client': 'google-cloud-sdk vscode_cloudshelleditor/0.1',
          'Client-Metadata': JSON.stringify({
            ideType: 'IDE_UNSPECIFIED',
            platform: 'PLATFORM_UNSPECIFIED',
            pluginType: 'GEMINI',
          }),
        },
        body: JSON.stringify(requestBody),
        signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Antigravity API error: ${response.status} - ${errorText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let eventCount = 0;

      const requestDuration = Date.now() - startTime;
      logger.debug(
        '📥 [AntigravityChatService] Stream started in',
        requestDuration,
        'ms'
      );

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // 解析 SSE 事件
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              yield { finishReason: 'stop' };
              continue;
            }

            try {
              const chunk = JSON.parse(data) as AntigravityStreamChunk;
              eventCount++;

              const candidate = chunk.candidates?.[0];
              const parts = candidate?.content?.parts || [];

              for (const part of parts) {
                if (part.text) {
                  yield { content: part.text };
                } else if (part.functionCall) {
                  const fc = part.functionCall;
                  yield {
                    toolCalls: [
                      {
                        id:
                          fc.id ||
                          `call_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
                        type: 'function',
                        function: {
                          name: fc.name,
                          arguments: JSON.stringify(fc.args || {}),
                        },
                      },
                    ],
                  };
                }
              }

              const finishReason = candidate?.finishReason;
              if (finishReason) {
                const mappedReason =
                  finishReason === 'STOP'
                    ? 'stop'
                    : finishReason === 'MAX_TOKENS'
                      ? 'length'
                      : finishReason.toLowerCase();
                yield { finishReason: mappedReason };
              }
            } catch (_parseError) {
              logger.debug('Failed to parse SSE data:', data);
            }
          }
        }
      }

      logger.debug('✅ [AntigravityChatService] Stream completed:', {
        eventCount,
        duration: Date.now() - startTime + 'ms',
      });
    } catch (error) {
      const requestDuration = Date.now() - startTime;
      logger.error(
        '❌ [AntigravityChatService] Stream failed after',
        requestDuration,
        'ms'
      );
      logger.error('❌ [AntigravityChatService] Error:', error);
      throw error;
    }
  }

  getConfig(): ChatConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<ChatConfig>): void {
    logger.debug('🔄 [AntigravityChatService] Updating configuration');
    this.config = { ...this.config, ...newConfig };
    // biome-ignore lint/suspicious/noExplicitAny: config 可能包含 projectId
    if ((newConfig as any).projectId) {
      // biome-ignore lint/suspicious/noExplicitAny: config 可能包含 projectId
      this.projectId = (newConfig as any).projectId;
    }
    logger.debug('✅ [AntigravityChatService] Configuration updated');
  }
}
