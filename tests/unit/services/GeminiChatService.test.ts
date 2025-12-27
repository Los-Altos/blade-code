import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGoogleGenAI = vi.hoisted(() => {
  const instances: any[] = [];
  const generateContentSpy = vi.fn();
  const generateContentStreamSpy = vi.fn();

  class MockGoogleGenAI {
    models = {
      generateContent: generateContentSpy,
      generateContentStream: generateContentStreamSpy,
    };

    constructor(options: any) {
      instances.push(options);
    }
  }

  return {
    MockGoogleGenAI,
    instances,
    generateContentSpy,
    generateContentStreamSpy,
    reset() {
      instances.length = 0;
      generateContentSpy.mockReset();
      generateContentStreamSpy.mockReset();
    },
  };
});

vi.mock('@/logging/Logger.js', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  }),
  LogCategory: { CHAT: 'chat' },
}));

vi.mock('@google/genai', () => ({
  GoogleGenAI: mockGoogleGenAI.MockGoogleGenAI,
}));

import type { Message } from '../../../src/services/ChatServiceInterface.js';
import { GeminiChatService } from '../../../src/services/GeminiChatService.js';

const baseConfig = {
  provider: 'gemini' as const,
  apiKey: 'test-gemini-key',
  baseUrl: '',
  model: 'gemini-2.0-flash',
} as const;

