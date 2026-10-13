import type {
  CreateOrCloneMpnTemplatePayload,
  DeleteMpnTemplateResponse,
  GetMpnTemplateResponse,
  ListMpnTemplatesParams,
  ListMpnTemplatesResponse,
  NotificationsMutationHookOptions,
  NotificationsQueryHookOptions,
  RenderMpnTemplatePayload,
  RenderMpnTemplateResponse,
  SaveMpnTemplateResponse,
  UpdateMpnTemplatePayload,
} from "../types"
import { notificationsAdminSdk } from "../sdk/client"
import { notificationsQueryKeys } from "../sdk/query-keys"
import {
  useNotificationsMutation,
  useNotificationsQuery,
} from "./use-sdk-primitives"

export function useMpnTemplates(
  params?: ListMpnTemplatesParams,
  options?: NotificationsQueryHookOptions<ListMpnTemplatesResponse>
) {
  const client = options?.client ?? notificationsAdminSdk
  const queryKey =
    options?.queryKey ??
    notificationsQueryKeys.templates(params as Record<string, unknown> | undefined)

  return useNotificationsQuery<ListMpnTemplatesResponse>(
    queryKey,
    () => client.listTemplates(params),
    options
  )
}

export function useMpnTemplateDetail(
  id: string | undefined,
  options?: NotificationsQueryHookOptions<GetMpnTemplateResponse>
) {
  const client = options?.client ?? notificationsAdminSdk
  const queryKey =
    options?.queryKey ?? notificationsQueryKeys.template(id || "")

  return useNotificationsQuery<GetMpnTemplateResponse>(
    queryKey,
    () => client.getTemplate(id!),
    {
      ...options,
      enabled: Boolean(id) && (options?.enabled ?? true),
    }
  )
}

export function useCreateOrCloneMpnTemplate(
  options?: NotificationsMutationHookOptions<
    SaveMpnTemplateResponse,
    CreateOrCloneMpnTemplatePayload
  >
) {
  const client = options?.client ?? notificationsAdminSdk
  return useNotificationsMutation<
    SaveMpnTemplateResponse,
    CreateOrCloneMpnTemplatePayload
  >(
    (payload) => client.createOrCloneTemplate(payload),
    options,
    notificationsQueryKeys.templatesAll()
  )
}

export function useUpdateMpnTemplate(
  options?: NotificationsMutationHookOptions<
    SaveMpnTemplateResponse,
    { id: string; payload: UpdateMpnTemplatePayload }
  >
) {
  const client = options?.client ?? notificationsAdminSdk
  return useNotificationsMutation<
    SaveMpnTemplateResponse,
    { id: string; payload: UpdateMpnTemplatePayload }
  >(
    ({ id, payload }) => client.updateTemplate(id, payload),
    options,
    notificationsQueryKeys.templatesAll()
  )
}

export function useDeleteMpnTemplate(
  options?: NotificationsMutationHookOptions<
    DeleteMpnTemplateResponse,
    { id: string }
  >
) {
  const client = options?.client ?? notificationsAdminSdk
  return useNotificationsMutation<DeleteMpnTemplateResponse, { id: string }>(
    ({ id }) => client.deleteTemplate(id),
    options,
    notificationsQueryKeys.templatesAll()
  )
}

export function useRenderMpnTemplatePreview(
  options?: NotificationsMutationHookOptions<
    RenderMpnTemplateResponse,
    RenderMpnTemplatePayload
  >
) {
  const client = options?.client ?? notificationsAdminSdk
  return useNotificationsMutation<
    RenderMpnTemplateResponse,
    RenderMpnTemplatePayload
  >(
    (payload) => client.renderTemplatePreview(payload),
    options,
    notificationsQueryKeys.templatesAll()
  )
}
