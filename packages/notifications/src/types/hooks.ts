import type { NotificationsApiClient } from "../sdk/client"

export interface NotificationsQueryHookOptions<TData = unknown> {
  client?: NotificationsApiClient
  queryKey?: readonly unknown[]
  enabled?: boolean
  onSuccess?: (data: TData) => void
  onError?: (error: Error) => void
}

export interface NotificationsMutationHookOptions<
  TData = unknown,
  TVariables = unknown,
> {
  client?: NotificationsApiClient
  queryKey?: readonly unknown[]
  onSuccess?: (data: TData, variables: TVariables) => void
  onError?: (error: Error, variables: TVariables) => void
}

export interface UseNotificationsQueryResult<TData> {
  data: TData | undefined
  isLoading: boolean
  isFetching: boolean
  error: Error | null
  refetch: () => Promise<TData | undefined>
}

export interface UseNotificationsMutationResult<TData, TVariables> {
  mutate: (
    variables: TVariables,
    callOptions?: {
      onSuccess?: (data: TData, variables: TVariables) => void
      onError?: (error: Error, variables: TVariables) => void
    }
  ) => void
  mutateAsync: (variables: TVariables) => Promise<TData>
  isPending: boolean
  error: Error | null
  data: TData | undefined
  reset: () => void
}

export interface UseOrderNotificationsWidgetStateProps {
  order?: Record<string, any>
  client?: NotificationsApiClient
  t?: (key: string, options?: Record<string, any>) => string
}
