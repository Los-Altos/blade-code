import { Hono } from 'hono';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { createLogger, LogCategory } from '../../logging/Logger.js';
import { Bus } from '../../bus/index.js';
import { NotFoundError, BadRequestError } from '../error.js';
import { SessionService } from '../../services/SessionService.js';

const logger = createLogger(LogCategory.SERVICE);

const CreateSessionSchema = z.object({
  title: z.string().optional(),
  projectPath: z.string().optional(),
});

const SendMessageSchema = z.object({
  content: z.string(),
  attachments: z.array(z.object({
    type: z.enum(['file', 'image', 'url']),
    path: z.string().optional(),
    url: z.string().optional(),
    content: z.string().optional(),
  })).optional(),
});

const UpdateSessionSchema = z.object({
  title: z.string().optional(),
});

interface ActiveSession {
  id: string;
  projectPath: string;
  title: string;
  createdAt: Date;
  abortController?: AbortController;
}

const activeSessions = new Map<string, ActiveSession>();

type Variables = {
  directory: string;
};

export const SessionRoutes = () => {
  const app = new Hono<{ Variables: Variables }>();

  app.get('/', async (c) => {
    try {
      const sessions = await SessionService.listSessions();
      
      const activeSessionsList = Array.from(activeSessions.values()).map((s) => ({
        sessionId: s.id,
        projectPath: s.projectPath,
        title: s.title,
        messageCount: 0,
        firstMessageTime: s.createdAt.toISOString(),
        lastMessageTime: new Date().toISOString(),
        hasErrors: false,
        isActive: true,
      }));

      const allSessions = [
        ...activeSessionsList,
        ...sessions.filter((s) => !activeSessions.has(s.sessionId)),
      ];

      return c.json(allSessions);
    } catch (error) {
      logger.error('[SessionRoutes] Failed to list sessions:', error);
      return c.json([]);
    }
  });

  app.post('/', async (c) => {
    try {
      const body = await c.req.json();
      const parsed = CreateSessionSchema.safeParse(body);
      
      if (!parsed.success) {
        throw new BadRequestError('Invalid request body');
      }

      const { title, projectPath } = parsed.data;
      const sessionId = nanoid(12);
      const directory = projectPath || c.get('directory') || process.cwd();

      const session: ActiveSession = {
        id: sessionId,
        projectPath: directory,
        title: title || `Session ${sessionId.slice(0, 6)}`,
        createdAt: new Date(),
      };

      activeSessions.set(sessionId, session);

      await Bus.publish('session.created', {
        sessionId,
        projectPath: directory,
        title: session.title,
      });

      return c.json({
        sessionId,
        projectPath: directory,
        title: session.title,
        messageCount: 0,
        firstMessageTime: session.createdAt.toISOString(),
        lastMessageTime: session.createdAt.toISOString(),
        hasErrors: false,
      });
    } catch (error) {
      logger.error('[SessionRoutes] Failed to create session:', error);
      throw error;
    }
  });

  app.get('/:sessionId', async (c) => {
    const sessionId = c.req.param('sessionId');

    const activeSession = activeSessions.get(sessionId);
    if (activeSession) {
      return c.json({
        sessionId: activeSession.id,
        projectPath: activeSession.projectPath,
        title: activeSession.title,
        messageCount: 0,
        firstMessageTime: activeSession.createdAt.toISOString(),
        lastMessageTime: new Date().toISOString(),
        hasErrors: false,
        isActive: true,
      });
    }

    try {
      const sessions = await SessionService.listSessions();
      const session = sessions.find((s) => s.sessionId === sessionId);
      
      if (!session) {
        throw new NotFoundError('Session', sessionId);
      }

      return c.json(session);
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      logger.error('[SessionRoutes] Failed to get session:', error);
      throw error;
    }
  });

  app.patch('/:sessionId', async (c) => {
    const sessionId = c.req.param('sessionId');

    try {
      const body = await c.req.json();
      const parsed = UpdateSessionSchema.safeParse(body);

      if (!parsed.success) {
        throw new BadRequestError('Invalid request body');
      }

      const { title } = parsed.data;
      const activeSession = activeSessions.get(sessionId);

      if (activeSession && title) {
        activeSession.title = title;
      }

      await Bus.publish('session.updated', { sessionId, title });

      return c.json({ success: true, title });
    } catch (error) {
      logger.error('[SessionRoutes] Failed to update session:', error);
      throw error;
    }
  });

  app.delete('/:sessionId', async (c) => {
    const sessionId = c.req.param('sessionId');

    const activeSession = activeSessions.get(sessionId);
    if (activeSession) {
      if (activeSession.abortController) {
        activeSession.abortController.abort();
      }
      activeSessions.delete(sessionId);
    }

    await Bus.publish('session.deleted', { sessionId });

    return c.json({ success: true });
  });

  app.get('/:sessionId/message', async (c) => {
    const sessionId = c.req.param('sessionId');

    try {
      const messages = await SessionService.loadSession(sessionId);
      return c.json(messages);
    } catch (error) {
      logger.error('[SessionRoutes] Failed to get messages:', error);
      return c.json([]);
    }
  });

  app.post('/:sessionId/message', async (c) => {
    const sessionId = c.req.param('sessionId');

    try {
      const body = await c.req.json();
      const parsed = SendMessageSchema.safeParse(body);
      
      if (!parsed.success) {
        throw new BadRequestError('Invalid message format');
      }

      const { content } = parsed.data;

      let session = activeSessions.get(sessionId);
      if (!session) {
        const directory = c.get('directory') || process.cwd();
        session = {
          id: sessionId,
          projectPath: directory,
          title: `Session ${sessionId.slice(0, 6)}`,
          createdAt: new Date(),
        };
        activeSessions.set(sessionId, session);
      }

      const messageId = nanoid(12);

      await Bus.publish('message.created', {
        sessionId,
        messageId,
        role: 'user',
        content,
      });

      await Bus.publish('session.status', {
        sessionId,
        status: 'running',
      });

      const abortController = new AbortController();
      session.abortController = abortController;

      setImmediate(async () => {
        try {
          const assistantMessageId = nanoid(12);

          await Bus.publish('message.created', {
            sessionId,
            messageId: assistantMessageId,
            role: 'assistant',
          });

          await Bus.publish('session.status', {
            sessionId,
            status: 'idle',
          });
        } catch (error) {
          logger.error('[SessionRoutes] Agent execution error:', error);
          await Bus.publish('session.status', {
            sessionId,
            status: 'error',
          });
        }
      });

      return c.json({
        messageId,
        role: 'user',
        content,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('[SessionRoutes] Failed to send message:', error);
      throw error;
    }
  });

  app.post('/:sessionId/abort', async (c) => {
    const sessionId = c.req.param('sessionId');

    const session = activeSessions.get(sessionId);
    if (session?.abortController) {
      session.abortController.abort();
      session.abortController = undefined;
    }

    await Bus.publish('session.status', {
      sessionId,
      status: 'idle',
    });

    return c.json({ success: true });
  });

  app.get('/:sessionId/status', async (c) => {
    const sessionId = c.req.param('sessionId');

    const session = activeSessions.get(sessionId);
    const isRunning = session?.abortController !== undefined;

    return c.json({
      sessionId,
      status: isRunning ? 'running' : 'idle',
    });
  });

  return app;
};
