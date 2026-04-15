interface CacheEntry<V> {
  value: V
  expiresAt: number
}

export class LRUCache<K, V> {
  private max: number
  private ttl: number
  private map: Map<K, CacheEntry<V>>

  constructor({ max = 500, ttl = 30_000 }: { max?: number; ttl?: number }) {
    this.max = max
    this.ttl = ttl
    this.map = new Map()
  }

  get(key: K): V | undefined {
    const entry = this.map.get(key)
    if (!entry) return undefined

    if (Date.now() > entry.expiresAt) {
      this.map.delete(key)
      return undefined
    }

    // Move to end (most recently used)
    this.map.delete(key)
    this.map.set(key, entry)
    return entry.value
  }

  set(key: K, value: V): void {
    if (this.map.has(key)) {
      this.map.delete(key)
    } else if (this.map.size >= this.max) {
      const oldest = this.map.keys().next().value!
      this.map.delete(oldest)
    }
    this.map.set(key, { value, expiresAt: Date.now() + this.ttl })
  }

  delete(key: K): void {
    this.map.delete(key)
  }

  clear(): void {
    this.map.clear()
  }

  get size(): number {
    return this.map.size
  }
}
