/**
 * 文本处理工具函数
 * 提供 Unicode 感知的文本操作
 */

import stringWidth from 'string-width';

// =========================================================================
// Unicode 感知的字符处理（按 code point 而非 UTF-16 code unit）
// =========================================================================

// Code points 缓存，减少 GC 压力
const codePointsCache = new Map<string, string[]>();
const MAX_STRING_LENGTH_TO_CACHE = 1000;

/**
 * 将字符串分割为 code points 数组
 * 正确处理 emoji、汉字等 Unicode 字符
 *
 * @example
 * toCodePoints('hello') // ['h', 'e', 'l', 'l', 'o']
 * toCodePoints('你好') // ['你', '好']
 * toCodePoints('👋🏻') // ['👋', '🏻'] (emoji + skin tone modifier)
 */
export function toCodePoints(str: string): string[] {
  // ASCII 快速路径 - 检查所有字符是否都是 ASCII (0-127)
  let isAscii = true;
  for (let i = 0; i < str.length; i++) {
    if (str.charCodeAt(i) > 127) {
      isAscii = false;
      break;
    }
  }
  if (isAscii) {
    return str.split('');
  }

  // 短字符串缓存
  if (str.length <= MAX_STRING_LENGTH_TO_CACHE) {
    const cached = codePointsCache.get(str);
    if (cached) {
      return cached;
    }
  }

  // 使用 Array.from 正确处理 Unicode
  const result = Array.from(str);

  // 缓存结果
  if (str.length <= MAX_STRING_LENGTH_TO_CACHE) {
    codePointsCache.set(str, result);
  }

  return result;
}

/**
 * 获取字符串的 code point 长度
 */
export function cpLen(str: string): number {
  return toCodePoints(str).length;
}

/**
 * 按 code point 索引切片字符串
 */
export function cpSlice(str: string, start: number, end?: number): string {
  return toCodePoints(str).slice(start, end).join('');
}

// =========================================================================
// 字符串宽度计算（带缓存）
// =========================================================================

// 宽度缓存，提高性能
const stringWidthCache = new Map<string, number>();

/**
 * 带缓存的字符串宽度计算
 * 正确处理 emoji、汉字、全角字符等
 *
 * @example
 * getCachedStringWidth('hello') // 5
 * getCachedStringWidth('你好') // 4 (每个汉字宽度 2)
 * getCachedStringWidth('👋') // 2 (emoji 宽度 2)
 */
export function getCachedStringWidth(str: string): number {
  // ASCII 可打印字符快速路径
  if (/^[\x20-\x7E]*$/.test(str)) {
    return str.length;
  }

  if (stringWidthCache.has(str)) {
    return stringWidthCache.get(str)!;
  }

  const width = stringWidth(str);
  stringWidthCache.set(str, width);

  return width;
}

/**
 * 清除字符串宽度缓存
 */
export function clearStringWidthCache(): void {
  stringWidthCache.clear();
}

// =========================================================================
// 文本截断和换行
// =========================================================================

/**
 * 按显示宽度截断文本
 * 正确处理 Unicode 字符，不会在字符中间截断
 *
 * @param text 要截断的文本
 * @param maxWidth 最大显示宽度
 * @param ellipsis 省略号（默认 '…'）
 * @returns 截断后的文本
 */
export function truncateByWidth(
  text: string,
  maxWidth: number,
  ellipsis = '…'
): string {
  const textWidth = getCachedStringWidth(text);

  if (textWidth <= maxWidth) {
    return text;
  }

  const ellipsisWidth = getCachedStringWidth(ellipsis);
  const targetWidth = maxWidth - ellipsisWidth;

  if (targetWidth <= 0) {
    return ellipsis.slice(0, maxWidth);
  }

  const codePoints = toCodePoints(text);
  let currentWidth = 0;
  let sliceEndIndex = 0;

  for (const char of codePoints) {
    const charWidth = getCachedStringWidth(char);
    if (currentWidth + charWidth > targetWidth) {
      break;
    }
    currentWidth += charWidth;
    sliceEndIndex++;
  }

  return codePoints.slice(0, sliceEndIndex).join('') + ellipsis;
}

/**
 * 样式化文本片段
 */
export interface StyledText {
  text: string;
  props: Record<string, unknown>;
}

/**
 * 将超长文本按宽度换行，保留样式
 *
 * @param segments 带样式的文本片段数组
 * @param maxWidth 每行最大宽度
 * @returns 换行后的多行文本
 */
export function wrapStyledText(
  segments: StyledText[],
  maxWidth: number
): StyledText[][] {
  const lines: StyledText[][] = [];
  let currentLine: StyledText[] = [];
  let currentLineWidth = 0;

  function pushLine() {
    if (currentLine.length > 0 || lines.length === 0) {
      lines.push(currentLine);
    }
    currentLine = [];
    currentLineWidth = 0;
  }

  function addToLine(text: string, props: Record<string, unknown>) {
    if (!text) return;

    // 合并相同样式的连续片段
    if (
      currentLine.length > 0 &&
      JSON.stringify(currentLine[currentLine.length - 1].props) ===
        JSON.stringify(props)
    ) {
      currentLine[currentLine.length - 1].text += text;
    } else {
      currentLine.push({ text, props });
    }
  }

  for (const segment of segments) {
    // 处理换行符
    const textLines = segment.text.split('\n');

    for (let lineIndex = 0; lineIndex < textLines.length; lineIndex++) {
      // 换行符后开始新行
      if (lineIndex > 0) {
        pushLine();
      }

      const lineText = textLines[lineIndex];
      // 按空格分割单词
      const words = lineText.split(/(\s+)/);

      for (const word of words) {
        if (!word) continue;

        const wordWidth = getCachedStringWidth(word);

        // 检查是否需要换行
        if (currentLineWidth + wordWidth > maxWidth && currentLineWidth > 0) {
          pushLine();
          // 跳过纯空格（不在行首显示）
          if (/^\s+$/.test(word)) {
            continue;
          }
        }

        // 单词本身超过最大宽度，需要拆分
        if (wordWidth > maxWidth) {
          const wordCodePoints = toCodePoints(word);
          let remainingCodePoints = wordCodePoints;

          while (remainingCodePoints.length > 0) {
            let splitIndex = 0;
            let splitWidth = 0;

            // 找到能放入当前行的最大字符数
            for (const char of remainingCodePoints) {
              const charWidth = getCachedStringWidth(char);
              if (currentLineWidth + splitWidth + charWidth > maxWidth) {
                break;
              }
              splitWidth += charWidth;
              splitIndex++;
            }

            // 如果当前行已有内容但放不下任何字符，先换行
            if (splitIndex === 0 && currentLineWidth > 0) {
              pushLine();
              continue;
            }

            // 至少放一个字符
            if (splitIndex === 0) {
              splitIndex = 1;
              splitWidth = getCachedStringWidth(remainingCodePoints[0]);
            }

            const part = remainingCodePoints.slice(0, splitIndex).join('');
            addToLine(part, segment.props);
            currentLineWidth += splitWidth;
            remainingCodePoints = remainingCodePoints.slice(splitIndex);

            // 如果还有剩余，换行继续
            if (remainingCodePoints.length > 0) {
              pushLine();
            }
          }
        } else {
          addToLine(word, segment.props);
          currentLineWidth += wordWidth;
        }
      }
    }
  }

  // 添加最后一行
  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  return lines;
}
