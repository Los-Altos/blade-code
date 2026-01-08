/**
 * Blade Code Plugins System - Zod Validation Schemas
 *
 * This module provides Zod schemas for validating plugin configurations.
 */

import { z } from 'zod';

/**
 * Plugin name validation
 * - Must be lowercase letters, numbers, and hyphens only
 * - Must start and end with alphanumeric character
 * - Length: 2-64 characters
 */
export const pluginNameSchema = z
  .string()
  .min(2, 'Plugin name must be at least 2 characters')
  .max(64, 'Plugin name must be at most 64 characters')
  .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]{1,2}$/, {
    message:
      'Plugin name must be lowercase letters, numbers, and hyphens only, starting and ending with alphanumeric',
  });

/**
 * Semantic version validation (e.g., "1.0.0", "1.0.0-beta.1")
 */
export const semverSchema = z.string().regex(/^\d+\.\d+\.\d+(-[\w.]+)?(\+[\w.]+)?$/, {
  message: 'Version must be a valid semantic version (e.g., 1.0.0)',
});

/**
 * Plugin author schema
 */
export const pluginAuthorSchema = z.object({
  name: z.string().min(1, 'Author name is required'),
  email: z.string().email().optional(),
  url: z.string().url().optional(),
});

/**
 * Plugin manifest schema (plugin.json)
 */
export const pluginManifestSchema = z.object({
  name: pluginNameSchema,
  description: z
    .string()
    .min(1, 'Description is required')
    .max(500, 'Description must be at most 500 characters'),
  version: semverSchema,
  author: pluginAuthorSchema.optional(),
  license: z.string().optional(),
  repository: z.string().url().optional(),
  homepage: z.string().url().optional(),
  keywords: z.array(z.string()).optional(),
  dependencies: z.record(z.string()).optional(),
  bladeVersion: z.string().optional(),
});

/**
 * MCP server config schema (for .mcp.json)
 */
export const mcpServerConfigSchema = z.object({
  type: z.enum(['stdio', 'sse', 'http']),
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
  url: z.string().url().optional(),
  headers: z.record(z.string()).optional(),
  timeout: z.number().positive().optional(),
  oauth: z
    .object({
      enabled: z.boolean().optional(),
      clientId: z.string().optional(),
      clientSecret: z.string().optional(),
      authorizationUrl: z.string().url().optional(),
      tokenUrl: z.string().url().optional(),
      scopes: z.array(z.string()).optional(),
      redirectUri: z.string().url().optional(),
    })
    .optional(),
  healthCheck: z
    .object({
      enabled: z.boolean().optional(),
      interval: z.number().positive().optional(),
      timeout: z.number().positive().optional(),
      failureThreshold: z.number().positive().optional(),
    })
    .optional(),
});

/**
 * MCP config file schema (.mcp.json)
 * Supports both { serverName: config } and { mcpServers: { serverName: config } }
 */
export const mcpConfigFileSchema = z.union([
  z.object({
    mcpServers: z.record(mcpServerConfigSchema),
  }),
  z.record(mcpServerConfigSchema),
]);

/**
 * Plugins config schema (for settings.json)
 */
export const pluginsConfigSchema = z.object({
  enabled: z.array(z.string()).optional(),
  disabled: z.array(z.string()).optional(),
  dirs: z.array(z.string()).optional(),
});

/**
 * Type exports from schemas
 */
export type PluginManifestInput = z.input<typeof pluginManifestSchema>;
export type PluginManifestOutput = z.output<typeof pluginManifestSchema>;
export type McpServerConfigInput = z.input<typeof mcpServerConfigSchema>;
export type McpConfigFileInput = z.input<typeof mcpConfigFileSchema>;
export type PluginsConfigInput = z.input<typeof pluginsConfigSchema>;

/**
 * Validate plugin manifest
 */
export function validatePluginManifest(
  data: unknown
): z.SafeParseReturnType<PluginManifestInput, PluginManifestOutput> {
  return pluginManifestSchema.safeParse(data);
}

/**
 * Validate MCP config file
 */
export function validateMcpConfig(
  data: unknown
): z.SafeParseReturnType<McpConfigFileInput, McpConfigFileInput> {
  return mcpConfigFileSchema.safeParse(data);
}

/**
 * Validate plugins config from settings
 */
export function validatePluginsConfig(
  data: unknown
): z.SafeParseReturnType<PluginsConfigInput, PluginsConfigInput> {
  return pluginsConfigSchema.safeParse(data);
}
