import type { Redis } from '@upstash/redis'
import superjson from 'superjson'
import type { KeyValueCacheService } from './types.ts'

type RedisClient = Redis

export class RedisKvCacheService implements KeyValueCacheService {
  readonly #redis: RedisClient

  constructor(redis: RedisClient) {
    this.#redis = redis
  }

  async has(key: string): Promise<boolean> {
    return (await this.get(key)) !== null
  }

  async get<T = string>(key: string): Promise<T | null> {
    return await this.#redis.get(key)
  }

  async hashGet<T = string>(key: string, field: string): Promise<T | null> {
    return await this.#redis.hget(key, field)
  }

  async getObject<T = any>(key: string): Promise<T | null> {
    let value = (await this.get(key)) as any
    if (typeof value === 'string') {
      return superjson.parse(value) as T
    }

    if (value !== null && typeof value === 'object' && value?.json) {
      return superjson.deserialize(value) as T
    }
    return value
  }

  async set<T = string>(key: string, value: T, expirationSeconds: number): Promise<void> {
    await this.#redis.set(key, value, expirationSeconds > 0 ? { ex: expirationSeconds } : undefined)
  }

  async setObject(key: string, value: any, expirationSeconds: number): Promise<void> {
    return await this.set(key, superjson.stringify(value), expirationSeconds)
  }

  async hashSet(key: string, field: string, value: string | undefined): Promise<void> {
    await this.#redis.hset(key, { [field]: value })
  }

  async delete(...keys: string[]): Promise<number> {
    return await this.#redis.del(...keys)
  }

  async hashDeleteFields(key: string, ...fields: string[]): Promise<void> {
    await this.#redis.hdel(key, ...fields)
  }

  async keys(pattern: string = '*'): Promise<string[]> {
    return await this.#redis.keys(pattern)
  }

  async size(): Promise<number> {
    return await this.#redis.dbsize()
  }
}
