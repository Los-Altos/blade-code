/**
 * 消息渲染器 - 完整的 Markdown 格式化支持
 *
 * 支持的 Markdown 特性：
 * - 代码块（语法高亮）
 * - 表格
 * - 标题（H1-H4）
 * - 列表（有序/无序，支持嵌套）
 * - 水平线
 * - 内联格式（粗体、斜体、删除线、内联代码、链接）
 */

import { Box, Text } from 'ink';
import React from 'react';
import { useTheme } from '../../store/selectors/index.js';
import type { MessageRole } from '../../store/types.js';
import { CodeHighlighter } from './CodeHighlighter.js';
import { DiffRenderer } from './DiffRenderer.js';
import { InlineRenderer } from './InlineRenderer.js';
import { ListItem } from './ListItem.js';
import { TableRenderer } from './TableRenderer.js';

export interface MessageRendererProps {
  content: string;
  role: MessageRole;
  terminalWidth: number;
  metadata?: Record<string, unknown>;
  isPending?: boolean;
  availableTerminalHeight?: number;
  hidePrefix?: boolean;
  noMargin?: boolean;
}

// 获取角色样式配置（接受 theme 参数，从 Store 获取）
const getRoleStyle = (
  role: MessageRole,
  colors: ReturnType<typeof useTheme>['colors'],
  metadata?: Record<string, unknown>
) => {
  switch (role) {
    case 'user':
      return { color: colors.info, prefix: '> ' };
    case 'assistant':
      return { color: colors.success, prefix: '• ' };
    case 'system':
      return { color: colors.warning, prefix: '⚙ ' };
    case 'tool': {
      // 根据 phase 控制前缀（流式显示风格）
      const phase =
        metadata && 'phase' in metadata ? (metadata.phase as string) : undefined;
      return {
        color: colors.text.secondary,
        prefix: phase === 'start' ? '• ' : phase === 'complete' ? '  └ ' : '  ',
      };
    }
    default:
      // 未知角色，使用默认样式
      return { color: colors.text.primary, prefix: '  ' };
  }
};

