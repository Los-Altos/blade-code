/**
 * Google Gemini Chat Service
 *
 * 使用 @google/genai SDK 实现 Google Gemini API 的聊天服务
 *
 * 主要差异（与 OpenAI API 相比）：
 * 1. 角色名称：model（不是 assistant）
 * 2. System 指令通过 systemInstruction 参数传递
 * 3. 消息格式：{ role, parts: [{ text }] }
 * 4. 工具定义使用 functionDeclarations 格式
 * 5. 工具调用返回 functionCall 而非 tool_calls
 */

import {
  type Content,
  type FunctionDeclaration,
  GoogleGenAI,
  type Part,
  type Tool,
} from '@google/genai';
import type { ChatCompletionMessageToolCall } from 'openai/resources/chat';
import { createLogger, LogCategory } from '../logging/Logger.js';
import type {
  ChatConfig,
  ChatResponse,
  ContentPart,
  IChatService,
  Message,
  StreamChunk,
} from './ChatServiceInterface.js';

const _logger = createLogger(LogCategory.CHAT);

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
 * 清理 JSON Schema 以符合 Gemini API 要求
 * Gemini 不支持某些 JSON Schema 字段（如 $schema, additionalProperties）
 */
function cleanJsonSchemaForGemini(
  schema: Record<string, unknown>
): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(schema)) {
    // 跳过 Gemini 不支持的字段
    if (key === '$schema' || key === 'additionalProperties') {
      continue;
    }

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      // 递归清理嵌套对象
      cleaned[key] = cleanJsonSchemaForGemini(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      // 递归清理数组中的对象
      cleaned[key] = value.map((item) =>
        item && typeof item === 'object' && !Array.isArray(item)
          ? cleanJsonSchemaForGemini(item as Record<string, unknown>)
          : item
      );
    } else {
      cleaned[key] = value;
    }
  }

  return cleaned;
}

export class GeminiChatService implements IChatService {
  private client: GoogleGenAI;
  private config: ChatConfig;

  constructor(config: ChatConfig) {
    this.config = config;

    _logger.debug('🚀 [GeminiChatService] Initializing');
    _logger.debug('⚙️ [GeminiChatService] Config:', {
      model: config.model,
      baseUrl: config.baseUrl,
      temperature: config.temperature,
      maxContextTokens: config.maxContextTokens,
      timeout: config.timeout,
      hasApiKey: !!config.apiKey,
    });

    if (!config.apiKey) {
      _logger.error('❌ [GeminiChatService] apiKey is required');
      throw new Error('apiKey is required in ChatConfig');
    }
    if (!config.model) {
      _logger.error('❌ [GeminiChatService] model is required');
      throw new Error('model is required in ChatConfig');
    }

    this.client = new GoogleGenAI({
      apiKey: config.apiKey,
    });

    _logger.debug('✅ [GeminiChatService] Initialized successfully');
  }

  /**
   * 将内部 Message[] 转换为 Gemini API 格式
   *
   * 关键差异处理：
   * 1. system 消息提取到 systemInstruction
   * 2. assistant → model
   * 3. tool 消息转为 functionResponse
   * 4. tool_calls 转为 functionCall
   */
  private convertToGeminiMessages(messages: Message[]): {
    systemInstruction: string | undefined;
    contents: Content[];
  } {
    // 1. 提取 system 消息
    const systemMsg = messages.find((m) => m.role === 'system');
    const systemInstruction = systemMsg ? getTextContent(systemMsg.content) : undefined;

    // 2. 转换其他消息
    const contents: Content[] = [];
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
        const parts: Part[] = [];

        if (Array.isArray(msg.content)) {
          for (const part of msg.content) {
            if (part.type === 'text') {
              parts.push({ text: part.text });
            } else if (part.type === 'image_url') {
              // Gemini 支持 inline data 或 file URI
              const url = part.image_url.url;
              if (url.startsWith('data:')) {
                // Base64 内联数据
                const match = url.match(/^data:([^;,]+);base64,(.+)$/);
                if (match) {
                  parts.push({
                    inlineData: {
                      mimeType: match[1],
                      data: match[2],
                    },
                  });
                }
              } else {
                // URL - Gemini 可能需要先上传文件
                // 暂时作为文本处理
                parts.push({ text: `[Image: ${url}]` });
              }
            }
          }
        } else {
          parts.push({ text: msg.content });
        }

        contents.push({ role: 'user', parts });
      } else if (msg.role === 'assistant') {
        // Assistant (model) 消息
        const parts: Part[] = [];

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
              _logger.warn(
                `⚠️ [GeminiChatService] Failed to parse tool arguments: ${tc.function.arguments}`
              );
            }

