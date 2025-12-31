/**
 * Spec-Driven Development (SDD) 类型定义
 *
 * 融合了 OpenSpec 和 GitHub Spec Kit 的设计理念：
 * - OpenSpec: specs/ + changes/ + archive/ 目录结构，变更追踪
 * - Spec Kit: constitution.md 治理原则，详细工作流阶段
 */

/**
 * Spec 工作流阶段
 *
 * 四阶段工作流：Requirements → Design → Tasks → Implementation
 */
export type SpecPhase =
  | 'init' // 初始化：创建提案骨架
  | 'requirements' // 需求阶段：使用 EARS 格式生成需求文档
  | 'design' // 设计阶段：创建技术架构（Mermaid 图、API 契约等）
  | 'tasks' // 任务分解：拆分为可执行的原子任务
  | 'implementation' // 实现阶段：逐个完成任务
  | 'done'; // 完成：归档变更

/**
 * 任务状态
 */
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'blocked' | 'skipped';

/**
 * 任务复杂度
 */
export type TaskComplexity = 'low' | 'medium' | 'high';

/**
 * Spec 任务定义
 */
export interface SpecTask {
  /** 任务 ID（nanoid） */
  id: string;
  /** 任务标题 */
  title: string;
  /** 任务描述 */
  description: string;
  /** 任务状态 */
  status: TaskStatus;
  /** 依赖的任务 ID 列表 */
  dependencies: string[];
  /** 影响的文件列表 */
  affectedFiles: string[];
  /** 预估复杂度 */
  complexity: TaskComplexity;
  /** 完成时间（ISO 8601） */
  completedAt?: string;
  /** 备注 */
  notes?: string;
}

/**
 * Spec 元数据
 *
 * 存储在 .blade/changes/<feature>/.meta.json
 */
export interface SpecMetadata {
  /** Spec ID（nanoid） */
  id: string;
  /** Feature 名称（目录名） */
  name: string;
  /** Feature 描述 */
  description: string;
  /** 当前阶段 */
  phase: SpecPhase;
  /** 创建时间（ISO 8601） */
  createdAt: string;
  /** 更新时间（ISO 8601） */
  updatedAt: string;
  /** 任务列表 */
  tasks: SpecTask[];
  /** 当前执行的任务 ID */
  currentTaskId?: string;
  /** 相关领域（用于 specs/ 目录分类） */
  domains?: string[];
  /** 标签 */
  tags?: string[];
  /** 作者 */
  author?: string;
}

/**
 * Steering Documents 上下文
 *
 * 全局项目治理文档，参考 Spec Kit 的 constitution.md
 */
export interface SteeringContext {
  /** 项目治理原则（constitution.md） */
  constitution?: string;
  /** 产品愿景和目标（product.md） */
  product?: string;
  /** 技术栈和约束（tech.md） */
  tech?: string;
  /** 代码组织模式（structure.md） */
  structure?: string;
}

/**
 * Spec 运行时状态
 *
 * 存储在 Zustand Store 中
 */
export interface SpecState {
  /** 当前活跃的 Spec */
  currentSpec: SpecMetadata | null;
  /** Spec 文件路径 */
  specPath: string | null;
  /** 是否处于 Spec 模式 */
  isActive: boolean;
  /** Steering 上下文（缓存） */
  steeringContext: SteeringContext | null;
  /** 最近使用的 Spec 列表（用于快速切换） */
  recentSpecs: string[];
}

/**
 * Spec 文件类型
 */
export type SpecFileType =
  | 'proposal' // 提案描述（为什么做）
  | 'spec' // 规格文件（做什么）
  | 'requirements' // 需求文档（EARS 格式）
  | 'design' // 设计文档（怎么做）
  | 'tasks' // 任务分解（具体步骤）
  | 'meta'; // 元数据（.meta.json）

/**
 * Spec 文件路径映射
 */
export const SPEC_FILE_NAMES: Record<SpecFileType, string> = {
  proposal: 'proposal.md',
  spec: 'spec.md',
  requirements: 'requirements.md',
  design: 'design.md',
  tasks: 'tasks.md',
  meta: '.meta.json',
};

