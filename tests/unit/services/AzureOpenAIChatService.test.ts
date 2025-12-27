import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockAzureOpenAI = vi.hoisted(() => {
  const instances: any[] = [];
  const createSpy = vi.fn();

  class MockAzureOpenAI {
    chat = {
      completions: {
        create: createSpy,
      },
    };

    constructor(options: any) {
      instances.push(options);
    }
  }

  return {
    MockAzureOpenAI,
    instances,
    createSpy,
    reset() {
      instances.length = 0;
      createSpy.mockReset();
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

vi.mock('openai', () => ({
  AzureOpenAI: mockAzureOpenAI.MockAzureOpenAI,
}));

import type { Message } from '../../../src/services/ChatServiceInterface.js';
import { AzureOpenAIChatService } from '../../../src/services/AzureOpenAIChatService.js';

const baseConfig = {
  provider: 'azure-openai' as const,
  apiKey: 'test-azure-key',
  baseUrl: 'https://test-resource.openai.azure.com',
  model: 'gpt-4-deployment',
  apiVersion: '2024-08-01-preview',
} as const;

describe('AzureOpenAIChatService', () => {
  beforeEach(() => {
    mockAzureOpenAI.reset();
  });

  describe('构造函数', () => {
    it('缺少 apiKey 时应抛出错误', () => {
      expect(
        () =>
          new AzureOpenAIChatService({
            provider: 'azure-openai',
            apiKey: '',
            baseUrl: 'https://test.openai.azure.com',
            model: 'gpt-4-deployment',
          })
      ).toThrow('apiKey is required in ChatConfig');
    });

    it('缺少 baseUrl 时应抛出错误', () => {
      expect(
        () =>
          new AzureOpenAIChatService({
            provider: 'azure-openai',
            apiKey: 'test-key',
            baseUrl: '',
            model: 'gpt-4-deployment',
          })
      ).toThrow('baseUrl is required in ChatConfig');
    });

    it('缺少 model (deployment) 时应抛出错误', () => {
      expect(
        () =>
          new AzureOpenAIChatService({
            provider: 'azure-openai',
            apiKey: 'test-key',
            baseUrl: 'https://test.openai.azure.com',
            model: '',
          })
      ).toThrow('model (deployment) is required in ChatConfig');
    });

    it('正确配置时应成功创建实例', () => {
      const service = new AzureOpenAIChatService(baseConfig);
      expect(service).toBeInstanceOf(AzureOpenAIChatService);
      expect(mockAzureOpenAI.instances).toHaveLength(1);
      expect(mockAzureOpenAI.instances[0]).toMatchObject({
        apiKey: 'test-azure-key',
        endpoint: 'https://test-resource.openai.azure.com',
        apiVersion: '2024-08-01-preview',
      });
    });

    it('应使用默认 apiVersion', () => {
      const configWithoutVersion = {
        ...baseConfig,
        apiVersion: undefined,
      };
      new AzureOpenAIChatService(configWithoutVersion);
      expect(mockAzureOpenAI.instances[0].apiVersion).toBe('2024-08-01-preview');
    });
  });

  describe('消息转换', () => {
    it('应正确转换基本消息', async () => {
      const service = new AzureOpenAIChatService(baseConfig);

      const messages: Message[] = [
        { role: 'system', content: 'You are a helpful assistant' },
        { role: 'user', content: 'Hello' },
      ];

      mockAzureOpenAI.createSpy.mockResolvedValue({
        choices: [
          {
            message: { content: 'Hi there!', role: 'assistant' },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      });

      await service.chat(messages);

      const request = mockAzureOpenAI.createSpy.mock.calls[0][0];
      expect(request.messages).toHaveLength(2);
      expect(request.messages[0]).toEqual({ role: 'system', content: 'You are a helpful assistant' });
      expect(request.messages[1]).toEqual({ role: 'user', content: 'Hello' });
    });

    it('应正确转换 tool_calls 消息', async () => {
      const service = new AzureOpenAIChatService(baseConfig);

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

      mockAzureOpenAI.createSpy.mockResolvedValue({
        choices: [
          {
            message: { content: 'The weather is sunny!', role: 'assistant' },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 20, completion_tokens: 10, total_tokens: 30 },
      });

      await service.chat(messages);

      const request = mockAzureOpenAI.createSpy.mock.calls[0][0];
      expect(request.messages).toHaveLength(3);
      // 检查 assistant 消息
      expect(request.messages[1]).toMatchObject({
        role: 'assistant',
        tool_calls: expect.arrayContaining([
          expect.objectContaining({
            id: 'tool-1',
            type: 'function',
          }),
        ]),
      });
      // 检查 tool 消息
      expect(request.messages[2]).toMatchObject({
        role: 'tool',
        content: 'Weather is sunny',
        tool_call_id: 'tool-1',
      });
    });

    it('应过滤孤儿 tool 消息', async () => {
      const service = new AzureOpenAIChatService(baseConfig);

      const messages: Message[] = [
        { role: 'user', content: 'Hello' },
        {
          role: 'tool',
          content: 'Orphan result',
          tool_call_id: 'non-existent-id',
        },
      ];

      mockAzureOpenAI.createSpy.mockResolvedValue({
        choices: [
          {
            message: { content: 'Response', role: 'assistant' },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 },
      });

      await service.chat(messages);

      const request = mockAzureOpenAI.createSpy.mock.calls[0][0];
      // 孤儿 tool 消息应被过滤掉
      expect(request.messages).toHaveLength(1);
      expect(request.messages[0]).toEqual({ role: 'user', content: 'Hello' });
    });
  });

  describe('工具转换', () => {
    it('应正确转换工具定义格式', async () => {
      const service = new AzureOpenAIChatService(baseConfig);

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

      mockAzureOpenAI.createSpy.mockResolvedValue({
        choices: [
          {
            message: { content: 'Response', role: 'assistant' },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      });

      await service.chat([{ role: 'user', content: 'What is the weather?' }], tools);

      const request = mockAzureOpenAI.createSpy.mock.calls[0][0];
      expect(request.tools).toHaveLength(1);
      expect(request.tools[0]).toMatchObject({
        type: 'function',
        function: {
          name: 'get_weather',
          description: 'Get weather for a location',
          parameters: {
            type: 'object',
            properties: { location: { type: 'string' } },
            required: ['location'],
          },
        },
      });
      expect(request.tool_choice).toBe('auto');
    });
  });

  describe('响应解析', () => {
    it('应正确解析文本响应', async () => {
      const service = new AzureOpenAIChatService(baseConfig);

      mockAzureOpenAI.createSpy.mockResolvedValue({
        choices: [
          {
            message: { content: 'Hello! How can I help you?', role: 'assistant' },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 8, total_tokens: 18 },
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

    it('应正确解析 tool_calls 响应', async () => {
      const service = new AzureOpenAIChatService(baseConfig);

      mockAzureOpenAI.createSpy.mockResolvedValue({
        choices: [
          {
            message: {
              content: 'Let me check the weather.',
              role: 'assistant',
              tool_calls: [
                {
                  id: 'tool-123',
                  type: 'function',
                  function: {
                    name: 'get_weather',
                    arguments: '{"location":"San Francisco"}',
                  },
                },
              ],
            },
            finish_reason: 'tool_calls',
          },
        ],
        usage: { prompt_tokens: 15, completion_tokens: 20, total_tokens: 35 },
      });

      const response = await service.chat([{ role: 'user', content: 'Weather in SF?' }]);

      expect(response.content).toBe('Let me check the weather.');
      expect(response.toolCalls).toHaveLength(1);
      expect(response.toolCalls![0]).toMatchObject({
        id: 'tool-123',
        type: 'function',
        function: {
          name: 'get_weather',
          arguments: '{"location":"San Francisco"}',
        },
      });
    });

    it('应正确处理多个 tool_calls', async () => {
      const service = new AzureOpenAIChatService(baseConfig);

      mockAzureOpenAI.createSpy.mockResolvedValue({
        choices: [
          {
            message: {
              content: null,
              role: 'assistant',
              tool_calls: [
                {
                  id: 'tool-1',
                  type: 'function',
                  function: {
                    name: 'read_file',
                    arguments: '{"path":"a.txt"}',
                  },
                },
                {
                  id: 'tool-2',
                  type: 'function',
                  function: {
                    name: 'read_file',
                    arguments: '{"path":"b.txt"}',
                  },
                },
              ],
            },
            finish_reason: 'tool_calls',
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 15, total_tokens: 25 },
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
      const service = new AzureOpenAIChatService(baseConfig);
      expect(mockAzureOpenAI.instances).toHaveLength(1);

      service.updateConfig({
        model: 'gpt-4o-deployment',
        apiVersion: '2024-10-01-preview',
      });

      expect(mockAzureOpenAI.instances).toHaveLength(2);
      const config = service.getConfig();
      expect(config.model).toBe('gpt-4o-deployment');
      expect(config.apiVersion).toBe('2024-10-01-preview');
    });
  });

  describe('错误处理', () => {
    it('API 错误应向上抛出', async () => {
      const service = new AzureOpenAIChatService(baseConfig);
      const error = new Error('Rate limit exceeded');
      mockAzureOpenAI.createSpy.mockRejectedValue(error);

      await expect(service.chat([{ role: 'user', content: 'Hi' }])).rejects.toThrow(
        'Rate limit exceeded'
      );
    });

    it('无效响应应抛出错误', async () => {
      const service = new AzureOpenAIChatService(baseConfig);
      mockAzureOpenAI.createSpy.mockResolvedValue({
        choices: [],
      });

      await expect(service.chat([{ role: 'user', content: 'Hi' }])).rejects.toThrow(
        'Invalid API response: missing choices'
      );
    });
  });
});
