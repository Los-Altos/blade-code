import { Agent } from '../Agent.js';
import type { SubagentConfig, SubagentContext, SubagentResult } from './types.js';

/**
 * Subagent 执行器
 *
 * 职责：
 * - 创建子 Agent 实例
 * - 配置工具白名单
 * - 执行任务并返回结果
 */
export class SubagentExecutor {
  constructor(private config: SubagentConfig) {}

  /**
   * 执行 subagent 任务
   * 无状态设计：systemPrompt 通过 ChatContext 传入
   */
  async execute(context: SubagentContext): Promise<SubagentResult> {
    const startTime = Date.now();

    try {
      // 1. 构建系统提示
      const systemPrompt = this.buildSystemPrompt(context);

      // 2. 创建子 Agent（无状态设计：不再传递 systemPrompt 到 AgentOptions）
      const agent = await Agent.create({
        toolWhitelist: this.config.tools, // 应用工具白名单
      });

      // 3. 执行对话循环（让 Agent 自主完成任务）
      // 无状态设计：systemPrompt 通过 ChatContext 传入
      let finalMessage = '';
      let toolCallCount = 0;
      let tokensUsed = 0;

      const loopResult = await agent.runAgenticLoop(
        context.prompt,
        {
          messages: [],
          userId: 'subagent',
          sessionId: context.parentSessionId || `subagent_${Date.now()}`,
          workspaceRoot: process.cwd(),
          permissionMode: context.permissionMode, // 继承父 Agent 的权限模式
          systemPrompt, // 🆕 无状态设计：通过 context 传入 systemPrompt
        },
        {
          onToolStart: context.onToolStart
            ? (toolCall) => {
                const name =
                  'function' in toolCall ? toolCall.function.name : 'unknown';
                context.onToolStart!(name);
              }
            : undefined,
        }
      );

      if (loopResult.success) {
        finalMessage = loopResult.finalMessage || '';
        toolCallCount = loopResult.metadata?.toolCallsCount || 0;
        tokensUsed = loopResult.metadata?.tokensUsed || 0;
      } else {
        throw new Error(loopResult.error?.message || 'Subagent execution failed');
      }

      // 4. 返回结果
      const duration = Date.now() - startTime;

      return {
        success: true,
        message: finalMessage,
        stats: {
          tokens: tokensUsed,
          toolCalls: toolCallCount,
          duration,
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        success: false,
        message: '',
        error: error instanceof Error ? error.message : String(error),
        stats: {
          duration,
        },
      };
    }
  }

  /**
   * 构建系统提示
   */
  private buildSystemPrompt(_context: SubagentContext): string {
    return this.config.systemPrompt || '';
  }
}
