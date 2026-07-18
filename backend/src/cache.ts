// Tiny in-memory TTL cache. Memoizes marketplace offer lookups so repeated
// checks on the same product (and the free /preview probe hitting the same
// item) don't re-issue a paid Apify run. Single-process app -> a plain Map is
// enough. Copied from the WalletLens (txwrap) pattern.
export class TtlCache<V> {
  private store = new Map<string, { value: V; expiresAt: number }>();

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries = 5000
  ) {}

  get(key: string): V | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() >= entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: V): void {
    this.store.delete(key);
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
    if (this.store.size > this.maxEntries) {
      for (const key of this.store.keys()) {
        this.store.delete(key);
        if (this.store.size <= this.maxEntries) break;
      }
    }
  }

  get size(): number {
    return this.store.size;
  }
}
