import Redis from 'redis';
import type { RedisClientOptions } from 'redis';

/**
 * Redis Store custom implementation
 * Tích hợp Redis với cache-manager của NestJS
 */
export const createRedisStore = async (
  options: RedisClientOptions,
): Promise<any> => {
  const client = await Redis.createClient(options).connect();

  return {
    get: async (key: string) => {
      return await client.get(key);
    },
    set: async (key: string, value: any, ttl?: number) => {
      if (ttl) {
        await client.setEx(key, ttl, typeof value === 'string' ? value : JSON.stringify(value));
      } else {
        await client.set(key, typeof value === 'string' ? value : JSON.stringify(value));
      }
    },
    del: async (key: string) => {
      await client.del(key);
    },
    reset: async () => {
      await client.flushDb();
    },
  } as any;
};