// Markdown 解析正则表达式
const MARKDOWN_PATTERNS = {
  codeBlock: /^```(\w+)?\s*$/,
  heading: /^ *(#{1,4}) +(.+)/,
  ulItem: /^([ \t]*)([-*+]) +(.+)/,
  olItem: /^([ \t]*)(\d+)\. +(.+)/,
  hr: /^ *([-*_] *){3,} *$/,
  table: /^\|(.+)\|$/,
  tableSeparator: /^\|[\s]*:?-+:?[\s]*(\|[\s]*:?-+:?[\s]*)+\|?$/,
  diffStart: /^<<<DIFF>>>$/,
  diffEnd: /^<<<\/DIFF>>>$/,
  commandMessage: /<command-message>(.*?)<\/command-message>/,
} as const;

interface ParsedBlock {
  type:
    | 'text'
    | 'code'
    | 'heading'
    | 'table'
    | 'list'
    | 'hr'
    | 'empty'
    | 'diff'
    | 'command-message';
  content: string;
  language?: string;
  level?: number;
  listType?: 'ul' | 'ol';
  marker?: string;
  indentation?: number;
  tableData?: {
    headers: string[];
    rows: string[][];
  };
  diffData?: {
    patch: string;
    startLine: number;
    matchLine: number;
  };
}

/**
 * 解析 Markdown 内容为结构化块
 *
 * 嵌套代码块处理策略：
 * - 使用嵌套深度计数器跟踪代码块层级
 * - 只有当深度归零时才真正结束代码块
 * - `markdown` 语言的代码块会被"解包"，其内容作为普通 markdown 重新解析
 */
function parseMarkdown(content: string): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];
  const lines = content.split(/\r?\n/);

  let inCodeBlock = false;
  let codeBlockContent: string[] = [];
  let codeBlockLang: string | null = null;
  let codeBlockDepth = 0; // 🆕 嵌套深度计数器

  let inTable = false;
  let tableHeaders: string[] = [];
  let tableRows: string[][] = [];

  let inDiff = false;
  let diffContent: string[] = [];

  let lastLineEmpty = true;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Diff 块处理
    if (inDiff) {
      if (line.match(MARKDOWN_PATTERNS.diffEnd)) {
        // Diff 块结束
        try {
          const diffJson = JSON.parse(diffContent.join('\n'));
          blocks.push({
            type: 'diff',
            content: '',
            diffData: {
              patch: diffJson.patch,
              startLine: diffJson.startLine,
              matchLine: diffJson.matchLine,
            },
          });
        } catch (_error) {
          // 解析失败，当作普通文本
          blocks.push({
            type: 'text',
            content: diffContent.join('\n'),
          });
        }
        inDiff = false;
        diffContent = [];
        lastLineEmpty = false;
        continue;
      }
      diffContent.push(line);
      continue;
    }

    // 检查 Diff 块开始
    if (line.match(MARKDOWN_PATTERNS.diffStart)) {
      inDiff = true;
      diffContent = [];
      lastLineEmpty = false;
      continue;
    }

    // 代码块处理（支持嵌套）
    if (inCodeBlock) {
      const codeBlockStartMatch = line.match(MARKDOWN_PATTERNS.codeBlock);
      const isCodeBlockEnd = line.trim() === '```'; // 纯结束标记

      if (codeBlockStartMatch && codeBlockStartMatch[1]) {
        // 遇到新的代码块开始（带语言标识），增加嵌套深度
        codeBlockDepth++;
        codeBlockContent.push(line);
      } else if (isCodeBlockEnd) {
        // 遇到代码块结束标记
        if (codeBlockDepth > 0) {
          // 还在嵌套中，减少深度，继续收集
          codeBlockDepth--;
          codeBlockContent.push(line);
        } else {
          // 最外层代码块结束
          const codeContent = codeBlockContent.join('\n');

          // 🆕 特殊处理 markdown 语言的代码块：解包并递归解析
          if (
            codeBlockLang?.toLowerCase() === 'markdown' ||
            codeBlockLang?.toLowerCase() === 'md'
          ) {
            // 递归解析 markdown 内容
            const innerBlocks = parseMarkdown(codeContent);
            blocks.push(...innerBlocks);
          } else {
            blocks.push({
              type: 'code',
              content: codeContent,
              language: codeBlockLang || undefined,
            });
          }

          inCodeBlock = false;
          codeBlockContent = [];
          codeBlockLang = null;
          codeBlockDepth = 0;
          lastLineEmpty = false;
        }
      } else {
        codeBlockContent.push(line);
      }
      continue;
    }

    // 检查代码块开始
    const codeBlockMatch = line.match(MARKDOWN_PATTERNS.codeBlock);
    if (codeBlockMatch) {
      inCodeBlock = true;
      codeBlockLang = codeBlockMatch[1] || null;
      codeBlockDepth = 0; // 初始化嵌套深度
      lastLineEmpty = false;
      continue;
    }

    // 表格处理
    const tableMatch = line.match(MARKDOWN_PATTERNS.table);
    const tableSepMatch = line.match(MARKDOWN_PATTERNS.tableSeparator);

    if (tableMatch && !inTable) {
      // 检查下一行是否是分隔符
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        if (nextLine.match(MARKDOWN_PATTERNS.tableSeparator)) {
          inTable = true;
          tableHeaders = tableMatch[1]
            .split('|')
            .map((cell) => cell.trim())
            .filter((cell) => cell.length > 0);
          tableRows = [];
          lastLineEmpty = false;
          continue;
        }
      }
    }

    if (inTable && tableSepMatch) {
      // 跳过分隔符行
      continue;
    }

    if (inTable && tableMatch) {
      // 添加表格行
      const cells = tableMatch[1]
        .split('|')
        .map((cell) => cell.trim())
        .filter((cell) => cell.length > 0);

      // 确保列数一致
      while (cells.length < tableHeaders.length) {
        cells.push('');
      }
      if (cells.length > tableHeaders.length) {
        cells.length = tableHeaders.length;
      }

      tableRows.push(cells);
      continue;
    }

    if (inTable && !tableMatch) {
      // 表格结束
      if (tableHeaders.length > 0 && tableRows.length > 0) {
        blocks.push({
          type: 'table',
          content: '',
          tableData: { headers: tableHeaders, rows: tableRows },
        });
      }
      inTable = false;
      tableHeaders = [];
      tableRows = [];
    }

    // 标题
    const headingMatch = line.match(MARKDOWN_PATTERNS.heading);
    if (headingMatch) {
      blocks.push({
        type: 'heading',
        content: headingMatch[2],
        level: headingMatch[1].length,
      });
      lastLineEmpty = false;
      continue;
    }

    // 无序列表
    const ulMatch = line.match(MARKDOWN_PATTERNS.ulItem);
    if (ulMatch) {
      blocks.push({
        type: 'list',
        content: ulMatch[3],
        listType: 'ul',
        marker: ulMatch[2],
        indentation: ulMatch[1].length,
      });
      lastLineEmpty = false;
      continue;
    }

    // 有序列表
    const olMatch = line.match(MARKDOWN_PATTERNS.olItem);
    if (olMatch) {
      blocks.push({
        type: 'list',
        content: olMatch[3],
        listType: 'ol',
        marker: olMatch[2],
        indentation: olMatch[1].length,
      });
      lastLineEmpty = false;
      continue;
    }

    // 水平线
    const hrMatch = line.match(MARKDOWN_PATTERNS.hr);
    if (hrMatch) {
      blocks.push({
        type: 'hr',
        content: '',
      });
      lastLineEmpty = false;
      continue;
    }

    // 空行
    if (line.trim().length === 0) {
      if (!lastLineEmpty) {
        blocks.push({
          type: 'empty',
          content: '',
        });
        lastLineEmpty = true;
      }
      continue;
    }

    // <command-message> 标签
    const commandMessageMatch = line.match(MARKDOWN_PATTERNS.commandMessage);
    if (commandMessageMatch) {
      blocks.push({
        type: 'command-message',
        content: commandMessageMatch[1],
      });
      lastLineEmpty = false;
      continue;
    }

    // 普通文本
    blocks.push({
      type: 'text',
      content: line,
    });
    lastLineEmpty = false;
  }

  // 处理未闭合的代码块
  if (inCodeBlock) {
    const codeContent = codeBlockContent.join('\n');

    // 🆕 特殊处理 markdown 语言的代码块：解包并递归解析
    if (
      codeBlockLang?.toLowerCase() === 'markdown' ||
      codeBlockLang?.toLowerCase() === 'md'
    ) {
      const innerBlocks = parseMarkdown(codeContent);
      blocks.push(...innerBlocks);
    } else {
      blocks.push({
        type: 'code',
        content: codeContent,
        language: codeBlockLang || undefined,
      });
    }
  }

  // 处理未闭合的表格
  if (inTable && tableHeaders.length > 0 && tableRows.length > 0) {
    blocks.push({
      type: 'table',
      content: '',
      tableData: { headers: tableHeaders, rows: tableRows },
    });
  }

  // 过滤掉末尾的空行（避免与 marginBottom 叠加产生多余空白）
  while (blocks.length > 0 && blocks[blocks.length - 1].type === 'empty') {
    blocks.pop();
  }

  return blocks;
}

