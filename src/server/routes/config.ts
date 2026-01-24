import { Hono } from 'hono';
import { z } from 'zod';
import { createLogger, LogCategory } from '../../logging/Logger.js';
import { Bus } from '../../bus/index.js';
import { BadRequestError } from '../error.js';
import {
  getConfig,
  getAllModels,
  getCurrentModel,
  configActions,
} from '../../store/vanilla.js';

const logger = createLogger(LogCategory.SERVICE);

const UpdateConfigSchema = z.object({
  updates: z.record(z.any()),
  options: z.object({
    scope: z.enum(['local', 'project', 'global']).optional(),
    immediate: z.boolean().optional(),
  }).optional(),
});

export const ConfigRoutes = () => {
  const app = new Hono();

  app.get('/', async (c) => {
    try {
      const config = getConfig();
      return c.json(config || {});
    } catch (error) {
      logger.error('[ConfigRoutes] Failed to get config:', error);
      return c.json({});
    }
  });

  app.get('/models', async (c) => {
    try {
      const models = getAllModels();
      const currentModel = getCurrentModel();
      
      return c.json({
        models,
        current: currentModel,
      });
    } catch (error) {
      logger.error('[ConfigRoutes] Failed to get models:', error);
      return c.json({ models: [], current: null });
    }
  });

  app.put('/', async (c) => {
    try {
      const body = await c.req.json();
      const parsed = UpdateConfigSchema.safeParse(body);
      
      if (!parsed.success) {
        throw new BadRequestError('Invalid config update format. Expected { updates: Record<string, any>, options?: { scope?, immediate? } }');
      }

      const { updates, options } = parsed.data;

      await configActions().updateConfig(updates, options);

      await Bus.publish('config.updated', { key: Object.keys(updates).join(',') });

      return c.json({ success: true, updates });
    } catch (error) {
      logger.error('[ConfigRoutes] Failed to update config:', error);
      throw error;
    }
  });

  app.get('/permissions', async (c) => {
    try {
      const config = getConfig();
      return c.json(config?.permissions || {});
    } catch (error) {
      logger.error('[ConfigRoutes] Failed to get permissions:', error);
      return c.json({});
    }
  });

  return app;
};
