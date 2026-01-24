import { Hono } from 'hono';
import { createLogger, LogCategory } from '../../logging/Logger.js';
import { getAllBuiltinModels } from '../../config/builtinModels.js';
import { getAllModels, getCurrentModel } from '../../store/vanilla.js';

const logger = createLogger(LogCategory.SERVICE);

export const ProviderRoutes = () => {
  const app = new Hono();

  app.get('/', async (c) => {
    try {
      const providers = [
        {
          id: 'anthropic',
          name: 'Anthropic',
          description: 'Claude models from Anthropic',
          requiresApiKey: true,
        },
        {
          id: 'openai',
          name: 'OpenAI',
          description: 'GPT models from OpenAI',
          requiresApiKey: true,
        },
        {
          id: 'google',
          name: 'Google',
          description: 'Gemini models from Google',
          requiresApiKey: true,
        },
        {
          id: 'deepseek',
          name: 'DeepSeek',
          description: 'DeepSeek models',
          requiresApiKey: true,
        },
        {
          id: 'azure',
          name: 'Azure OpenAI',
          description: 'OpenAI models via Azure',
          requiresApiKey: true,
        },
        {
          id: 'openai-compatible',
          name: 'OpenAI Compatible',
          description: 'Any OpenAI-compatible API',
          requiresApiKey: true,
        },
        {
          id: 'copilot',
          name: 'GitHub Copilot',
          description: 'GitHub Copilot (requires authentication)',
          requiresApiKey: false,
        },
      ];

      return c.json(providers);
    } catch (error) {
      logger.error('[ProviderRoutes] Failed to list providers:', error);
      return c.json([]);
    }
  });

  app.get('/:providerId/models', async (c) => {
    const providerId = c.req.param('providerId');

    try {
      const builtinModels = getAllBuiltinModels();
      const models = builtinModels.filter((m) => m.provider === providerId);
      
      return c.json(models.map((m) => ({
        id: m.id,
        name: m.name,
        provider: m.provider,
        maxContextTokens: m.maxContextTokens,
        maxOutputTokens: m.maxOutputTokens,
      })));
    } catch (error) {
      logger.error('[ProviderRoutes] Failed to list models:', error);
      return c.json([]);
    }
  });

  app.get('/models', async (c) => {
    try {
      const configuredModels = getAllModels();
      const currentModel = getCurrentModel();
      const builtinModels = getAllBuiltinModels();

      return c.json({
        configured: configuredModels,
        current: currentModel,
        available: builtinModels.map((m) => ({
          id: m.id,
          name: m.name,
          provider: m.provider,
          maxContextTokens: m.maxContextTokens,
          maxOutputTokens: m.maxOutputTokens,
        })),
      });
    } catch (error) {
      logger.error('[ProviderRoutes] Failed to get models:', error);
      return c.json({ configured: [], current: null, available: [] });
    }
  });

  return app;
};
