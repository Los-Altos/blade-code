/**
 * Spec-Driven Development (SDD) 模块
 *
 * 提供结构化的开发工作流：Requirements → Design → Tasks → Implementation
 *
 * @example
 * ```typescript
 * import { SpecManager, SpecFileManager } from './spec/index.js';
 *
 * // 初始化
 * const manager = SpecManager.getInstance();
 * await manager.initialize('/path/to/project');
 *
 * // 创建新的 Spec
 * await manager.createSpec('user-auth', 'Implement user authentication');
 *
 * // 转换阶段
 * await manager.transitionPhase('requirements');
 * ```
 */

// 核心管理器
export { SpecFileManager } from './SpecFileManager.js';
export { SpecManager } from './SpecManager.js';

// 类型导出
export type {
  SpecFileType,
  SpecListItem,
  SpecMetadata,
  SpecOperationResult,
  SpecPhase,
  SpecSearchOptions,
  SpecState,
  SpecTask,
  SpecValidationIssue,
  SpecValidationResult,
  SteeringContext,
  TaskComplexity,
  TaskStatus,
} from './types.js';

// 常量导出
export {
  PHASE_DISPLAY_NAMES,
  PHASE_PRIMARY_FILE,
  PHASE_TRANSITIONS,
  SPEC_DIRS,
  SPEC_FILE_NAMES,
  STEERING_FILES,
} from './types.js';