            parts.push({
              functionCall: {
                name: tc.function.name,
                args,
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
          // Gemini 要求 functionResponse 在单独的 content 中
          contents.push({
            role: 'user',
            parts: [
              {
                functionResponse: {
                  name: toolName,
                  response: {
                    result: getTextContent(msg.content),
                  },
                },
              },
            ],
          });
        }
      }
    }

    // Gemini 要求消息必须交替（user/model），并且以 user 开始
    // 合并相邻的同角色消息
    const mergedContents: Content[] = [];
    for (const content of contents) {
      const lastContent = mergedContents[mergedContents.length - 1];
      if (lastContent?.role === content.role) {
        // 合并 parts
        const existingParts = lastContent.parts || [];
        const newParts = content.parts || [];
        lastContent.parts = [...existingParts, ...newParts];
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
   * 将工具定义转换为 Gemini API 格式
   */
  private convertToGeminiTools(
    tools?: Array<{ name: string; description: string; parameters: unknown }>
  ): Tool[] | undefined {
    if (!tools || tools.length === 0) {
      return undefined;
    }

    const functionDeclarations: FunctionDeclaration[] = tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: cleanJsonSchemaForGemini(
        (tool.parameters as Record<string, unknown>) || {
          type: 'object',
          properties: {},
        }
      ),
    }));

