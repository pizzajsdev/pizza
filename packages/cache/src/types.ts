export interface KeyValueCacheService {
  has(key: string): Promise<boolean>
  get<T = string>(key: string): Promise<T | null>
  /**
   * Returns the value of the field in the hash map.
   */
  hashGet<T = string>(key: string, field: string): Promise<T | null>
  getObject<T = any>(key: string): Promise<T | null>
  set<T = string>(key: string, value: T, expirationSeconds: number): Promise<void>
  setObject(key: string, value: any, expirationSeconds: number): Promise<void>
  /**
   * Sets the value of the field in the hash map.
   */
  hashSet(key: string, field: string, value: any): Promise<void>
  delete(...keys: string[]): Promise<number>
  keys(pattern?: string): Promise<string[]>
  size(pattern?: string): Promise<number>
}

export type GenericKvCacheEntry = {
  value: any
  expiresAt: number | null
}
