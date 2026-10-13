import type {
  ClearMpnSandboxResponse,
  CreateMpnBroadcastPayload,
  CreateMpnBroadcastResponse,
  ListMpnBroadcastsResponse,
  ListMpnLogsParams,
  ListMpnLogsResponse,
  ListMpnSandboxParams,
  ListMpnSandboxResponse,
  NotificationsMutationHookOptions,
  NotificationsQueryHookOptions,
  SendMpnNotificationPayload,
  SendMpnNotificationResponse,
  StoreUpdateConsentPayload,
  StoreUpdateConsentResponse,
} from "../types"
import { notificationsAdminSdk, notificationsStoreSdk } from "../sdk/client"
import { notificationsQueryKeys } from "../sdk/query-keys"
import {
  useNotificationsMutation,
  useNotificationsQuery,
} from "./use-sdk-primitives"

export function useMpnLogs(
  params?: ListMpnLogsParams,
  options?: NotificationsQueryHookOptions<ListMpnLogsResponse>
) {
  const client = options?.client ?? notificationsAdminSdk
  const queryKey =
    options?.queryKey ??
    notificationsQueryKeys.logs(params as Record<string, unknown> | undefined)

  return useNotificationsQuery<ListMpnLogsResponse>(
    queryKey,
    () => client.listLogs(params),
    options
  )
}

export function useMpnOrderLogs(
  orderId: string | undefined,
  options?: NotificationsQueryHookOptions<ListMpnLogsResponse>
) {
  const client = options?.client ?? notificationsAdminSdk
  const queryKey =
    options?.queryKey ?? notificationsQueryKeys.orderLogs(orderId || "")

  return useNotificationsQuery<ListMpnLogsResponse>(
    queryKey,
    () => client.listLogs({ entity_id: orderId!, limit: 15 }),
    {
      ...options,
      enabled: Boolean(orderId) && (options?.enabled ?? true),
    }
  )
}

export function useMpnBroadcasts(
  options?: NotificationsQueryHookOptions<ListMpnBroadcastsResponse>
) {
  const client = options?.client ?? notificationsAdminSdk
  const queryKey = options?.queryKey ?? notificationsQueryKeys.broadcasts()

  return useNotificationsQuery<ListMpnBroadcastsResponse>(
    queryKey,
    () => client.listBroadcasts(),
    options
  )
}

export function useCreateMpnBroadcast(
  options?: NotificationsMutationHookOptions<
    CreateMpnBroadcastResponse,
    CreateMpnBroadcastPayload
  >
) {
  const client = options?.client ?? notificationsAdminSdk
  return useNotificationsMutation<
    CreateMpnBroadcastResponse,
    CreateMpnBroadcastPayload
  >(
    (payload) => client.createBroadcast(payload),
    options,
    notificationsQueryKeys.broadcasts()
  )
}

export function useMpnSandboxMessages(
  params?: ListMpnSandboxParams,
  options?: NotificationsQueryHookOptions<ListMpnSandboxResponse>
) {
  const client = options?.client ?? notificationsAdminSdk
  const queryKey =
    options?.queryKey ??
    notificationsQueryKeys.sandbox(params as Record<string, unknown> | undefined)

  return useNotificationsQuery<ListMpnSandboxResponse>(
    queryKey,
    () => client.listSandboxMessages(params),
    options
  )
}

export function useClearMpnSandbox(
  options?: NotificationsMutationHookOptions<ClearMpnSandboxResponse, void>
) {
  const client = options?.client ?? notificationsAdminSdk
  return useNotificationsMutation<ClearMpnSandboxResponse, void>(
    () => client.clearSandboxMessages(),
    options,
    notificationsQueryKeys.sandbox()
  )
}

export function useSendMpnNotification(
  options?: NotificationsMutationHookOptions<
    SendMpnNotificationResponse,
    SendMpnNotificationPayload
  >
) {
  const client = options?.client ?? notificationsAdminSdk
  return useNotificationsMutation<
    SendMpnNotificationResponse,
    SendMpnNotificationPayload
  >(
    (payload) => client.sendNotification(payload),
    options,
    notificationsQueryKeys.logsAll()
  )
}

export function useUpdateStoreMpnConsent(
  options?: NotificationsMutationHookOptions<
    StoreUpdateConsentResponse,
    StoreUpdateConsentPayload
  >
) {
  const client = options?.client ?? notificationsStoreSdk
  return useNotificationsMutation<
    StoreUpdateConsentResponse,
    StoreUpdateConsentPayload
  >(
    (payload) => client.updateConsent(payload),
    options,
    notificationsQueryKeys.broadcasts()
  )
}
