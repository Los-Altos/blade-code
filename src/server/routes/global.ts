import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { createLogger, LogCategory } from '../../logging/Logger.js';
import { Bus, type BusEventPayload } from '../../bus/index.js';
import { getVersion } from '../../utils/packageInfo.js';

const logger = createLogger(LogCategory.SERVICE);

type Variables = {
  directory: string;
};

export const GlobalRoutes = (): Hono<{ Variables: Variables }> => {
  const app = new Hono<{ Variables: Variables }>();

  app.get('/health', (c) => {
    return c.json({
      healthy: true,
      version: getVersion(),
    });
  });

  app.get('/event', async (c) => {
    logger.info('[GlobalRoutes] Global event connection established');

    return streamSSE(c, async (stream) => {
      await stream.writeSSE({
        data: JSON.stringify({
          payload: {
            type: 'server.connected',
            properties: {},
          },
        }),
      });

      const handler = async (event: BusEventPayload) => {
        const directory = c.get('directory') || process.cwd();
        await stream.writeSSE({
          data: JSON.stringify({
            directory,
            payload: event,
          }),
        });
      };

      const unsubscribe = Bus.subscribe(handler);

      const heartbeat = setInterval(() => {
        stream.writeSSE({
          data: JSON.stringify({
            payload: {
              type: 'server.heartbeat',
              properties: {},
            },
          }),
        });
      }, 30000);

      await new Promise<void>((resolve) => {
        stream.onAbort(() => {
          clearInterval(heartbeat);
          unsubscribe();
          resolve();
          logger.info('[GlobalRoutes] Global event connection closed');
        });
      });
    });
  });

  app.get('/info', (c) => {
    return c.json({
      version: getVersion(),
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      cwd: process.cwd(),
    });
  });

  return app;
};
