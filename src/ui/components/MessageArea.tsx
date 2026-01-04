import ansiEscapes from 'ansi-escapes';
import { Box, Static, useStdout } from 'ink';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  useClearCount,
  useCurrentStreamingContent,
  useCurrentStreamingMessageId,
  useCurrentThinkingContent,
  useExpandedMessageCount,
  useHistoryExpanded,
  useIsProcessing,
  useMessages,
  usePendingCommands,
  useSessionActions,
  useShowTodoPanel,
  useThinkingExpanded,
  useTodos,
} from '../../store/selectors/index.js';
import type { SessionMessage } from '../../store/types.js';
import { useTerminalHeight } from '../hooks/useTerminalHeight.js';
import { useTerminalWidth } from '../hooks/useTerminalWidth.js';
import { CollapsedHistorySummary } from './CollapsedHistorySummary.js';
import { Header } from './Header.js';
import { MessageRenderer } from './MessageRenderer.js';
import { ThinkingBlock } from './ThinkingBlock.js';
import { TodoPanel } from './TodoPanel.js';

/**
 * 消息区域组件
 *
 * 渲染策略：
 * - 使用 Ink 的 Static 组件渲染已完成的消息（history）
 * - 流式消息（pending）在 Static 外部单独渲染
 * - 流式消息完成后自动移入 history
 *
 * 关键设计：
 * - history: 只增不减的已完成消息数组
 * - streamingMessage: 当前流式消息（currentStreamingMessageId 标识）
 * - clearCount: 控制 Static 重新挂载
 */
export const MessageArea: React.FC = React.memo(() => {
  const messages = useMessages();
  const currentStreamingMessageId = useCurrentStreamingMessageId();
  const currentStreamingContent = useCurrentStreamingContent(); // 🆕 独立订阅流式内容
  const isProcessing = useIsProcessing();
  const todos = useTodos();
  const showTodoPanel = useShowTodoPanel();
  const pendingCommands = usePendingCommands();
  const currentThinkingContent = useCurrentThinkingContent();
  const thinkingExpanded = useThinkingExpanded();
  const clearCount = useClearCount();
  const expandedMessageCount = useExpandedMessageCount();
  const historyExpanded = useHistoryExpanded();

  const terminalWidth = useTerminalWidth();
  const terminalHeight = useTerminalHeight();
  const { stdout } = useStdout();
  const sessionActions = useSessionActions();

  // 折叠点状态
  const [collapsePointState, setCollapsePointState] = useState<number | null>(null);

  // 追踪 historyExpanded 变化
  const prevHistoryExpandedRef = useRef(historyExpanded);

  useEffect(() => {
    if (prevHistoryExpandedRef.current !== historyExpanded) {
      if (stdout) {
        stdout.write(ansiEscapes.clearTerminal);
      }
      sessionActions.incrementClearCount();
      prevHistoryExpandedRef.current = historyExpanded;
    }
  }, [historyExpanded, stdout, sessionActions]);

  // 🆕 简化：messages 现在只包含已完成的消息（流式结束后才添加）
  // 流式内容独立存储在 currentStreamingContent 中
  // 这样 messages 的引用在流式过程中保持不变，避免不必要的重渲染
  const historyMessages = messages;

  // 🆕 构造流式消息对象（如果有）
  const streamingMessage = useMemo(() => {
    if (!currentStreamingMessageId || !currentStreamingContent) {
      return null;
    }
    return {
      id: currentStreamingMessageId,
      role: 'assistant' as const,
      content: currentStreamingContent,
      timestamp: Date.now(),
    };
  }, [currentStreamingMessageId, currentStreamingContent]);

  // 检测并设置折叠点
  useEffect(() => {
    if (
      collapsePointState === null &&
      historyMessages.length > expandedMessageCount
    ) {
      setCollapsePointState(historyMessages.length);
      if (stdout) {
        stdout.write(ansiEscapes.clearTerminal);
      }
      sessionActions.incrementClearCount();
    }
  }, [historyMessages.length, expandedMessageCount, collapsePointState, stdout, sessionActions]);

  const hasActiveTodos = useMemo(() => {
    return todos.some(
      (todo) => todo.status === 'pending' || todo.status === 'in_progress'
    );
  }, [todos]);

  const collapsePoint = historyExpanded ? 0 : (collapsePointState ?? 0);
  const collapsedCount = collapsePoint;

  // 构建 Static 渲染的 history 数组
  // 每个元素都有唯一的 key（消息 id）
  const staticItems = useMemo(() => {
    const items: React.ReactElement[] = [];

    // Header
    items.push(<Header key="header" />);

    // 折叠摘要（如果有）
    if (collapsedCount > 0) {
      items.push(
        <CollapsedHistorySummary key="collapsed-summary" collapsedCount={collapsedCount} />
      );
    }

    // 历史消息（跳过折叠区域）
    for (let i = collapsePoint; i < historyMessages.length; i++) {
      const msg = historyMessages[i];
      items.push(
        <Box key={msg.id} flexDirection="column" marginBottom={1}>
          <MessageRenderer
            content={msg.content}
            role={msg.role}
            terminalWidth={terminalWidth}
            metadata={msg.metadata as Record<string, unknown>}
            isPending={false}
          />
        </Box>
      );
    }

    return items;
  }, [historyMessages, collapsePoint, collapsedCount, terminalWidth]);


  return (
    <Box flexDirection="column" flexGrow={1} paddingX={2}>
      <Box flexDirection="column" flexGrow={1}>
        {/* 静态区域：Header + 折叠摘要 + 已完成的历史消息 */}
        {/* key = clearCount，确保清屏时完全重新渲染 */}
        <Static key={clearCount} items={staticItems}>
          {(item) => item}
        </Static>

        {/* Thinking 内容（流式） */}
        {currentThinkingContent && (
          <Box marginBottom={1}>
            <ThinkingBlock
              content={currentThinkingContent}
              isStreaming={isProcessing}
              isExpanded={thinkingExpanded}
            />
          </Box>
        )}

        {/* 流式消息（在 Static 外部，支持动态更新） */}
        {/* 传入 terminalHeight 用于截断显示，避免内容超过终端高度导致闪烁 */}
        {streamingMessage && (
          <Box flexDirection="column" marginBottom={1}>
            <MessageRenderer
              content={streamingMessage.content}
              role={streamingMessage.role}
              terminalWidth={terminalWidth}
              isPending={true}
              availableTerminalHeight={terminalHeight}
            />
          </Box>
        )}

        {/* TodoPanel */}
        {showTodoPanel && hasActiveTodos && (
          <Box marginTop={1}>
            <TodoPanel todos={todos} visible={true} compact={false} />
          </Box>
        )}

        {/* 待处理命令队列 */}
        {pendingCommands.map((cmd, index) => (
          <Box key={`pending-${index}`} flexDirection="column">
            <MessageRenderer
              content={cmd.displayText}
              role="user"
              terminalWidth={terminalWidth}
            />
          </Box>
        ))}
      </Box>
    </Box>
  );
});
