type SingleFlight = <V>(key: string, start: () => Promise<V>) => Promise<V>;

export function singleFlight(): SingleFlight {
  const pending = new Map<string, Promise<unknown>>();
  return <V>(key: string, start: () => Promise<V>): Promise<V> => {
    const running = pending.get(key);
    if (running) return running as Promise<V>;
    const started = start().finally(() => pending.delete(key));
    pending.set(key, started);
    return started;
  };
}
