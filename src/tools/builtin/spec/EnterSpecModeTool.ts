/**
 * EnterSpecMode Tool
 *
 * 请求用户批准进入 Spec-Driven Development 模式
 */

import { z } from 'zod';
import { createTool } from '../../core/createTool.js';
import type { ToolResult } from '../../types/ToolTypes.js';
import { ToolErrorType, ToolKind } from '../../types/ToolTypes.js';

export const enterSpecModeTool = createTool({
  name: 'EnterSpecMode',
  displayName: 'Enter Spec Mode',
  kind: ToolKind.ReadOnly,

  schema: z.object({
    featureName: z
      .string()
      .min(1)
      .describe('The name of the feature/change (used as directory name)'),
    description: z
      .string()
      .min(1)
      .describe('Brief description of what this feature/change does'),
  }),

  description: {
    short: 'Enter Spec-Driven Development mode for complex features',
    long: `Use this tool to enter Spec mode when you need to implement a complex feature that benefits from structured planning.

## Spec-Driven Development (SDD)

Spec mode provides a structured 4-phase workflow:
1. **Requirements**: Define what the feature needs to do (EARS format)
2. **Design**: Create technical architecture (diagrams, API contracts)
3. **Tasks**: Break down into atomic, executable tasks
4. **Implementation**: Execute tasks systematically

## When to Use Spec Mode

Use EnterSpecMode when ANY of these apply:

1. **Complex Features**: Multi-component features requiring coordination
   - Example: "Add user authentication with OAuth2"
   - Example: "Implement real-time collaboration"

2. **Architectural Changes**: Changes affecting system structure
   - Example: "Migrate to microservices"
   - Example: "Add caching layer"

3. **Large Refactoring**: Significant codebase modifications
   - Example: "Refactor database schema"
   - Example: "Modernize legacy module"

4. **Team Coordination**: Features requiring clear documentation
   - When multiple people will work on the feature
   - When stakeholder approval is needed

## When NOT to Use Spec Mode

- Simple bug fixes
- Small features with clear implementation
- Quick experiments or prototypes
- Research-only tasks (use Task tool with explore agent)

For simpler planning needs, consider using EnterPlanMode instead.

## What Happens in Spec Mode

1. Creates a spec directory at \`.blade/changes/<feature-name>/\`
2. Generates initial proposal.md template
3. Guides you through the 4-phase workflow
4. Provides structured templates for each phase
5. Tracks task completion progress

## Directory Structure Created

\`\`\`
.blade/changes/<feature-name>/
├── proposal.md        # Why this change is needed
├── spec.md            # What the feature does
├── requirements.md    # Detailed requirements (EARS format)
├── design.md          # Technical design
├── tasks.md           # Task breakdown
└── .meta.json         # Metadata and progress
\`\`\`
`,
  },

  async execute(params, context): Promise<ToolResult> {
    const { featureName, description } = params;

    // Validate feature name (must be valid directory name)
    if (!/^[a-zA-Z0-9_-]+$/.test(featureName)) {
      return {
        success: false,
        llmContent:
          'Invalid feature name. Use only letters, numbers, underscores, and hyphens.',
        displayContent: '❌ Invalid feature name',
        error: {
          type: ToolErrorType.VALIDATION_ERROR,
          message: 'Feature name must be alphanumeric with underscores/hyphens only',
        },
      };
    }

    if (context.confirmationHandler) {
      try {
        const response = await context.confirmationHandler.requestConfirmation({
          title: 'Enter Spec Mode',
          message:
            `The assistant requests to enter Spec mode for: **${featureName}**\n\n` +
            `Description: ${description}\n\n` +
            'In Spec mode, the assistant will:\n' +
            '1. Create structured specification documents\n' +
            '2. Guide you through Requirements → Design → Tasks → Implementation\n' +
            '3. Track progress and maintain documentation\n\n' +
            'Do you want to enter Spec mode?',
          details: `Will create: .blade/changes/${featureName}/`,
        });

        if (response.approved) {
          return {
            success: true,
            llmContent:
              `✅ User approved entering Spec mode for "${featureName}".\n\n` +
              'You are now in SPEC MODE. Your workflow:\n\n' +
              '**Phase 1: Requirements** (current)\n' +
              '- Read the proposal.md template\n' +
              '- Define requirements using EARS format\n' +
              '- Use UpdateSpec tool to save requirements.md\n\n' +
              '**Phase 2: Design**\n' +
              '- Create architecture diagrams (Mermaid)\n' +
              '- Define API contracts and data models\n' +
              '- Save to design.md\n\n' +
              '**Phase 3: Tasks**\n' +
              '- Break down into atomic tasks\n' +
              '- Identify dependencies and affected files\n' +
              '- Save to tasks.md\n\n' +
              '**Phase 4: Implementation**\n' +
              '- Execute tasks one by one\n' +
              '- Update task status as you progress\n' +
              '- Call ExitSpecMode when done\n\n' +
              'Start by reading the generated proposal.md and expanding on it.',
            displayContent: `✅ Entering Spec mode: ${featureName}`,
            metadata: {
              approved: true,
              enterSpecMode: true,
              featureName,
              description,
            },
          };
        } else {
          return {
            success: true,
            llmContent:
              '⚠️ User declined to enter Spec mode.\n\n' +
              'Proceed with the task using regular workflow. ' +
              'You can use Plan mode for lighter planning, ' +
              'or implement directly if the task is straightforward.',
            displayContent: '⚠️ Spec mode declined',
            metadata: {
              approved: false,
              enterSpecMode: false,
            },
          };
        }
      } catch (error) {
        return {
          success: false,
          llmContent: `Confirmation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          displayContent: '❌ Confirmation failed',
          error: {
            type: ToolErrorType.EXECUTION_ERROR,
            message: 'Confirmation flow error',
          },
        };
      }
    }

    // Fallback for non-interactive mode
    return {
      success: true,
      llmContent:
        `Spec mode requested for "${featureName}" but no interactive confirmation available.\n\n` +
        'Proceeding with spec creation. Follow the structured workflow:\n' +
        '1. Requirements → 2. Design → 3. Tasks → 4. Implementation',
      displayContent: `Spec mode: ${featureName} (non-interactive)`,
      metadata: {
        approved: null,
        enterSpecMode: true,
        featureName,
        description,
      },
    };
  },
});