/**
 * 渲染代码块
 *
 * 参考 Gemini CLI：在 isPending 模式下限制代码块高度，避免长代码块导致闪烁
 */
const CodeBlock: React.FC<{
  content: string;
  language?: string;
  terminalWidth: number;
  isPending?: boolean;
  availableHeight?: number;
}> = React.memo(
  ({ content, language, terminalWidth, isPending = false, availableHeight }) => {
    const theme = useTheme();

    // 流式模式下限制代码块高度（参考 Gemini CLI RenderCodeBlock）
    if (isPending && availableHeight !== undefined) {
      const lines = content.split('\n');
      const RESERVED_LINES = 4; // 预留行数（边框、提示等）
      const maxLines = Math.max(1, availableHeight - RESERVED_LINES);

      if (lines.length > maxLines) {
        // 截断并显示提示
        const truncatedContent = lines.slice(0, maxLines).join('\n');
        return (
          <Box flexDirection="column" flexShrink={0}>
            <CodeHighlighter
              content={truncatedContent}
              language={language}
              showLineNumbers={true}
              terminalWidth={terminalWidth}
            />
            <Text color={theme.colors.text.muted} dimColor>
              ... generating more code ...
            </Text>
          </Box>
        );
      }
    }

    return (
      <CodeHighlighter
        content={content}
        language={language}
        showLineNumbers={true}
        terminalWidth={terminalWidth}
      />
    );
  }
);

