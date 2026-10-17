import { useCallback, useEffect, useRef, useState } from "react"
import type {
  StoriesMutationHookOptions,
  StoriesQueryHookOptions,
} from "../modules/story/types"
import { matchesStoriesQueryKeyPrefix } from "../sdk"

type Listener = (prefixKey: readonly unknown[]) => void
const listeners = new Set<Listener>()

export function invalidateStoriesQueries(prefixKey: readonly unknown[]) {
  for (const listener of listeners) {
    listener(prefixKey)
  }
}

export function useStoriesQuery<TData>(
  queryKey: readonly unknown[],
  fetcher: () => Promise<TData>,
  options?: StoriesQueryHookOptions<TData>
) {
  const enabled = options?.enabled ?? true
  const [data, setData] = useState<TData | undefined>(options?.initialData)
  const [isLoading, setIsLoading] = useState<boolean>(enabled && !options?.initialData)
  const [error, setError] = useState<Error | null>(null)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher
  const serializedKey = JSON.stringify(queryKey)

  const refetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetcherRef.current()
      setData(res)
      return res
    } catch (err) {
      const normalized = err instanceof Error ? err : new Error(String(err))
      setError(normalized)
      throw normalized
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    void refetch().catch(() => {})
  }, [enabled, serializedKey, refetch])

  useEffect(() => {
    if (!enabled) return
    const parsedKey = JSON.parse(serializedKey) as readonly unknown[]
    const listener: Listener = (prefixKey) => {
      if (matchesStoriesQueryKeyPrefix(parsedKey, prefixKey)) {
        void refetch().catch(() => {})
      }
    }
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }, [enabled, serializedKey, refetch])

  return {
    data,
    isLoading,
    error,
    refetch,
  }
}

export function useStoriesMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: StoriesMutationHookOptions<TData, TVariables>,
  invalidatePrefix?: readonly unknown[]
) {
  const [data, setData] = useState<TData | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const mutateAsync = useCallback(
    async (variables: TVariables) => {
      setIsPending(true)
      setError(null)
      try {
        const res = await mutationFn(variables)
        setData(res)
        if (invalidatePrefix) {
          invalidateStoriesQueries(invalidatePrefix)
        }
        options?.onSuccess?.(res, variables)
        return res
      } catch (err) {
        const normalized = err instanceof Error ? err : new Error(String(err))
        setError(normalized)
        options?.onError?.(normalized, variables)
        throw normalized
      } finally {
        setIsPending(false)
      }
    },
    [mutationFn, invalidatePrefix, options]
  )

  return {
    data,
    isPending,
    error,
    mutateAsync,
  }
}
