/**
 * /spec Slash Command
 *
 * Spec-Driven Development 工作流管理命令
 *
 * 融合了 OpenSpec 和 GitHub Spec Kit 的设计：
 * - 支持子命令风格: /spec proposal <name>
 * - 支持点号风格: /spec.proposal (通过别名实现)
 */

import { SpecManager } from '../spec/SpecManager.js';
import { PHASE_DISPLAY_NAMES } from '../spec/types.js';
import { sessionActions } from '../store/vanilla.js';
import type { SlashCommand, SlashCommandContext, SlashCommandResult } from './types.js';

/**
 * 主 /spec 命令
 */
const specCommand: SlashCommand = {
  name: 'spec',
  description: 'Spec-Driven Development 工作流管理',
  fullDescription: `Spec-Driven Development (SDD) 工作流管理

提供结构化的开发工作流：Requirements → Design → Tasks → Implementation

## 核心命令

- \`/spec proposal <name> [description]\` - 创建变更提案
- \`/spec requirements\` - 需求定义 (EARS 格式)
- \`/spec plan\` - 技术架构规划
- \`/spec tasks\` - 任务分解
- \`/spec apply [task-id]\` - 执行任务
- \`/spec archive\` - 归档变更

## 辅助命令

- \`/spec status\` - 查看当前状态
- \`/spec list\` - 列出所有变更
- \`/spec load <name>\` - 加载已有变更
- \`/spec validate\` - 验证完整性
- \`/spec steering\` - 管理治理文档

## 目录结构

\`\`\`
.blade/
├── specs/       # 权威规格
├── changes/     # 活跃变更
├── archive/     # 已完成变更
└── steering/    # 治理文档
\`\`\``,
  usage: '/spec <subcommand> [args]',
  aliases: ['sdd'],
  category: 'workflow',
  examples: [
    '/spec proposal user-auth "Implement OAuth2 authentication"',
    '/spec status',
    '/spec list',
    '/spec load user-auth',
  ],

  async handler(
    args: string[],
    context: SlashCommandContext
  ): Promise<SlashCommandResult> {
    const subcommand = args[0]?.toLowerCase();
    const restArgs = args.slice(1);

    switch (subcommand) {
      // ===== 核心工作流命令 =====
      case 'proposal':
      case 'init':
      case 'create':
      case 'new':
        return handleSpecProposal(restArgs, context);

      case 'requirements':
      case 'reqs':
      case 'req':
        return handleSpecRequirements(context);

      case 'plan':
        return handleSpecPlan(context);

      case 'tasks':
        return handleSpecTasks(context);

      case 'apply':
      case 'impl':
      case 'implement':
        return handleSpecApply(restArgs, context);

      case 'archive':
      case 'done':
      case 'complete':
        return handleSpecArchive(context);

      // ===== 辅助命令 =====
      case 'status':
        return handleSpecStatus(context);

      case 'list':
      case 'ls':
        return handleSpecList(restArgs, context);

      case 'load':
      case 'open':
        return handleSpecLoad(restArgs, context);

      case 'validate':
      case 'check':
        return handleSpecValidate(context);

      case 'steering':
      case 'constitution':
        return handleSpecSteering(restArgs, context);

      case 'exit':
      case 'close':
        return handleSpecExit(context);

      case undefined:
      case '':
      case 'help':
        return showSpecHelp();

      default:
        return {
          success: false,
          error: `未知子命令: ${subcommand}\n\n` + '使用 /spec help 查看可用命令',
        };
    }
  },
};

// ===== 命令处理函数 =====

/**
 * 创建变更提案
 */
async function handleSpecProposal(
  args: string[],
  context: SlashCommandContext
): Promise<SlashCommandResult> {
  const name = args[0];
  const description = args.slice(1).join(' ') || 'New feature';

  if (!name) {
    return {
      success: false,
      error: '请提供变更名称: /spec proposal <name> [description]',
    };
  }

  // 验证名称格式
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    return {
      success: false,
      error: '名称只能包含字母、数字、下划线和连字符',
    };
  }

  try {
    const specManager = SpecManager.getInstance();
    await specManager.initialize(context.workspaceRoot || context.cwd);

    const result = await specManager.createSpec(name, description);

    if (!result.success) {
      return {
        success: false,
        error: result.message,
      };
    }

    sessionActions().addAssistantMessage(
      `✅ 创建变更提案: ${name}\n\n` +
        `📁 路径: .blade/changes/${name}/\n` +
        `📝 描述: ${description}\n\n` +
        '下一步:\n' +
        '1. 编辑 proposal.md 补充背景和目标\n' +
        '2. 使用 /spec plan 创建技术设计\n' +
        '3. 使用 /spec tasks 分解任务'
    );

    return {
      success: true,
      message: `创建变更提案: ${name}`,
      data: {
        action: 'invoke_skill',
        skillName: 'spec',
        skillArgs: `proposal ${name}`,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `创建失败: ${error instanceof Error ? error.message : '未知错误'}`,
    };
  }
}