/**
 * 渲染标题
 */
const Heading: React.FC<{
  content: string;
  level: number;
}> = React.memo(({ content, level }) => {
  const theme = useTheme();

  // 根据级别设置样式
  switch (level) {
    case 1: // # H1
      return (
        <Text bold color={theme.colors.primary}>
          <InlineRenderer text={content} />
        </Text>
      );
    case 2: // ## H2
      return (
        <Text bold color={theme.colors.primary}>
          <InlineRenderer text={content} />
        </Text>
      );
    case 3: // ### H3
      return (
        <Text bold color={theme.colors.text.primary}>
          <InlineRenderer text={content} />
        </Text>
      );
    case 4: // #### H4
      return (
        <Text italic color={theme.colors.text.muted}>
          <InlineRenderer text={content} />
        </Text>
      );
    default:
      return (
        <Text>
          <InlineRenderer text={content} />
        </Text>
      );
  }
});

/**
 * 渲染水平线
 */
const HorizontalRule: React.FC<{ terminalWidth: number }> = React.memo(
  ({ terminalWidth }) => {
    const theme = useTheme();
    const lineWidth = Math.max(0, Math.min(terminalWidth - 4, 80));
    return (
      <Text dimColor color={theme.colors.text.muted}>
        {'─'.repeat(lineWidth)}
      </Text>
    );
  }
);

/**
 * 渲染普通文本
 */
const TextBlock: React.FC<{ content: string }> = React.memo(({ content }) => {
  return (
    <Text wrap="wrap">
      <InlineRenderer text={content} />
    </Text>
  );
});

/**
 * 渲染 <command-message> 标签
 * 显示为带图标的状态消息
 */
const CommandMessage: React.FC<{ content: string }> = React.memo(({ content }) => {
  const theme = useTheme();
  return (
    <Box flexDirection="row" gap={1}>
      <Text color={theme.colors.info}>⏳</Text>
      <Text color={theme.colors.text.muted} italic>
        {content}
      </Text>
    </Box>
  );
});

/**
 * 工具详细内容渲染器（优化版）
 *
 * 优化策略：
 * 1. 只支持代码块和 diff（简化 Markdown）
 * 2. 限制最大行数（避免过大的组件树）
 * 3. 使用 memo 优化（避免不必要的重渲染）
 */
