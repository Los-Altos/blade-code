import ansiEscapes from 'ansi-escapes';
import { Box, Static, useStdout } from 'ink';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  useClearCount,
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
import { useTerminalWidth } from '../hooks/useTerminalWidth.js';
import { CollapsedHistorySummary } from './CollapsedHistorySummary.js';
import { Header } from './Header.js';
import { MessageRenderer } from './MessageRenderer.js';
import { ThinkingBlock } from './ThinkingBlock.js';
import { TodoPanel } from './TodoPanel.js';

/**
 * 消息区域组件
 * 负责显示消息列表
 *
 * 折叠策略（参考 Claude Code）：
 * - 当消息数量超过阈值时，自动把之前所有消息折叠成一行摘要
 * - 新消息继续正常输出，不受折叠影响
 * - 用户可以按 Ctrl+O 展开查看历史
 *
 * 渲染策略：
 * - 使用 Ink 的 Static 组件渲染已完成的消息
 * - Static 组件只渲染新追加的 items，已渲染的不会重新渲染
 * - 流式传输的消息在 Static 外部渲染，支持实时更新
 */
export const MessageArea: React.FC = React.memo(() => {
  // 使用 Zustand selectors 获取状态
  const messages = useMessages();
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
  const { stdout } = useStdout();
  const sessionActions = useSessionActions();

  // 折叠点：记录从哪个索引开始折叠
  // 当消息数超过阈值时，折叠点被设置为当前位置
  // 折叠点之前的消息显示为摘要，之后的消息正常显示
  // 使用 useState 而非 useRef，确保设置折叠点时触发重新渲染
  const [collapsePointState, setCollapsePointState] = useState<number | null>(null);

  // 追踪 historyExpanded 的前一个值
  const prevHistoryExpandedRef = useRef(historyExpanded);

  // 当 historyExpanded 变化时，清屏并递增 clearCount
  useEffect(() => {
    if (prevHistoryExpandedRef.current !== historyExpanded) {
      if (stdout) {
        stdout.write(ansiEscapes.clearTerminal);
      }
      sessionActions.incrementClearCount();
      prevHistoryExpandedRef.current = historyExpanded;
    }
  }, [historyExpanded, stdout, sessionActions]);

  // 分离已完成的消息和正在流式传输的消息
  const { completedMessages, streamingMessage } = useMemo(() => {
    const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
    const isLastMessageStreaming =
      isProcessing && lastMessage && lastMessage.role === 'assistant';

    if (isLastMessageStreaming) {
      return {
        completedMessages: messages.slice(0, -1),
        streamingMessage: lastMessage,
      };
    }

    return {
      completedMessages: messages,
      streamingMessage: null,
    };
  }, [messages, isProcessing]);

  // 检测并设置折叠点
  // 当消息数首次超过阈值时，记录折叠点
  useEffect(() => {
    if (
      collapsePointState === null &&
      completedMessages.length > expandedMessageCount
    ) {
      // 首次超过阈值，设置折叠点为当前位置
      setCollapsePointState(completedMessages.length);

      // 清屏并递增 clearCount，强制 Static 重新渲染
      // 这样折叠摘要才能正确显示
      if (stdout) {
        stdout.write(ansiEscapes.clearTerminal);
      }
      sessionActions.incrementClearCount();
    }
  }, [completedMessages.length, expandedMessageCount, collapsePointState, stdout, sessionActions]);

  // 检测是否有活动的 TODO
  const hasActiveTodos = useMemo(() => {
    return todos.some(
      (todo) => todo.status === 'pending' || todo.status === 'in_progress'
    );
  }, [todos]);

  // 渲染单个消息
  const renderMessage = (msg: SessionMessage, isPending = false) => (
    <Box key={msg.id} flexDirection="column">
      <MessageRenderer
        content={msg.content}
        role={msg.role}
        terminalWidth={terminalWidth}
        metadata={msg.metadata as Record<string, unknown>}
        isPending={isPending}
      />
    </Box>
  );

  // 计算折叠数量
  // 如果展开了历史，不折叠任何消息
  // 否则，折叠点之前的消息都折叠
  const collapsePoint = historyExpanded ? 0 : (collapsePointState ?? 0);
  const collapsedCount = collapsePoint;

  // 构建历史消息的 JSX 数组
  const historyItems = completedMessages.map((msg, index) => {
    const uniqueKey = `msg-${index}`;
    if (index < collapsePoint) {
      // 折叠点之前：渲染为空 Box（保持数组长度，让 Static 能检测到）
      return <Box key={uniqueKey} />;
    }
    // 折叠点之后：正常渲染（带底部间距）
    return (
      <Box key={uniqueKey} flexDirection="column" marginBottom={1}>
        <MessageRenderer
          content={msg.content}
          role={msg.role}
          terminalWidth={terminalWidth}
          metadata={msg.metadata as Record<string, unknown>}
          isPending={false}
        />
      </Box>
    );
  });

  // 构建 Static items 数组
  const staticItems = [
    <Header key="header" />,
    ...(collapsedCount > 0
      ? [<CollapsedHistorySummary key="collapsed-summary" collapsedCount={collapsedCount} />]
      : []),
    ...historyItems,
  ];


  return (
    <Box flexDirection="column" flexGrow={1} paddingX={2}>
      <Box flexDirection="column" flexGrow={1}>
        {/* 静态区域：Header + 折叠汇总 + 历史消息 */}
        {/* key 包含 clearCount 和 historyExpanded，确保状态变化时完全重新渲染 */}
        <Static key={`${clearCount}-${historyExpanded}`} items={staticItems}>
          {(item) => item}
        </Static>

        {/* 流式接收的 Thinking 内容 */}
        {currentThinkingContent && (
          <Box marginBottom={1}>
            <ThinkingBlock
              content={currentThinkingContent}
              isStreaming={isProcessing}
              isExpanded={thinkingExpanded}
            />
          </Box>
        )}

        {/* 动态区域：流式传输的 assistant 消息 */}
        {streamingMessage && renderMessage(streamingMessage, true)}

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