describe('GeminiChatService', () => {
  beforeEach(() => {
    mockGoogleGenAI.reset();
  });

  describe('构造函数', () => {
    it('缺少 apiKey 时应抛出错误', () => {
      expect(
        () =>
          new GeminiChatService({
            provider: 'gemini' as any,
            apiKey: '',
            baseUrl: '',
            model: 'gemini-2.0-flash',
          })
      ).toThrow('apiKey is required in ChatConfig');
    });

    it('缺少 model 时应抛出错误', () => {
      expect(
        () =>
          new GeminiChatService({
            provider: 'gemini' as any,
            apiKey: 'test-key',
            baseUrl: '',
            model: '',
          })
      ).toThrow('model is required in ChatConfig');
    });

    it('正确配置时应成功创建实例', () => {
      const service = new GeminiChatService(baseConfig);
      expect(service).toBeInstanceOf(GeminiChatService);
      expect(mockGoogleGenAI.instances).toHaveLength(1);
      expect(mockGoogleGenAI.instances[0]).toMatchObject({
        apiKey: 'test-gemini-key',
      });
    });
  });

  describe('消息转换', () => {
    it('应正确提取 system 消息到 systemInstruction', async () => {
      const service = new GeminiChatService(baseConfig);

      const messages: Message[] = [
        { role: 'system', content: 'You are a helpful assistant' },
        { role: 'user', content: 'Hello' },
      ];

      mockGoogleGenAI.generateContentSpy.mockResolvedValue({
        candidates: [
          {
            content: { parts: [{ text: 'Hi there!' }] },
            finishReason: 'STOP',
          },
        ],
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, totalTokenCount: 15 },
      });

      await service.chat(messages);

      const request = mockGoogleGenAI.generateContentSpy.mock.calls[0][0];
      expect(request.config.systemInstruction).toBe('You are a helpful assistant');
      expect(request.contents).toHaveLength(1);
      expect(request.contents[0]).toEqual({
        role: 'user',
        parts: [{ text: 'Hello' }],
      });
    });

    it('应正确将 assistant 角色转换为 model', async () => {
      const service = new GeminiChatService(baseConfig);

      const messages: Message[] = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
        { role: 'user', content: 'How are you?' },
      ];

      mockGoogleGenAI.generateContentSpy.mockResolvedValue({
        candidates: [
          {
            content: { parts: [{ text: 'I am doing well!' }] },
            finishReason: 'STOP',
          },
        ],
        usageMetadata: { promptTokenCount: 20, candidatesTokenCount: 10, totalTokenCount: 30 },
      });

      await service.chat(messages);

      const request = mockGoogleGenAI.generateContentSpy.mock.calls[0][0];
      expect(request.contents).toHaveLength(3);
      expect(request.contents[1].role).toBe('model');
    });

    it('应正确转换 tool_calls 为 functionCall', async () => {
      const service = new GeminiChatService(baseConfig);

      const messages: Message[] = [
        { role: 'user', content: 'Search for weather' },
        {
          role: 'assistant',
          content: 'Let me search for that.',
          tool_calls: [
            {
              id: 'tool-1',
              type: 'function',
              function: {
                name: 'search',
                arguments: '{"query":"weather"}',
              },
            },
          ],
        },
        {
          role: 'tool',
          content: 'Weather is sunny',
          tool_call_id: 'tool-1',
        },
      ];

      mockGoogleGenAI.generateContentSpy.mockResolvedValue({
        candidates: [
          {
            content: { parts: [{ text: 'The weather is sunny!' }] },
            finishReason: 'STOP',
          },
        ],
        usageMetadata: { promptTokenCount: 20, candidatesTokenCount: 10, totalTokenCount: 30 },
      });

      await service.chat(messages);

      const request = mockGoogleGenAI.generateContentSpy.mock.calls[0][0];
      // assistant 消息应包含 functionCall
      const modelMsg = request.contents.find((m: any) => m.role === 'model');
      expect(modelMsg).toBeDefined();
      expect(modelMsg.parts).toContainEqual(
        expect.objectContaining({
          functionCall: {
            name: 'search',
            args: { query: 'weather' },
          },
        })
      );
    });

    it('应过滤孤儿 tool 消息', async () => {
      const service = new GeminiChatService(baseConfig);

      // 没有对应 assistant tool_call 的 tool 消息
      const messages: Message[] = [
        { role: 'user', content: 'Hello' },
        {
          role: 'tool',
          content: 'Orphan result',
          tool_call_id: 'non-existent-id',
        },
      ];

      mockGoogleGenAI.generateContentSpy.mockResolvedValue({
        candidates: [
          {
            content: { parts: [{ text: 'Response' }] },
            finishReason: 'STOP',
          },
        ],
        usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 3, totalTokenCount: 8 },
      });

      await service.chat(messages);

      const request = mockGoogleGenAI.generateContentSpy.mock.calls[0][0];
      // 孤儿 tool 消息应被过滤掉
      expect(request.contents).toHaveLength(1);
      expect(request.contents[0]).toEqual({
        role: 'user',
        parts: [{ text: 'Hello' }],
      });
    });
  });

  describe('工具转换', () => {
    it('应正确转换工具定义格式', async () => {
      const service = new GeminiChatService(baseConfig);

      const tools = [
        {
          name: 'get_weather',
          description: 'Get weather for a location',
          parameters: {
            type: 'object',
            properties: {
              location: { type: 'string' },
            },
            required: ['location'],
          },
        },
      ];

      mockGoogleGenAI.generateContentSpy.mockResolvedValue({
        candidates: [
          {
            content: { parts: [{ text: 'Response' }] },
            finishReason: 'STOP',
          },
        ],
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, totalTokenCount: 15 },
      });

      await service.chat([{ role: 'user', content: 'What is the weather?' }], tools);

      const request = mockGoogleGenAI.generateContentSpy.mock.calls[0][0];
      expect(request.config.tools).toHaveLength(1);
      expect(request.config.tools[0].functionDeclarations).toHaveLength(1);
      expect(request.config.tools[0].functionDeclarations[0]).toMatchObject({
        name: 'get_weather',
        description: 'Get weather for a location',
      });
    });
  });

  describe('响应解析', () => {
    it('应正确解析文本响应', async () => {
      const service = new GeminiChatService(baseConfig);

      mockGoogleGenAI.generateContentSpy.mockResolvedValue({
        candidates: [
          {
            content: { parts: [{ text: 'Hello! How can I help you?' }] },
            finishReason: 'STOP',
          },
        ],
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 8, totalTokenCount: 18 },
      });

      const response = await service.chat([{ role: 'user', content: 'Hi' }]);

      expect(response.content).toBe('Hello! How can I help you?');
      expect(response.toolCalls).toBeUndefined();
      expect(response.usage).toEqual({
        promptTokens: 10,
        completionTokens: 8,
        totalTokens: 18,
      });
    });

    it('应正确解析 functionCall 响应', async () => {
      const service = new GeminiChatService(baseConfig);

      mockGoogleGenAI.generateContentSpy.mockResolvedValue({
        candidates: [
          {
            content: {
              parts: [
                { text: 'Let me check the weather.' },
                {
                  functionCall: {
                    name: 'get_weather',
                    args: { location: 'San Francisco' },
                  },
                },
              ],
            },
            finishReason: 'STOP',
          },
        ],
        usageMetadata: { promptTokenCount: 15, candidatesTokenCount: 20, totalTokenCount: 35 },
      });

      const response = await service.chat([{ role: 'user', content: 'Weather in SF?' }]);

      expect(response.content).toBe('Let me check the weather.');
      expect(response.toolCalls).toHaveLength(1);
      expect(response.toolCalls![0]).toMatchObject({
        type: 'function',
        function: {
          name: 'get_weather',
          arguments: '{"location":"San Francisco"}',
        },
      });
    });

    it('应正确处理多个 functionCall', async () => {
      const service = new GeminiChatService(baseConfig);

      mockGoogleGenAI.generateContentSpy.mockResolvedValue({
        candidates: [
          {
            content: {
              parts: [
                {
                  functionCall: {
                    name: 'read_file',
                    args: { path: 'a.txt' },
                  },
                },
                {
                  functionCall: {
                    name: 'read_file',
                    args: { path: 'b.txt' },
                  },
                },
              ],
            },
            finishReason: 'STOP',
          },
        ],
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 15, totalTokenCount: 25 },
      });

      const response = await service.chat([{ role: 'user', content: 'Read both files' }]);

      expect(response.toolCalls).toHaveLength(2);
      const toolCall0 = response.toolCalls![0] as { type: 'function'; function: { name: string } };
      const toolCall1 = response.toolCalls![1] as { type: 'function'; function: { name: string } };
      expect(toolCall0.function.name).toBe('read_file');
      expect(toolCall1.function.name).toBe('read_file');
    });
  });

  describe('updateConfig', () => {
    it('应更新配置并重建客户端', () => {
      const service = new GeminiChatService(baseConfig);
      expect(mockGoogleGenAI.instances).toHaveLength(1);

      service.updateConfig({
        model: 'gemini-1.5-pro',
      });

      expect(mockGoogleGenAI.instances).toHaveLength(2);
      const config = service.getConfig();
      expect(config.model).toBe('gemini-1.5-pro');
    });
  });

  describe('错误处理', () => {
    it('API 错误应向上抛出', async () => {
      const service = new GeminiChatService(baseConfig);
      const error = new Error('Rate limit exceeded');
      mockGoogleGenAI.generateContentSpy.mockRejectedValue(error);

      await expect(service.chat([{ role: 'user', content: 'Hi' }])).rejects.toThrow(
        'Rate limit exceeded'
      );
    });
  });
});
