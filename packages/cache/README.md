# cache

A framework-agnostic key-value cache library that works with IndexedDB, Redis, in-memory, and more

## Features

Supports these cache types:

- In-memory (via `lru-cache`)
- IndexedDB (via `window.indexedDB` - client-side only)
- Redis (via `@upstash/redis` + `superjson` - server-side only)
- Null (no-op)

## Installation

```bash
pnpm add @pizzajsdev/cache
```

## Usage

```ts
import { InMemoryKvCacheService } from '@pizzajsdev/cache/memory'
const cache = new InMemoryKvCacheService()
cache.set('key', 'value', 60)
const value = await cache.get('key')
console.log(value)
```
