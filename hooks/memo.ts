type Memo<V> = (key: string, build: () => V) => V;

export function memo<V>(limit: number): Memo<V> {
  const cache = new Map<string, V>();
  return (key, build) => {
    if (cache.has(key)) {
      const kept = cache.get(key) as V;
      cache.delete(key);
      cache.set(key, kept);
      return kept;
    }
    const value = build();
    cache.set(key, value);
    if (cache.size > limit) cache.delete(cache.keys().next().value!);
    return value;
  };
}
