import type {
  CreateMpnMappingPayload,
  DeleteMpnMappingResponse,
  ListMpnMappingsResponse,
  NotificationsMutationHookOptions,
  NotificationsQueryHookOptions,
  SaveMpnMappingResponse,
} from "../types"
import { notificationsAdminSdk } from "../sdk/client"
import { notificationsQueryKeys } from "../sdk/query-keys"
import {
  useNotificationsMutation,
  useNotificationsQuery,
} from "./use-sdk-primitives"

export function useMpnMappings(
  options?: NotificationsQueryHookOptions<ListMpnMappingsResponse>
) {
  const client = options?.client ?? notificationsAdminSdk
  const queryKey = options?.queryKey ?? notificationsQueryKeys.mappings()

  return useNotificationsQuery<ListMpnMappingsResponse>(
    queryKey,
    () => client.listMappings(),
    options
  )
}

export function useCreateMpnMapping(
  options?: NotificationsMutationHookOptions<
    SaveMpnMappingResponse,
    CreateMpnMappingPayload
  >
) {
  const client = options?.client ?? notificationsAdminSdk
  return useNotificationsMutation<
    SaveMpnMappingResponse,
    CreateMpnMappingPayload
  >(
    (payload) => client.createMapping(payload),
    options,
    notificationsQueryKeys.mappingsAll()
  )
}

export function useUpdateMpnMapping(
  options?: NotificationsMutationHookOptions<
    SaveMpnMappingResponse,
    { id: string; payload: Partial<CreateMpnMappingPayload> }
  >
) {
  const client = options?.client ?? notificationsAdminSdk
  return useNotificationsMutation<
    SaveMpnMappingResponse,
    { id: string; payload: Partial<CreateMpnMappingPayload> }
  >(
    ({ id, payload }) => client.updateMapping(id, payload),
    options,
    notificationsQueryKeys.mappingsAll()
  )
}

export function useDeleteMpnMapping(
  options?: NotificationsMutationHookOptions<
    DeleteMpnMappingResponse,
    { id: string }
  >
) {
  const client = options?.client ?? notificationsAdminSdk
  return useNotificationsMutation<DeleteMpnMappingResponse, { id: string }>(
    ({ id }) => client.deleteMapping(id),
    options,
    notificationsQueryKeys.mappingsAll()
  )
}
