import type { GenericKvCacheEntry, KeyValueCacheService } from './types.ts'

interface HashEntry {
  key: string
  field: string
  value: any
}

export class IndexedDBKvCacheService implements KeyValueCacheService {
  readonly #dbName: string
  readonly #storeName: string
  readonly #hashStoreName: string

  #db: IDBDatabase | null = null
  #dbInitPromise: Promise<void> | null = null

  constructor(dbName: string, storeName: string, hashStoreName: string) {
    this.#dbName = dbName
    this.#storeName = storeName
    this.#hashStoreName = hashStoreName
    this.#db = null
    this.#dbInitPromise = null
  }

  async #initDb(): Promise<void> {
    if (this.#db) return

    if (this.#dbInitPromise) {
      return this.#dbInitPromise
    }

    this.#dbInitPromise = new Promise((resolve, reject) => {
      let request = indexedDB.open(this.#dbName, 1)

      request.onerror = () => reject(request.error)

      request.onupgradeneeded = (event) => {
        let db = (event.target as IDBOpenDBRequest).result

        // Create store for regular key-value pairs
        if (!db.objectStoreNames.contains(this.#storeName)) {
          db.createObjectStore(this.#storeName, { keyPath: 'key' })
        }

        // Create store for hash fields
        if (!db.objectStoreNames.contains(this.#hashStoreName)) {
          let hashStore = db.createObjectStore(this.#hashStoreName, { keyPath: ['key', 'field'] })
          hashStore.createIndex('key_index', 'key')
        }
      }

      request.onsuccess = () => {
        this.#db = request.result
        resolve()
      }
    })

    return this.#dbInitPromise
  }

  #getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): IDBObjectStore {
    if (!this.#db) throw new Error('Database not initialized')
    let transaction = this.#db.transaction(storeName, mode)
    return transaction.objectStore(storeName)
  }

  async has(key: string): Promise<boolean> {
    await this.#initDb()
    return new Promise((resolve, reject) => {
      let store = this.#getStore(this.#storeName)
      let request = store.get(key)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        let entry = request.result as GenericKvCacheEntry | undefined
        if (!entry) {
          resolve(false)
          return
        }

        if (entry.expiresAt && entry.expiresAt < Date.now()) {
          resolve(false)
          return
        }

        resolve(true)
      }
    })
  }

  async get<T = any>(key: string): Promise<T | null> {
    await this.#initDb()
    return new Promise((resolve, reject) => {
      let store = this.#getStore(this.#storeName)
      let request = store.get(key)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        let entry = request.result as GenericKvCacheEntry | undefined
        if (!entry) {
          resolve(null)
          return
        }

        if (entry.expiresAt && entry.expiresAt < Date.now()) {
          resolve(null)
          return
        }

        resolve(entry.value)
      }
    })
  }

  async hashGet<T = string>(key: string, field: string): Promise<T | null> {
    await this.#initDb()
    return new Promise((resolve, reject) => {
      let store = this.#getStore(this.#hashStoreName)
      let request = store.get([key, field])

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        let entry = request.result as HashEntry | undefined
        resolve(entry?.value ?? null)
      }
    })
  }

  async getObject<T = any>(key: string): Promise<T | null> {
    let value = await this.get<T>(key)
    if (!value) return null
    try {
      return value
    } catch {
      return null
    }
  }

  async set<T = any>(key: string, value: T, expirationSeconds: number): Promise<void> {
    await this.#initDb()
    return new Promise((resolve, reject) => {
      let store = this.#getStore(this.#storeName, 'readwrite')
      let expiresAt = expirationSeconds > 0 ? Date.now() + expirationSeconds * 1000 : null
      let request = store.put({ key, value, expiresAt } satisfies GenericKvCacheEntry & { key: string })

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async setObject<T = any>(key: string, value: T, expirationSeconds: number): Promise<void> {
    return this.set(key, value, expirationSeconds)
  }

  async hashSet(key: string, field: string, value: string | undefined): Promise<void> {
    await this.#initDb()
    return new Promise((resolve, reject) => {
      let store = this.#getStore(this.#hashStoreName, 'readwrite')

      if (value === undefined) {
        let request = store.delete([key, field])
        request.onerror = () => reject(request.error)
        request.onsuccess = () => resolve()
      } else {
        let request = store.put({ key, field, value } satisfies HashEntry)
        request.onerror = () => reject(request.error)
        request.onsuccess = () => resolve()
      }
    })
  }

  async delete(...keys: string[]): Promise<number> {
    await this.#initDb()
    return new Promise((resolve, reject) => {
      let store = this.#getStore(this.#storeName, 'readwrite')
      let deletedCount = 0
      let completedCount = 0

      let checkCompletion = () => {
        if (completedCount === keys.length) {
          resolve(deletedCount)
        }
      }

      keys.forEach((key) => {
        let request = store.delete(key)
        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
          deletedCount++
          completedCount++
          checkCompletion()
        }
      })

      // Handle empty keys array
      if (keys.length === 0) {
        resolve(0)
      }
    })
  }

  async keys(): Promise<string[]> {
    await this.#initDb()
    return new Promise((resolve, reject) => {
      let store = this.#getStore(this.#storeName)
      let request = store.getAll()
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result.map((entry) => entry.key))
    })
  }

  async size(): Promise<number> {
    await this.#initDb()
    return new Promise((resolve, reject) => {
      let store = this.#getStore(this.#storeName)
      let request = store.count()
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
    })
  }
}