/**
 * 需求定义
 */
async function handleSpecRequirements(
  context: SlashCommandContext
): Promise<SlashCommandResult> {
  const specManager = SpecManager.getInstance();
  const currentSpec = specManager.getCurrentSpec();

  if (!currentSpec) {
    return {
      success: false,
      error: '没有活跃的变更。使用 /spec proposal <name> 创建或 /spec load <name> 加载',
    };
  }

  if (currentSpec.phase === 'requirements') {
    sessionActions().addAssistantMessage(
      `📋 当前已在需求定义阶段: ${currentSpec.name}\n\n` +
        '请创建或继续编辑需求文档 (requirements.md):\n\n' +
        '使用 **EARS 格式** 定义需求:\n' +
        '- **Ubiquitous**: The system shall [action]\n' +
        '- **Event-driven**: When [trigger], the system shall [action]\n' +
        '- **State-driven**: While [state], the system shall [action]\n' +
        '- **Optional**: Where [feature], the system shall [action]\n' +
        '- **Unwanted**: If [condition], then the system shall [action]\n\n' +
        '完成后使用 /spec plan 进入设计阶段，或 /spec tasks 直接进入任务分解'
    );
    return { success: true, message: `当前阶段: 需求定义` };
  }

  const result = await specManager.transitionPhase('requirements');

  if (!result.success) {
    const allowedNext = specManager.getAllowedTransitions();
    const allowedNames = allowedNext.map((p) => PHASE_DISPLAY_NAMES[p]).join('、');

    sessionActions().addAssistantMessage(
      `❌ 无法进入需求定义阶段\n\n` +
        `当前阶段: ${PHASE_DISPLAY_NAMES[currentSpec.phase]}\n` +
        `允许的下一阶段: ${allowedNames || '无'}\n\n` +
        `提示: 当前阶段不允许跳转到需求定义阶段`
    );

    return {
      success: false,
      error: `无法从 ${PHASE_DISPLAY_NAMES[currentSpec.phase]} 转换到需求定义阶段`,
    };
  }

  sessionActions().addAssistantMessage(
    `📋 进入需求定义阶段: ${currentSpec.name}\n\n` +
      '请创建需求文档 (requirements.md):\n\n' +
      '使用 **EARS 格式** 定义需求:\n' +
      '- **Ubiquitous**: The system shall [action]\n' +
      '- **Event-driven**: When [trigger], the system shall [action]\n' +
      '- **State-driven**: While [state], the system shall [action]\n' +
      '- **Optional**: Where [feature], the system shall [action]\n' +
      '- **Unwanted**: If [condition], then the system shall [action]\n\n' +
      '完成后使用 /spec plan 进入设计阶段，或 /spec tasks 直接进入任务分解'
  );

  return {
    success: true,
    message: `进入需求定义阶段: ${currentSpec.name}`,
  };
}

/**
 * 技术规划
 */
