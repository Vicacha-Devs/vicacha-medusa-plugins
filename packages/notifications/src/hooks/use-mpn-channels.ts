import type {
  ListMpnChannelsResponse,
  NotificationsMutationHookOptions,
  NotificationsQueryHookOptions,
  SaveOrVerifyMpnChannelPayload,
  SaveOrVerifyMpnChannelResponse,
} from "../types"
import { notificationsAdminSdk } from "../sdk/client"
import { notificationsQueryKeys } from "../sdk/query-keys"
import {
  useNotificationsMutation,
  useNotificationsQuery,
} from "./use-sdk-primitives"

export function useMpnChannels(
  options?: NotificationsQueryHookOptions<ListMpnChannelsResponse>
) {
  const client = options?.client ?? notificationsAdminSdk
  const queryKey = options?.queryKey ?? notificationsQueryKeys.channels()

  return useNotificationsQuery<ListMpnChannelsResponse>(
    queryKey,
    () => client.listChannels(),
    options
  )
}

export function useSaveOrVerifyMpnChannel(
  options?: NotificationsMutationHookOptions<
    SaveOrVerifyMpnChannelResponse,
    SaveOrVerifyMpnChannelPayload
  >
) {
  const client = options?.client ?? notificationsAdminSdk
  return useNotificationsMutation<
    SaveOrVerifyMpnChannelResponse,
    SaveOrVerifyMpnChannelPayload
  >(
    (payload) => client.saveOrVerifyChannel(payload),
    options,
    notificationsQueryKeys.channels()
  )
}
