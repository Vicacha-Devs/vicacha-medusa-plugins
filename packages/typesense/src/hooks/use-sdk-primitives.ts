import { useCallback, useEffect, useRef, useState } from "react"

import {
  invalidateTypesenseQueries,
  matchesTypesenseQueryKeyPrefix,
  subscribeTypesenseQueryInvalidation,
  typesenseQueryKeys,
} from "../sdk/query-keys"
import type {
  TypesenseMutationHookOptions,
  TypesenseQueryHookOptions,
  UseTypesenseMutationResult,
  UseTypesenseQueryResult,
} from "../types"

export function useTypesenseQuery<TData>(
  queryKey: readonly unknown[],
  queryFn: () => Promise<TData>,
  options?: TypesenseQueryHookOptions<TData>
): UseTypesenseQueryResult<TData> {
  const enabled = options?.enabled ?? true
  const [data, setData] = useState<TData | undefined>(undefined)
  const [isLoading, setIsLoading] = useState<boolean>(enabled)
  const [isFetching, setIsFetching] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)

  const queryFnRef = useRef(queryFn)
  queryFnRef.current = queryFn

  const optionsRef = useRef(options)
  optionsRef.current = options

  const serializedKey = JSON.stringify(queryKey)
  const keyRef = useRef(queryKey)
  keyRef.current = queryKey

  const execute = useCallback(async (): Promise<TData | undefined> => {
    setIsFetching(true)
    setError(null)
    try {
      const result = await queryFnRef.current()
      setData(result)
      optionsRef.current?.onSuccess?.(result)
      return result
    } catch (err) {
      const normalized =
        err instanceof Error ? err : new Error(String(err || "Unknown error"))
      setError(normalized)
      optionsRef.current?.onError?.(normalized)
      return undefined
    } finally {
      setIsLoading(false)
      setIsFetching(false)
    }
  }, [])

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    void execute()
  }, [enabled, serializedKey, execute])

  useEffect(() => {
    if (!enabled) return
    return subscribeTypesenseQueryInvalidation((invalidatedPrefix) => {
      if (matchesTypesenseQueryKeyPrefix(keyRef.current, invalidatedPrefix)) {
        void execute()
      }
    })
  }, [enabled, execute])

  return {
    data,
    isLoading,
    isFetching,
    error,
    refetch: execute,
  }
}

export function useTypesenseMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: TypesenseMutationHookOptions<TData, TVariables>,
  defaultInvalidateKey: readonly unknown[] = typesenseQueryKeys.all
): UseTypesenseMutationResult<TData, TVariables> {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [data, setData] = useState<TData | undefined>(undefined)

  const mutationFnRef = useRef(mutationFn)
  mutationFnRef.current = mutationFn

  const optionsRef = useRef(options)
  optionsRef.current = options

  const mutateAsync = useCallback(
    async (variables: TVariables): Promise<TData> => {
      setIsPending(true)
      setError(null)
      try {
        const result = await mutationFnRef.current(variables)
        setData(result)
        const targetKey = optionsRef.current?.queryKey ?? defaultInvalidateKey
        invalidateTypesenseQueries(targetKey)
        optionsRef.current?.onSuccess?.(result, variables)
        return result
      } catch (err) {
        const normalized =
          err instanceof Error ? err : new Error(String(err || "Unknown error"))
        setError(normalized)
        optionsRef.current?.onError?.(normalized, variables)
        throw normalized
      } finally {
        setIsPending(false)
      }
    },
    [defaultInvalidateKey]
  )

  const mutate = useCallback(
    (
      variables: TVariables,
      callOptions?: {
        onSuccess?: (data: TData, variables: TVariables) => void
        onError?: (error: Error, variables: TVariables) => void
      }
    ) => {
      mutateAsync(variables)
        .then((res) => {
          callOptions?.onSuccess?.(res, variables)
        })
        .catch((err: Error) => {
          callOptions?.onError?.(err, variables)
        })
    },
    [mutateAsync]
  )

  const reset = useCallback(() => {
    setError(null)
    setData(undefined)
    setIsPending(false)
  }, [])

  return {
    mutate,
    mutateAsync,
    isPending,
    error,
    data,
    reset,
  }
}