    return [{ functionDeclarations }];
  }

  async chat(
    messages: Message[],
    tools?: Array<{
      name: string;
      description: string;
      parameters: unknown;
    }>,
    signal?: AbortSignal
  ): Promise<ChatResponse> {
    const startTime = Date.now();
    _logger.debug('🚀 [GeminiChatService] Starting chat request');
    _logger.debug('📝 [GeminiChatService] Messages count:', messages.length);

    // 过滤孤儿 tool 消息
    const filteredMessages = filterOrphanToolMessages(messages);
    if (filteredMessages.length < messages.length) {
      _logger.debug(
        `🔧 [GeminiChatService] 过滤掉 ${messages.length - filteredMessages.length} 条孤儿 tool 消息`
      );
    }

    const { systemInstruction, contents } =
      this.convertToGeminiMessages(filteredMessages);
    const geminiTools = this.convertToGeminiTools(tools);

    _logger.debug(
      '🔧 [GeminiChatService] Tools count:',
      geminiTools?.[0]?.functionDeclarations?.length || 0
    );
    _logger.debug('📤 [GeminiChatService] Request params:', {
      model: this.config.model,
      contentsCount: contents.length,
      hasSystemInstruction: !!systemInstruction,
      toolsCount: geminiTools?.[0]?.functionDeclarations?.length || 0,
      maxOutputTokens: this.config.maxOutputTokens ?? 4096,
      temperature: this.config.temperature ?? 0.0,
    });

    try {
      const response = await this.client.models.generateContent({
        model: this.config.model,
        contents,
        config: {
          systemInstruction: systemInstruction || undefined,
          maxOutputTokens: this.config.maxOutputTokens ?? 4096,
          temperature: this.config.temperature ?? 0.0,
          tools: geminiTools,
        },
      });

      const requestDuration = Date.now() - startTime;
      _logger.debug(
        '📥 [GeminiChatService] Response received in',
        requestDuration,
        'ms'
      );

      // 解析响应
      let textContent = '';
      const toolCalls: ChatCompletionMessageToolCall[] = [];

      const candidate = response.candidates?.[0];
      const parts = candidate?.content?.parts || [];
      for (const part of parts) {
        if ('text' in part && part.text) {
          textContent += part.text;
        } else if ('functionCall' in part && part.functionCall) {
          const fc = part.functionCall;
          toolCalls.push({
            id: `call_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
            type: 'function',
            function: {
              name: fc.name || '',
              arguments: JSON.stringify(fc.args || {}),
            },
          });
        }
      }

      // 获取 usage 信息
      const usageMetadata = response.usageMetadata;

      const result: ChatResponse = {
        content: textContent,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        usage: {
          promptTokens: usageMetadata?.promptTokenCount || 0,
          completionTokens: usageMetadata?.candidatesTokenCount || 0,
          totalTokens: usageMetadata?.totalTokenCount || 0,
        },
      };

      _logger.debug('✅ [GeminiChatService] Chat completed successfully');
      _logger.debug('📊 [GeminiChatService] Final response:', {
        contentLength: result.content.length,
        toolCallsCount: result.toolCalls?.length || 0,
        usage: result.usage,
      });

      return result;
    } catch (error) {
      const requestDuration = Date.now() - startTime;
      _logger.error(
        '❌ [GeminiChatService] Chat request failed after',
        requestDuration,
        'ms'
      );
      _logger.error('❌ [GeminiChatService] Error details:', error);
      throw error;
    }
  }

  async *streamChat(
    messages: Message[],
    tools?: Array<{
      name: string;
      description: string;
      parameters: unknown;
    }>,
    signal?: AbortSignal
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const startTime = Date.now();
    _logger.debug('🚀 [GeminiChatService] Starting stream request');
    _logger.debug('📝 [GeminiChatService] Messages count:', messages.length);

    // 过滤孤儿 tool 消息
    const filteredMessages = filterOrphanToolMessages(messages);
    if (filteredMessages.length < messages.length) {
      _logger.debug(
        `🔧 [GeminiChatService] 过滤掉 ${messages.length - filteredMessages.length} 条孤儿 tool 消息`
      );
    }

    const { systemInstruction, contents } =
      this.convertToGeminiMessages(filteredMessages);
    const geminiTools = this.convertToGeminiTools(tools);

    _logger.debug(
      '🔧 [GeminiChatService] Stream tools count:',
      geminiTools?.[0]?.functionDeclarations?.length || 0
    );
    _logger.debug('📤 [GeminiChatService] Stream request params:', {
      model: this.config.model,
      contentsCount: contents.length,
      hasSystemInstruction: !!systemInstruction,
      toolsCount: geminiTools?.[0]?.functionDeclarations?.length || 0,
      maxOutputTokens: this.config.maxOutputTokens ?? 4096,
      temperature: this.config.temperature ?? 0.0,
    });

    try {
      const streamResult = await this.client.models.generateContentStream({
        model: this.config.model,
        contents,
        config: {
          systemInstruction: systemInstruction || undefined,
          maxOutputTokens: this.config.maxOutputTokens ?? 4096,
          temperature: this.config.temperature ?? 0.0,
          tools: geminiTools,
        },
      });

      const requestDuration = Date.now() - startTime;
      _logger.debug('📥 [GeminiChatService] Stream started in', requestDuration, 'ms');

      let eventCount = 0;
      let totalContent = '';
      let toolCallsReceived = false;

      for await (const chunk of streamResult) {
        eventCount++;

        const candidate = chunk.candidates?.[0];
        const parts = candidate?.content?.parts || [];
        const usageMetadata = chunk.usageMetadata;

        for (const part of parts) {
          if ('text' in part && part.text) {
            totalContent += part.text;
            yield { content: part.text };
          } else if ('functionCall' in part && part.functionCall) {
            toolCallsReceived = true;
            const fc = part.functionCall;
            yield {
              toolCalls: [
                {
                  id: `call_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
                  type: 'function',
                  function: {
                    name: fc.name || '',
                    arguments: JSON.stringify(fc.args || {}),
                  },
                },
              ],
            };
          }
        }

        // 检查 finish reason
        const finishReason = candidate?.finishReason;
        if (finishReason) {
          _logger.debug('🏁 [GeminiChatService] Stream finished:', finishReason);
          _logger.debug('📊 [GeminiChatService] Stream summary:', {
            totalEvents: eventCount,
            totalContentLength: totalContent.length,
            hadToolCalls: toolCallsReceived,
            duration: Date.now() - startTime + 'ms',
          });

          // 映射 finish reason
          let mappedReason: string | undefined;
          if (finishReason === 'STOP') {
            mappedReason = 'stop';
          } else if (finishReason === 'MAX_TOKENS') {
            mappedReason = 'length';
          } else {
            mappedReason = finishReason.toLowerCase();
          }

          const streamChunk: StreamChunk = { finishReason: mappedReason };
          if (usageMetadata) {
            streamChunk.usage = {
              promptTokens: usageMetadata.promptTokenCount || 0,
              completionTokens: usageMetadata.candidatesTokenCount || 0,
              totalTokens: usageMetadata.totalTokenCount || 0,
            };
          }
          yield streamChunk;
        } else if (usageMetadata) {
          yield {
            usage: {
              promptTokens: usageMetadata.promptTokenCount || 0,
              completionTokens: usageMetadata.candidatesTokenCount || 0,
              totalTokens: usageMetadata.totalTokenCount || 0,
            },
          };
        }
      }

      _logger.debug('✅ [GeminiChatService] Stream completed successfully');
    } catch (error) {
      const requestDuration = Date.now() - startTime;
      _logger.error(
        '❌ [GeminiChatService] Stream request failed after',
        requestDuration,
        'ms'
      );
      _logger.error('❌ [GeminiChatService] Stream error details:', error);
      throw error;
    }
  }

  getConfig(): ChatConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<ChatConfig>): void {
    _logger.debug('🔄 [GeminiChatService] Updating configuration');

    this.config = { ...this.config, ...newConfig };

    this.client = new GoogleGenAI({
      apiKey: this.config.apiKey,
    });

    _logger.debug('✅ [GeminiChatService] Configuration updated successfully');
  }
}