async function handleSpecPlan(
  context: SlashCommandContext
): Promise<SlashCommandResult> {
  const specManager = SpecManager.getInstance();
  const currentSpec = specManager.getCurrentSpec();

  if (!currentSpec) {
    return {
      success: false,
      error: '没有活跃的变更。使用 /spec proposal <name> 创建或 /spec load <name> 加载',
    };
  }

  // 如果已经在 design 或更后的阶段，直接显示提示
  if (currentSpec.phase === 'design') {
    sessionActions().addAssistantMessage(
      `📐 当前已在设计阶段: ${currentSpec.name}\n\n` +
        '请创建或继续编辑技术设计文档 (design.md):\n\n' +
        '1. **架构概览** - 使用 Mermaid 图展示组件关系\n' +
        '2. **API 设计** - 定义接口契约\n' +
        '3. **数据模型** - 描述数据结构\n' +
        '4. **错误处理** - 说明异常情况\n\n' +
        '完成后使用 /spec tasks 进入任务分解'
    );
    return { success: true, message: `当前阶段: 设计` };
  }

  // 尝试转换到 design 阶段
  const result = await specManager.transitionPhase('design');

  if (!result.success) {
    // 阶段转换失败，给出明确错误提示
    const allowedNext = specManager.getAllowedTransitions();
    const allowedNames = allowedNext.map((p) => PHASE_DISPLAY_NAMES[p]).join('、');

    sessionActions().addAssistantMessage(
      `❌ 无法进入设计阶段\n\n` +
        `当前阶段: ${PHASE_DISPLAY_NAMES[currentSpec.phase]}\n` +
        `允许的下一阶段: ${allowedNames || '无'}\n\n` +
        (currentSpec.phase === 'init'
          ? '提示: 请先使用 /spec requirements 进入需求阶段，或编辑 proposal.md 后使用 /spec tasks 跳过设计直接分解任务'
          : `提示: 当前阶段不允许直接跳转到设计阶段`)
    );

    return {
      success: false,
      error: `无法从 ${PHASE_DISPLAY_NAMES[currentSpec.phase]} 转换到设计阶段`,
    };
  }

  sessionActions().addAssistantMessage(
    `📐 进入设计阶段: ${currentSpec.name}\n\n` +
      '请创建技术设计文档 (design.md):\n\n' +
      '1. **架构概览** - 使用 Mermaid 图展示组件关系\n' +
      '2. **API 设计** - 定义接口契约\n' +
      '3. **数据模型** - 描述数据结构\n' +
      '4. **错误处理** - 说明异常情况\n\n' +
      '完成后使用 /spec tasks 进入任务分解'
  );

  return {
    success: true,
    message: `进入设计阶段: ${currentSpec.name}`,
  };
}

/**
 * 任务分解
 */
async function handleSpecTasks(
  context: SlashCommandContext
): Promise<SlashCommandResult> {
  const specManager = SpecManager.getInstance();
  const currentSpec = specManager.getCurrentSpec();

  if (!currentSpec) {
    return {
      success: false,
      error: '没有活跃的变更。使用 /spec proposal <name> 创建或 /spec load <name> 加载',
    };
  }

  // 如果已经在 tasks 或更后的阶段，直接显示提示
  if (currentSpec.phase === 'tasks') {
    const progress = specManager.getTaskProgress();
    sessionActions().addAssistantMessage(
      `📋 当前已在任务分解阶段: ${currentSpec.name}\n\n` +
        `已有任务: ${progress.total} 个 (${progress.completed} 完成)\n\n` +
        '请创建或继续编辑任务列表 (tasks.md):\n\n' +
        '每个任务应包含:\n' +
        '- **标题**: 简短描述\n' +
        '- **复杂度**: low / medium / high\n' +
        '- **依赖**: 需要先完成的任务\n' +
        '- **影响文件**: 会修改的文件列表\n\n' +
        '完成后使用 /spec apply 开始实现'
    );
    return { success: true, message: `当前阶段: 任务分解` };
  }

  // 尝试转换到 tasks 阶段
  const result = await specManager.transitionPhase('tasks');

  if (!result.success) {
    // 阶段转换失败，给出明确错误提示
    const allowedNext = specManager.getAllowedTransitions();
    const allowedNames = allowedNext.map((p) => PHASE_DISPLAY_NAMES[p]).join('、');

    sessionActions().addAssistantMessage(
      `❌ 无法进入任务分解阶段\n\n` +
        `当前阶段: ${PHASE_DISPLAY_NAMES[currentSpec.phase]}\n` +
        `允许的下一阶段: ${allowedNames || '无'}\n\n` +
        (currentSpec.phase === 'init'
          ? '提示: 请先完成需求定义阶段'
          : `提示: 当前阶段不允许直接跳转到任务分解阶段`)
    );

    return {
      success: false,
      error: `无法从 ${PHASE_DISPLAY_NAMES[currentSpec.phase]} 转换到任务分解阶段`,
    };
  }

  sessionActions().addAssistantMessage(
    `📋 进入任务分解阶段: ${currentSpec.name}\n\n` +
      '请创建任务列表 (tasks.md):\n\n' +
      '每个任务应包含:\n' +
      '- **标题**: 简短描述\n' +
      '- **复杂度**: low / medium / high\n' +
      '- **依赖**: 需要先完成的任务\n' +
      '- **影响文件**: 会修改的文件列表\n\n' +
      '示例:\n' +
      '```markdown\n' +
      '## Task 1: 创建用户模型\n' +
      '- 复杂度: low\n' +
      '- 依赖: 无\n' +
      '- 文件: src/models/User.ts\n' +
      '```\n\n' +
      '完成后使用 /spec apply 开始实现'
  );

  return {
    success: true,
    message: `进入任务分解阶段: ${currentSpec.name}`,
  };
}