/**
 * Spec 目录结构
 *
 * .blade/
 * ├── specs/              # 权威规格（单一信息源）
 * │   └── [domain]/spec.md
 * ├── changes/            # 活跃的变更提案
 * │   └── <feature>/
 * │       ├── proposal.md
 * │       ├── spec.md
 * │       ├── requirements.md
 * │       ├── design.md
 * │       ├── tasks.md
 * │       ├── .meta.json
 * │       └── specs/      # 规格增量（delta）
 * ├── archive/            # 已完成的变更
 * └── steering/           # 全局治理文档
 */
export const SPEC_DIRS = {
  /** 权威规格目录 */
  SPECS: 'specs',
  /** 活跃变更目录 */
  CHANGES: 'changes',
  /** 归档目录 */
  ARCHIVE: 'archive',
  /** 治理文档目录 */
  STEERING: 'steering',
  /** 规格增量目录（在 changes/<feature>/ 下） */
  SPEC_DELTA: 'specs',
} as const;

/**
 * Steering 文件名
 */
export const STEERING_FILES = {
  CONSTITUTION: 'constitution.md',
  PRODUCT: 'product.md',
  TECH: 'tech.md',
  STRUCTURE: 'structure.md',
} as const;

/**
 * 阶段顺序
 */
export const PHASE_ORDER: SpecPhase[] = [
  'init',
  'requirements',
  'design',
  'tasks',
  'implementation',
  'done',
];

/**
 * 阶段转换规则
 */
export const PHASE_TRANSITIONS: Record<SpecPhase, SpecPhase[]> = {
  init: ['requirements'],
  requirements: ['design', 'tasks'], // 可以跳过 design 直接到 tasks
  design: ['tasks'],
  tasks: ['implementation'],
  implementation: ['done', 'tasks'], // 可以回退到 tasks 添加新任务
  done: [], // 终态
};

/**
 * 阶段显示名称
 */
export const PHASE_DISPLAY_NAMES: Record<SpecPhase, string> = {
  init: '初始化',
  requirements: '需求定义',
  design: '架构设计',
  tasks: '任务分解',
  implementation: '实现中',
  done: '已完成',
};

/**
 * 阶段对应的主要文件
 */
export const PHASE_PRIMARY_FILE: Record<SpecPhase, SpecFileType | null> = {
  init: 'proposal',
  requirements: 'requirements',
  design: 'design',
  tasks: 'tasks',
  implementation: 'tasks', // 实现阶段主要更新 tasks 状态
  done: null,
};

/**
 * Spec 操作结果
 */
export interface SpecOperationResult {
  success: boolean;
  message: string;
  data?: {
    spec?: SpecMetadata;
    path?: string;
    phase?: SpecPhase;
    task?: SpecTask;
  };
  error?: string;
}

/**
 * Spec 验证结果
 */
export interface SpecValidationResult {
  valid: boolean;
  phase: SpecPhase;
  completeness: {
    proposal: boolean;
    spec: boolean;
    requirements: boolean;
    design: boolean;
    tasks: boolean;
  };
  issues: SpecValidationIssue[];
  suggestions: string[];
}

/**
 * 验证问题
 */
export interface SpecValidationIssue {
  severity: 'error' | 'warning' | 'info';
  file: SpecFileType;
  message: string;
  line?: number;
}

/**
 * Spec 搜索选项
 */
export interface SpecSearchOptions {
  /** 是否包含归档的 Spec */
  includeArchived?: boolean;
  /** 按阶段过滤 */
  phase?: SpecPhase;
  /** 按标签过滤 */
  tags?: string[];
  /** 搜索关键词 */
  query?: string;
}

/**
 * Spec 列表项
 */
export interface SpecListItem {
  name: string;
  description: string;
  phase: SpecPhase;
  updatedAt: string;
  path: string;
  isArchived: boolean;
  taskProgress: {
    total: number;
    completed: number;
  };
}
