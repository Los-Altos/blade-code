/**
 * 主题系统统一导出
 */

// 主题预设和辅助函数
export { getThemeById, getThemeIds, themes, type ThemeItem } from './presets.js';

// 核心管理器
export { themeManager } from './ThemeManager.js';

// 类型定义
export type { BaseColors, SyntaxColors, Theme } from './types.js';