/**
 * 执行任务
 */
async function handleSpecApply(
  args: string[],
  context: SlashCommandContext
): Promise<SlashCommandResult> {
  const taskId = args[0];
  const specManager = SpecManager.getInstance();
  const currentSpec = specManager.getCurrentSpec();

  if (!currentSpec) {
    return {
      success: false,
      error: '没有活跃的变更',
    };
  }

  // 转换到实现阶段
  if (currentSpec.phase !== 'implementation') {
    const result = await specManager.transitionPhase('implementation');

    if (!result.success) {
      // 阶段转换失败，给出明确错误提示
      const allowedNext = specManager.getAllowedTransitions();
      const allowedNames = allowedNext.map((p) => PHASE_DISPLAY_NAMES[p]).join('、');

      sessionActions().addAssistantMessage(
        `❌ 无法进入实现阶段\n\n` +
          `当前阶段: ${PHASE_DISPLAY_NAMES[currentSpec.phase]}\n` +
          `允许的下一阶段: ${allowedNames || '无'}\n\n` +
          (currentSpec.phase === 'init'
            ? '提示: 请先完成需求定义 → 任务分解阶段'
            : currentSpec.phase === 'requirements'
              ? '提示: 请先完成任务分解阶段 (/spec tasks)'
              : currentSpec.phase === 'design'
                ? '提示: 请先完成任务分解阶段 (/spec tasks)'
                : `提示: 当前阶段不允许直接跳转到实现阶段`)
      );

      return {
        success: false,
        error: `无法从 ${PHASE_DISPLAY_NAMES[currentSpec.phase]} 转换到实现阶段`,
      };
    }
  }

  // 获取下一个任务
  const nextTask = taskId
    ? currentSpec.tasks.find((t) => t.id === taskId)
    : specManager.getNextTask();

  if (!nextTask) {
    const progress = specManager.getTaskProgress();
    if (progress.completed === progress.total && progress.total > 0) {
      sessionActions().addAssistantMessage(
        `🎉 所有任务已完成！\n\n` + `使用 /spec archive 归档变更`
      );
    } else {
      sessionActions().addAssistantMessage(
        `没有待执行的任务。\n\n` +
          `进度: ${progress.completed}/${progress.total}\n` +
          `使用 /spec status 查看详情`
      );
    }
    return { success: true, message: '没有待执行任务' };
  }

  // 标记任务为进行中
  await specManager.updateTaskStatus(nextTask.id, 'in_progress');

  sessionActions().addAssistantMessage(
    `🔄 开始执行任务: ${nextTask.title}\n\n` +
      `📝 描述: ${nextTask.description}\n` +
      `📊 复杂度: ${nextTask.complexity}\n` +
      `📁 影响文件: ${nextTask.affectedFiles.join(', ') || '未指定'}\n\n` +
      '请实现此任务，完成后告诉我以更新状态。'
  );

  return {
    success: true,
    message: `开始任务: ${nextTask.title}`,
  };
}

/**
 * 归档变更
 */
async function handleSpecArchive(
  context: SlashCommandContext
): Promise<SlashCommandResult> {
  const specManager = SpecManager.getInstance();
  const currentSpec = specManager.getCurrentSpec();

  if (!currentSpec) {
    return {
      success: false,
      error: '没有活跃的变更',
    };
  }

  const progress = specManager.getTaskProgress();
  const result = await specManager.archiveCurrentSpec();

  if (!result.success) {
    return {
      success: false,
      error: result.message,
    };
  }

  sessionActions().addAssistantMessage(
    `✅ 变更已归档: ${currentSpec.name}\n\n` +
      `📊 最终状态:\n` +
      `- 阶段: ${PHASE_DISPLAY_NAMES[currentSpec.phase]}\n` +
      `- 任务: ${progress.completed}/${progress.total} 完成\n\n` +
      `📁 归档位置: .blade/archive/${currentSpec.name}/`
  );

  return {
    success: true,
    message: `归档: ${currentSpec.name}`,
  };
}

