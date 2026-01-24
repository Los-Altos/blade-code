import { createLogger, LogCategory } from '../logging/Logger.js';
import type { BusEventPayload, EventProperties, EventType } from './events.js';

const logger = createLogger(LogCategory.SERVICE);

type EventHandler = (event: BusEventPayload) => void | Promise<void>;

class EventBus {
  private handlers: Set<EventHandler> = new Set();
  private typeHandlers: Map<EventType, Set<EventHandler>> = new Map();

  subscribe(handler: EventHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  subscribeType<T extends EventType>(
    type: T,
    handler: (event: { type: T; properties: EventProperties<T> }) => void | Promise<void>
  ): () => void {
    if (!this.typeHandlers.has(type)) {
      this.typeHandlers.set(type, new Set());
    }
    const handlers = this.typeHandlers.get(type)!;
    handlers.add(handler as EventHandler);
    return () => {
      handlers.delete(handler as EventHandler);
    };
  }

  async publish<T extends EventType>(
    type: T,
    properties: EventProperties<T>
  ): Promise<void> {
    const event = { type, properties } as BusEventPayload;
    
    logger.debug(`[Bus] Publishing event: ${type}`, properties);

    const promises: Promise<void>[] = [];

    for (const handler of this.handlers) {
      try {
        const result = handler(event);
        if (result instanceof Promise) {
          promises.push(result.catch((err) => {
            logger.error(`[Bus] Handler error for ${type}:`, err);
          }));
        }
      } catch (err) {
        logger.error(`[Bus] Sync handler error for ${type}:`, err);
      }
    }

    const typeHandlers = this.typeHandlers.get(type);
    if (typeHandlers) {
      for (const handler of typeHandlers) {
        try {
          const result = handler(event);
          if (result instanceof Promise) {
            promises.push(result.catch((err) => {
              logger.error(`[Bus] Type handler error for ${type}:`, err);
            }));
          }
        } catch (err) {
          logger.error(`[Bus] Sync type handler error for ${type}:`, err);
        }
      }
    }

    if (promises.length > 0) {
      await Promise.all(promises);
    }
  }

  clear(): void {
    this.handlers.clear();
    this.typeHandlers.clear();
  }
}

export const Bus = new EventBus();

export * from './events.js';
