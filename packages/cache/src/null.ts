import type { KeyValueCacheService } from './types.ts'

export class NullKvCacheService implements KeyValueCacheService {
  async has(): Promise<boolean> {
    return false
  }

  async get<T = string>(): Promise<T | null> {
    return null
  }

  async hashGet<T = string>(): Promise<T | null> {
    return null
  }

  async getObject(): Promise<any | null> {
    return null
  }

  async set(): Promise<void> {
    return
  }

  async setObject(): Promise<void> {
    return
  }

  async hashSet(): Promise<void> {
    return
  }

  async delete(): Promise<number> {
    return 0
  }

  async keys(): Promise<string[]> {
    return []
  }

  async size(): Promise<number> {
    return 0
  }
}
