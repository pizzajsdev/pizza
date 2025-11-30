import { LRUCache } from 'lru-cache'
import type { GenericKvCacheEntry, KeyValueCacheService } from './types.ts'

export class InMemoryKvCacheService implements KeyValueCacheService {
  readonly #cache: LRUCache<string, GenericKvCacheEntry>

  constructor(options: { maxSize?: number; ttl?: number } = {}) {
    this.#cache = new LRUCache({
      max: options.maxSize ?? 1000,
      ttl: options.ttl ?? 1000 * 60 * 60 * 4, // 4 hours
    })
  }

  async has(key: string): Promise<boolean> {
    return this.#cache.has(key)
  }

  #getCacheEntry(key: string): any | null {
    let entry = this.#cache.get(key)
    if (!entry) return null
    if (entry.expiresAt === null || entry.expiresAt <= 0) return entry
    if (entry.expiresAt < Date.now()) {
      this.#cache.delete(key)
      return null
    }
    return entry.value ?? null
  }

  #setCacheEntry(key: string, value: any, expirationSeconds: number): void {
    let expiresAt = expirationSeconds > 0 ? Date.now() + expirationSeconds * 1000 : null
    this.#cache.set(key, { value, expiresAt })
  }

  async get<T = any>(key: string): Promise<T | null> {
    let entry = this.#getCacheEntry(key)
    return entry
  }

  async hashGet<T = any>(key: string, field: string): Promise<T | null> {
    let entry = this.#getCacheEntry(key)
    if (!entry) return null
    return entry[field] ?? null
  }

  async getObject<T = any>(key: string): Promise<T | null> {
    return this.#getCacheEntry(key) as T
  }

  async set<T = any>(key: string, value: T, expirationSeconds: number): Promise<void> {
    this.#setCacheEntry(key, value, expirationSeconds)
  }

  async setObject(key: string, value: any, expirationSeconds: number): Promise<void> {
    this.#setCacheEntry(key, value, expirationSeconds)
  }

  async hashSet(key: string, field: string, value: string | undefined): Promise<void> {
    let entry = this.#getCacheEntry(key)
    if (!entry) {
      this.#setCacheEntry(key, { [field]: value }, -1)
      return
    }
    entry[field] = value
    this.#setCacheEntry(key, entry, -1) // no expiration
  }

  async delete(...keys: string[]): Promise<number> {
    let deleted = 0
    for (let key of keys) {
      this.#cache.delete(key)
      deleted++
    }
    return deleted
  }

  async keys(): Promise<string[]> {
    return [...this.#cache.keys()]
  }

  async size(): Promise<number> {
    return this.#cache.size
  }
}
