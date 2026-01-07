# CLAUDE.md

always respond in Chinese

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Blade Code is a modern AI-powered CLI coding assistant built with React + Ink and TypeScript.

## Quick Commands

```bash
pnpm run dev          # Development mode with hot reload
pnpm run build        # Build the CLI
pnpm run test:all     # Run all tests
pnpm run lint         # Run linter
pnpm run type-check   # TypeScript type checking
pnpm run check:full   # Full check (type, lint, format, test)
```

## Architecture

```
src/
├── agent/              # Stateless Agent core
├── tools/              # Tool system (builtin, execution, registry)
├── mcp/                # MCP protocol support
├── context/            # Context management
├── config/             # Configuration management
├── ui/                 # UI components (React + Ink)
├── store/              # State management (Zustand)
├── services/           # Service layer
├── cli/                # CLI configuration
├── commands/           # Command handlers
├── prompts/            # Prompt templates
├── slash-commands/     # Slash commands
└── blade.tsx           # Entry point
```

## Key Design Principles

1. **Stateless Agent**: Agent doesn't store session state; all state passed via context
2. **Tool System**: Unified tool registration, execution, and validation with Zod schemas
3. **Permission Control**: Three-level permission system (allow/ask/deny)
4. **Session Management**: Multi-session support with resume and fork capabilities

## Code Style

- TypeScript strict mode
- Biome for linting and formatting (single quotes, semicolons, 88 char line width)
- Avoid `any` type
- Use Zod schemas for tool parameters

## Testing

- Test framework: Vitest
- Tests location: `tests/`
- Run tests: `pnpm run test:all`

## Documentation

- User docs: `docs/public/`
- Developer docs: `docs/development/`
- Contributing docs: `docs/contributing/`

## More Information

- [README.md](README.md) - Project overview
- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guide
- [BLADE.md](BLADE.md) - Detailed project context (Chinese)