const ToolDetailRenderer: React.FC<{
  detail: string;
  terminalWidth: number;
}> = React.memo(({ detail, terminalWidth }) => {
  const theme = useTheme();
  const MAX_LINES = 50; // 最大显示行数

  // 过滤掉开头和结尾的空行
  const lines = detail.split('\n');
  while (lines.length > 0 && lines[0].trim() === '') {
    lines.shift();
  }
  while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
    lines.pop();
  }

  // 限制行数，超过部分显示省略提示
  const isTruncated = lines.length > MAX_LINES;
  const displayLines = isTruncated ? lines.slice(0, MAX_LINES) : lines;
  const displayContent = displayLines.join('\n');

  // 检测内容类型
  const isDiff = displayContent.includes('<<<DIFF>>>');
  const isCodeBlock = displayContent.includes('```');

  // 渲染 diff 内容
  if (isDiff) {
    const diffMatch = displayContent.match(/<<<DIFF>>>\s*({[\s\S]*?})\s*<<<\/DIFF>>>/);
    if (diffMatch) {
      try {
        const diffData = JSON.parse(diffMatch[1]);
        return (
          <Box flexDirection="column">
            <DiffRenderer
              patch={diffData.patch}
              startLine={diffData.startLine}
              matchLine={diffData.matchLine}
              terminalWidth={terminalWidth}
            />
            {isTruncated && (
              <Box marginTop={1}>
                <Text dimColor color={theme.colors.text.muted}>
                  ... 省略 {lines.length - MAX_LINES} 行 ...
                </Text>
              </Box>
            )}
          </Box>
        );
      } catch {
        // diff 解析失败，降级为纯文本
      }
    }
  }

  // 渲染代码块
  if (isCodeBlock) {
    const codeMatch = displayContent.match(/```(\w+)?\s*\n([\s\S]*?)\n```/);
    if (codeMatch) {
      const language = codeMatch[1] || 'text';
      const code = codeMatch[2];
      return (
        <Box flexDirection="column">
          <CodeHighlighter
            content={code}
            language={language}
            showLineNumbers={false}
            terminalWidth={terminalWidth}
          />
          {isTruncated && (
            <Box marginTop={1}>
              <Text dimColor color={theme.colors.text.muted}>
                ... 省略 {lines.length - MAX_LINES} 行 ...
              </Text>
            </Box>
          )}
        </Box>
      );
    }
  }

  // 降级为纯文本显示（按行渲染，避免单个巨大的 Text 组件）
  return (
    <Box flexDirection="column">
      {displayLines.map((line, index) => (
        <Text key={index} color={theme.colors.text.primary}>
          {line}
        </Text>
      ))}
      {isTruncated && (
        <Box marginTop={1}>
          <Text dimColor color={theme.colors.text.muted}>
            ... 省略 {lines.length - MAX_LINES} 行 ...
          </Text>
        </Box>
      )}
    </Box>
  );
});

/**
 * 截断内容以适应可用终端高度（参考 Gemini CLI）
 *
 * 只在 pending 状态下截断，避免流式输出时内容超过终端高度导致闪烁
 *
 * 🆕 优化：使用字符级快速截断，避免遍历所有行
 * - 直接从末尾截取估算的字符数
 * - 大幅减少长内容的计算开销
 */
function truncateContentForHeight(
  content: string,
  availableHeight: number | undefined,
  isPending: boolean,
  terminalWidth: number = 80
): { content: string; isTruncated: boolean; hiddenLines: number } {
  // 非 pending 状态或没有高度限制，不截断
  if (!isPending || availableHeight === undefined || availableHeight <= 0) {
    return { content, isTruncated: false, hiddenLines: 0 };
  }

  // 预留几行给截断提示、前缀和其他 UI 元素
  const RESERVED_LINES = 8;
  const maxDisplayLines = Math.max(1, availableHeight - RESERVED_LINES);

  // 🆕 快速路径：估算最大字符数，直接从末尾截取
  // 假设每行平均 terminalWidth * 0.8 个字符（考虑换行和短行）
  const avgCharsPerLine = Math.max(40, terminalWidth * 0.8);
  const estimatedMaxChars = maxDisplayLines * avgCharsPerLine;

  // 如果内容长度在估算范围内，不需要截断
  if (content.length <= estimatedMaxChars) {
    return { content, isTruncated: false, hiddenLines: 0 };
  }

  // 从末尾截取，多留一些余量确保不超过显示区域
  const safeMaxChars = Math.floor(estimatedMaxChars * 0.9);
  const startIndex = content.length - safeMaxChars;

  // 找到最近的换行符，确保从完整行开始
  let adjustedStartIndex = startIndex;
  const nextNewline = content.indexOf('\n', startIndex);
  if (nextNewline !== -1 && nextNewline - startIndex < avgCharsPerLine) {
    adjustedStartIndex = nextNewline + 1;
  }

  const visibleContent = content.slice(adjustedStartIndex);
  const hiddenContent = content.slice(0, adjustedStartIndex);
  const hiddenLines = (hiddenContent.match(/\n/g) || []).length + 1;

  return {
    content: visibleContent,
    isTruncated: true,
    hiddenLines,
  };
}

