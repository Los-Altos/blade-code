import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { Bus } from '../../bus/index.js';
import { createLogger, LogCategory } from '../../logging/Logger.js';
import { BadRequestError, NotFoundError } from '../error.js';

const logger = createLogger(LogCategory.SERVICE);

interface PendingPermission {
  id: string;
  sessionId: string;
  toolName: string;
  description: string;
  args?: Record<string, unknown>;
  createdAt: Date;
  resolve: (approved: boolean, remember?: boolean) => void;
}

const pendingPermissions = new Map<string, PendingPermission>();

const PermissionResponseSchema = z.object({
  approved: z.boolean(),
  remember: z.boolean().optional(),
});

const CreatePermissionSchema = z.object({
  sessionId: z.string(),
  toolName: z.string(),
  description: z.string(),
  args: z.record(z.any()).optional(),
});

export const PermissionRoutes = () => {
  const app = new Hono();

  app.get('/', async (c) => {
    const permissions = Array.from(pendingPermissions.values()).map((p) => ({
      id: p.id,
      sessionId: p.sessionId,
      toolName: p.toolName,
      description: p.description,
      args: p.args,
      createdAt: p.createdAt.toISOString(),
    }));

    return c.json(permissions);
  });

  app.post('/', async (c) => {
    try {
      const body = await c.req.json();
      const parsed = CreatePermissionSchema.safeParse(body);

      if (!parsed.success) {
        throw new BadRequestError('Invalid permission request format. Expected { sessionId, toolName, description, args? }');
      }

      const { sessionId, toolName, description, args } = parsed.data;
      const id = nanoid(12);

      const permission: PendingPermission = {
        id,
        sessionId,
        toolName,
        description,
        args,
        createdAt: new Date(),
        resolve: () => {
          // Will be called when permission is responded to
        },
      };

      pendingPermissions.set(id, permission);

      await Bus.publish('permission.asked', {
        requestId: id,
        sessionId,
        toolName,
        description,
        args,
      });

      logger.info(`[PermissionRoutes] Permission request created: ${id} for ${toolName}`);

      return c.json({
        id,
        sessionId,
        toolName,
        description,
        args,
        createdAt: permission.createdAt.toISOString(),
      }, 201);
    } catch (error) {
      logger.error('[PermissionRoutes] Failed to create permission request:', error);
      throw error;
    }
  });

  app.get('/:permissionId', async (c) => {
    const permissionId = c.req.param('permissionId');
    const permission = pendingPermissions.get(permissionId);

    if (!permission) {
      throw new NotFoundError('Permission request', permissionId);
    }

    return c.json({
      id: permission.id,
      sessionId: permission.sessionId,
      toolName: permission.toolName,
      description: permission.description,
      args: permission.args,
      createdAt: permission.createdAt.toISOString(),
    });
  });

  app.post('/:permissionId', async (c) => {
    const permissionId = c.req.param('permissionId');
    const permission = pendingPermissions.get(permissionId);

    if (!permission) {
      throw new NotFoundError('Permission request', permissionId);
    }

    try {
      const body = await c.req.json();
      const parsed = PermissionResponseSchema.safeParse(body);

      if (!parsed.success) {
        throw new BadRequestError('Invalid permission response format');
      }

      const { approved, remember } = parsed.data;

      permission.resolve(approved, remember);
      pendingPermissions.delete(permissionId);

      await Bus.publish('permission.replied', {
        requestId: permissionId,
        approved,
        remember,
      });

      logger.info(`[PermissionRoutes] Permission ${permissionId} ${approved ? 'approved' : 'denied'}`);

      return c.json({ success: true, approved, remember });
    } catch (error) {
      logger.error('[PermissionRoutes] Failed to respond to permission:', error);
      throw error;
    }
  });

  app.delete('/:permissionId', async (c) => {
    const permissionId = c.req.param('permissionId');
    const permission = pendingPermissions.get(permissionId);

    if (!permission) {
      throw new NotFoundError('Permission request', permissionId);
    }

    permission.resolve(false);
    pendingPermissions.delete(permissionId);

    await Bus.publish('permission.replied', {
      requestId: permissionId,
      approved: false,
    });

    logger.info(`[PermissionRoutes] Permission ${permissionId} cancelled`);

    return c.json({ success: true });
  });

  return app;
};

export async function requestPermission(
  sessionId: string,
  toolName: string,
  description: string,
  args?: Record<string, unknown>
): Promise<{ approved: boolean; remember?: boolean }> {
  const id = nanoid(12);

  const resultPromise = new Promise<{ approved: boolean; remember?: boolean }>((resolve) => {
    const permission: PendingPermission = {
      id,
      sessionId,
      toolName,
      description,
      args,
      createdAt: new Date(),
      resolve: (approved, remember) => {
        resolve({ approved, remember });
      },
    };

    pendingPermissions.set(id, permission);
  });

  try {
    await Bus.publish('permission.asked', {
      requestId: id,
      sessionId,
      toolName,
      description,
      args,
    });
  } catch (err) {
    logger.error(`[PermissionRoutes] Failed to publish permission.asked event:`, err);
  }

  logger.info(`[PermissionRoutes] Permission request created: ${id} for ${toolName}`);

  return resultPromise;
}

export function cancelPendingPermissions(sessionId: string): void {
  for (const [id, permission] of pendingPermissions) {
    if (permission.sessionId === sessionId) {
      permission.resolve(false);
      pendingPermissions.delete(id);
      logger.info(`[PermissionRoutes] Permission ${id} cancelled (session ${sessionId} cleanup)`);
    }
  }
}