/**
 * 查看状态
 */
async function handleSpecStatus(
  context: SlashCommandContext
): Promise<SlashCommandResult> {
  const specManager = SpecManager.getInstance();

  try {
    await specManager.initialize(context.workspaceRoot || context.cwd);
  } catch {
    // 忽略初始化错误
  }

  const currentSpec = specManager.getCurrentSpec();

  if (!currentSpec) {
    sessionActions().addAssistantMessage(
      '📋 Spec 状态: 无活跃变更\n\n' +
        '使用 /spec proposal <name> 创建新变更\n' +
        '使用 /spec list 查看所有变更'
    );
    return { success: true, message: '无活跃变更' };
  }

  const progress = specManager.getTaskProgress();
  const progressBar =
    progress.total > 0
      ? `[${'█'.repeat(Math.round(progress.percentage / 5))}${'░'.repeat(20 - Math.round(progress.percentage / 5))}] ${progress.percentage}%`
      : '无任务';

  sessionActions().addAssistantMessage(
    `📋 Spec 状态: ${currentSpec.name}\n\n` +
      `📝 描述: ${currentSpec.description}\n` +
      `📊 阶段: ${PHASE_DISPLAY_NAMES[currentSpec.phase]}\n` +
      `📈 任务: ${progress.completed}/${progress.total}\n` +
      `${progressBar}\n\n` +
      `📅 创建: ${new Date(currentSpec.createdAt).toLocaleString()}\n` +
      `📅 更新: ${new Date(currentSpec.updatedAt).toLocaleString()}`
  );

  return {
    success: true,
    message: `状态: ${currentSpec.name}`,
  };
}

/**
 * 列出变更
 */
async function handleSpecList(
  args: string[],
  context: SlashCommandContext
): Promise<SlashCommandResult> {
  const includeArchived = args.includes('--all') || args.includes('-a');

  const specManager = SpecManager.getInstance();

  try {
    await specManager.initialize(context.workspaceRoot || context.cwd);
  } catch {
    // 忽略初始化错误
  }

  const specs = await specManager.listSpecs({ includeArchived });

  if (specs.length === 0) {
    sessionActions().addAssistantMessage(
      '📋 没有变更\n\n' + '使用 /spec proposal <name> 创建新变更'
    );
    return { success: true, message: '没有变更' };
  }

  const lines = specs.map((spec) => {
    const status = spec.isArchived ? '📦' : '📝';
    const progress =
      spec.taskProgress.total > 0
        ? ` (${spec.taskProgress.completed}/${spec.taskProgress.total})`
        : '';
    return `${status} **${spec.name}** - ${PHASE_DISPLAY_NAMES[spec.phase]}${progress}`;
  });

  sessionActions().addAssistantMessage(
    `📋 变更列表 (${specs.length})\n\n` +
      lines.join('\n') +
      (includeArchived ? '' : '\n\n使用 /spec list --all 包含已归档')
  );

  return {
    success: true,
    message: `${specs.length} 个变更`,
  };
}

/**
 * 加载变更
 */
async function handleSpecLoad(
  args: string[],
  context: SlashCommandContext
): Promise<SlashCommandResult> {
  const name = args[0];

  if (!name) {
    return {
      success: false,
      error: '请提供变更名称: /spec load <name>',
    };
  }

  const specManager = SpecManager.getInstance();

  try {
    await specManager.initialize(context.workspaceRoot || context.cwd);
  } catch {
    // 忽略初始化错误
  }

  const result = await specManager.loadSpec(name);

  if (!result.success) {
    return {
      success: false,
      error: result.message,
    };
  }

  const spec = result.data?.spec;
  if (!spec) {
    return { success: false, error: '加载失败' };
  }

  const progress = specManager.getTaskProgress();

  sessionActions().addAssistantMessage(
    `✅ 已加载: ${name}\n\n` +
      `📊 阶段: ${PHASE_DISPLAY_NAMES[spec.phase]}\n` +
      `📈 任务: ${progress.completed}/${progress.total}\n\n` +
      '使用 /spec status 查看详情'
  );

  return {
    success: true,
    message: `加载: ${name}`,
  };
}

