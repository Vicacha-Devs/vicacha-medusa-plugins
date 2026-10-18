export type AnyService = Record<
  string,
  (...args: unknown[]) => Promise<unknown>
>;

export function tryResolveService(
  container: { resolve: (key: string) => unknown },
  keys: string[],
): AnyService | null {
  for (const key of keys) {
    try {
      const resolved = container.resolve(key);
      if (resolved && typeof resolved === "object") {
        return resolved as AnyService;
      }
    } catch {
      // try next
    }
  }
  return null;
}