/**
 * 主要的消息渲染器组件
 */
export const MessageRenderer: React.FC<MessageRendererProps> = React.memo(
  ({
    content,
    role,
    terminalWidth,
    metadata,
    isPending = false,
    availableTerminalHeight,
    hidePrefix = false,
    noMargin = false,
  }) => {
    // 从 Store 获取主题（响应式）
    const theme = useTheme();

    // 🆕 在 pending 状态下截断内容（考虑终端宽度导致的自动换行）
    const {
      content: displayContent,
      isTruncated,
      hiddenLines,
    } = React.useMemo(
      () =>
        truncateContentForHeight(
          content,
          availableTerminalHeight,
          isPending,
          terminalWidth
        ),
      [content, availableTerminalHeight, isPending, terminalWidth]
    );

    // 使用 useMemo 缓存角色样式计算
    const roleStyle = React.useMemo(
      () => getRoleStyle(role, theme.colors, metadata),
      [role, theme.colors, metadata]
    );
    const { color, prefix } = roleStyle;

    // 处理 tool 消息的详细内容（complete 阶段）
    if (role === 'tool' && metadata && 'detail' in metadata) {
      const toolMetadata = metadata as { detail?: string; phase?: string };
      if (toolMetadata.detail) {
        return (
          <Box flexDirection="column" marginBottom={noMargin ? 0 : 1}>
            {/* 摘要行 */}
            <Box flexDirection="row">
              <Box marginRight={1}>
                <Text color={color} bold>
                  {prefix}
                </Text>
              </Box>
              <Text color={color}>{content}</Text>
            </Box>

            {/* 详细内容（优化渲染） */}
            <Box marginLeft={prefix.length + 1}>
              <ToolDetailRenderer
                detail={toolMetadata.detail}
                terminalWidth={terminalWidth - (prefix.length + 1)}
              />
            </Box>
          </Box>
        );
      }
    }

    // 流式模式优化：分离已完成行和当前行
    // - 只对已完成行做 Markdown 解析（结构稳定）
    // - 当前行作为纯文本追加（避免未闭合结构导致的解析问题）
    const { completedContent, currentLine } = React.useMemo(() => {
      if (!isPending) {
        return { completedContent: displayContent, currentLine: '' };
      }
      const lastNewlineIndex = displayContent.lastIndexOf('\n');
      if (lastNewlineIndex === -1) {
        // 没有换行符，全部作为当前行
        return { completedContent: '', currentLine: displayContent };
      }
      return {
        completedContent: displayContent.slice(0, lastNewlineIndex + 1),
        currentLine: displayContent.slice(lastNewlineIndex + 1),
      };
    }, [displayContent, isPending]);

    // 增量解析优化：使用 ref 缓存已解析的 blocks，只在 completedContent 增长时追加解析
    const blocksRef = React.useRef<{ content: string; blocks: ParsedBlock[] }>({
      content: '',
      blocks: [],
    });

    const blocks = React.useMemo(() => {
      const cached = blocksRef.current;

      // 非 pending 模式或内容完全变化，重新解析
      if (!isPending || !completedContent.startsWith(cached.content)) {
        const newBlocks = parseMarkdown(completedContent);
        blocksRef.current = { content: completedContent, blocks: newBlocks };
        return newBlocks;
      }

      // 内容没有增长，复用缓存
      if (completedContent === cached.content) {
        return cached.blocks;
      }

      // 增量解析：只解析新增的部分
      const newContent = completedContent.slice(cached.content.length);
      const newBlocks = parseMarkdown(newContent);

      // 合并 blocks（注意：这里简化处理，实际可能需要更复杂的合并逻辑）
      const mergedBlocks = [...cached.blocks, ...newBlocks];
      blocksRef.current = { content: completedContent, blocks: mergedBlocks };
      return mergedBlocks;
    }, [completedContent, isPending]);
    const prefixIndent = prefix.length + 1;

    // 决定是否需要底部间距：
    // - tool 消息的 'start' 阶段不需要（等待结果）
    // - tool 消息的 'complete' 阶段需要（工具调用结束）
    // - 其他消息需要
    const isToolStart = role === 'tool' && metadata?.phase === 'start';
    const shouldHaveMargin = !noMargin && !isToolStart;

    return (
      <Box
        flexDirection="column"
        marginBottom={shouldHaveMargin ? 1 : 0}
        flexShrink={0}
      >
        {isTruncated && (
          <Box flexDirection="row" flexShrink={0}>
            <Box width={prefixIndent} flexShrink={0} />
            <Text color={theme.colors.text.muted} dimColor>
              ↑ {hiddenLines} lines above (streaming...)
            </Text>
          </Box>
        )}
        {blocks.map((block, index) => {
          if (block.type === 'empty') {
            return <Box key={index} height={1} flexShrink={0} />;
          }

          return (
            <Box key={index} flexDirection="row" flexShrink={0}>
              {index === 0 && !hidePrefix && (
                <Box marginRight={1} flexShrink={0}>
                  <Text color={color} bold>
                    {prefix}
                  </Text>
                </Box>
              )}

              {(index > 0 || hidePrefix) && <Box width={prefixIndent} flexShrink={0} />}

              <Box flexGrow={1} flexShrink={0}>
                {block.type === 'code' ? (
                  <CodeBlock
                    content={block.content}
                    language={block.language}
                    terminalWidth={terminalWidth - prefixIndent}
                    isPending={isPending}
                    availableHeight={availableTerminalHeight}
                  />
                ) : block.type === 'table' && block.tableData ? (
                  <TableRenderer
                    headers={block.tableData.headers}
                    rows={block.tableData.rows}
                    terminalWidth={terminalWidth - prefixIndent}
                  />
                ) : block.type === 'heading' ? (
                  <Heading content={block.content} level={block.level || 1} />
                ) : block.type === 'list' ? (
                  <ListItem
                    type={block.listType || 'ul'}
                    marker={block.marker || '-'}
                    itemText={block.content}
                    leadingWhitespace={' '.repeat(block.indentation || 0)}
                  />
                ) : block.type === 'hr' ? (
                  <HorizontalRule terminalWidth={terminalWidth - prefixIndent} />
                ) : block.type === 'diff' && block.diffData ? (
                  <DiffRenderer
                    patch={block.diffData.patch}
                    startLine={block.diffData.startLine}
                    matchLine={block.diffData.matchLine}
                    terminalWidth={terminalWidth - prefixIndent}
                  />
                ) : block.type === 'command-message' ? (
                  <CommandMessage content={block.content} />
                ) : (
                  <TextBlock content={block.content} />
                )}
              </Box>
            </Box>
          );
        })}
        {/* 流式模式：渲染当前行（纯文本，避免未闭合结构的解析问题） */}
        {currentLine && (
          <Box flexDirection="row" flexShrink={0}>
            {blocks.length === 0 && !hidePrefix ? (
              <Box marginRight={1} flexShrink={0}>
                <Text color={color} bold>
                  {prefix}
                </Text>
              </Box>
            ) : (
              <Box width={prefixIndent} flexShrink={0} />
            )}
            <Box flexGrow={1} flexShrink={0}>
              <Text wrap="wrap">{currentLine}</Text>
            </Box>
          </Box>
        )}
      </Box>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.content === nextProps.content &&
      prevProps.role === nextProps.role &&
      prevProps.terminalWidth === nextProps.terminalWidth &&
      prevProps.isPending === nextProps.isPending &&
      prevProps.availableTerminalHeight === nextProps.availableTerminalHeight &&
      prevProps.hidePrefix === nextProps.hidePrefix &&
      prevProps.noMargin === nextProps.noMargin &&
      prevProps.metadata === nextProps.metadata
    );
  }
);