/**
 * 验证变更
 */
async function handleSpecValidate(
  context: SlashCommandContext
): Promise<SlashCommandResult> {
  const specManager = SpecManager.getInstance();
  const currentSpec = specManager.getCurrentSpec();

  if (!currentSpec) {
    return {
      success: false,
      error: '没有活跃的变更',
    };
  }

  const validation = await specManager.validateCurrentSpec();

  const issueLines = validation.issues.map((issue) => {
    const icon = { error: '🔴', warning: '🟡', info: '🔵' }[issue.severity];
    return `${icon} ${issue.file}: ${issue.message}`;
  });

  sessionActions().addAssistantMessage(
    `🔍 验证结果: ${currentSpec.name}\n\n` +
      `状态: ${validation.valid ? '✅ 通过' : '⚠️ 有问题'}\n\n` +
      (issueLines.length > 0 ? `问题:\n${issueLines.join('\n')}\n\n` : '') +
      (validation.suggestions.length > 0
        ? `建议:\n${validation.suggestions.map((s) => `- ${s}`).join('\n')}`
        : '')
  );

  return {
    success: true,
    message: validation.valid ? '验证通过' : `${validation.issues.length} 个问题`,
  };
}

/**
 * 管理治理文档
 */
async function handleSpecSteering(
  args: string[],
  context: SlashCommandContext
): Promise<SlashCommandResult> {
  const specManager = SpecManager.getInstance();

  try {
    await specManager.initialize(context.workspaceRoot || context.cwd);
  } catch {
    // 忽略初始化错误
  }

  const steering = await specManager.getSteeringContextString();

  if (!steering) {
    sessionActions().addAssistantMessage(
      '📖 Steering Documents\n\n' +
        '没有找到治理文档。\n\n' +
        '在 .blade/steering/ 目录创建:\n' +
        '- constitution.md - 项目治理原则\n' +
        '- product.md - 产品愿景\n' +
        '- tech.md - 技术栈\n' +
        '- structure.md - 代码结构'
    );
  } else {
    sessionActions().addAssistantMessage(`📖 Steering Documents\n\n${steering}`);
  }

  return {
    success: true,
    message: 'Steering Documents',
  };
}

/**
 * 退出 Spec 模式
 */
async function handleSpecExit(
  context: SlashCommandContext
): Promise<SlashCommandResult> {
  const specManager = SpecManager.getInstance();
  const currentSpec = specManager.getCurrentSpec();

  if (!currentSpec) {
    return {
      success: true,
      message: '没有活跃的变更',
    };
  }

  specManager.exitSpecMode();

  sessionActions().addAssistantMessage(
    `✅ 已退出: ${currentSpec.name}\n\n` +
      `变更已保存在 .blade/changes/${currentSpec.name}/\n` +
      `使用 /spec load ${currentSpec.name} 恢复`
  );

  return {
    success: true,
    message: `退出: ${currentSpec.name}`,
  };
}

/**
 * 显示帮助
 */
function showSpecHelp(): SlashCommandResult {
  sessionActions().addAssistantMessage(
    `# /spec - Spec-Driven Development

## 核心工作流

\`\`\`
/spec proposal <name> [desc]  创建变更提案
/spec requirements            进入需求定义 (EARS 格式)
/spec plan                    进入设计阶段
/spec tasks                   进入任务分解
/spec apply [task-id]         执行任务
/spec archive                 归档变更
\`\`\`

## 辅助命令

\`\`\`
/spec status                  查看当前状态
/spec list [--all]            列出所有变更
/spec load <name>             加载已有变更
/spec validate                验证完整性
/spec steering                查看治理文档
/spec exit                    退出（不归档）
\`\`\`

## 工作流阶段

1. **提案** (init) - 描述为什么需要这个变更
2. **需求** (requirements) - 使用 EARS 格式定义需求
3. **设计** (design) - 创建技术架构
4. **任务** (tasks) - 分解为原子任务
5. **实现** (implementation) - 逐个完成任务
6. **完成** (done) - 归档变更

## 目录结构

\`\`\`
.blade/
├── specs/       # 权威规格
├── changes/     # 活跃变更
├── archive/     # 已完成变更
└── steering/    # 治理文档
\`\`\`
`
  );

  return {
    success: true,
    message: 'Spec 帮助',
  };
}

export default specCommand;
