import type {
  DocumentsMutationHookOptions,
  DocumentsQueryHookOptions,
  GetDocumentSettingsResponse,
  MedusaRegionSummary,
  ResetRegionalSettingsResponse,
  UpdateDocumentSettingsPayload,
  UpdateDocumentSettingsResponse,
} from "../types"
import { documentsAdminSdk } from "../sdk/client"
import { documentsQueryKeys } from "../sdk/query-keys"
import {
  useDocumentsMutation,
  useDocumentsQuery,
} from "./use-sdk-primitives"

export function useDocumentSettings(
  regionId?: string | null,
  options?: DocumentsQueryHookOptions<GetDocumentSettingsResponse>
) {
  const client = options?.client ?? documentsAdminSdk
  const queryKey =
    options?.queryKey ?? documentsQueryKeys.settings(regionId || "global")

  return useDocumentsQuery<GetDocumentSettingsResponse>(
    queryKey,
    () => client.getSettings({ region_id: regionId }),
    options
  )
}

export function useUpdateDocumentSettings(
  options?: DocumentsMutationHookOptions<
    UpdateDocumentSettingsResponse,
    UpdateDocumentSettingsPayload
  >
) {
  const client = options?.client ?? documentsAdminSdk
  return useDocumentsMutation<
    UpdateDocumentSettingsResponse,
    UpdateDocumentSettingsPayload
  >(
    (payload) => client.updateSettings(payload),
    options,
    documentsQueryKeys.settingsAll()
  )
}

export function useResetRegionalDocumentSettings(
  options?: DocumentsMutationHookOptions<
    ResetRegionalSettingsResponse,
    { regionId: string }
  >
) {
  const client = options?.client ?? documentsAdminSdk
  return useDocumentsMutation<
    ResetRegionalSettingsResponse,
    { regionId: string }
  >(
    ({ regionId }) => client.resetRegionalSettings(regionId),
    options,
    documentsQueryKeys.settingsAll()
  )
}

export function useDocumentRegions(
  options?: DocumentsQueryHookOptions<{ regions: MedusaRegionSummary[] }>
) {
  const client = options?.client ?? documentsAdminSdk
  const queryKey = options?.queryKey ?? documentsQueryKeys.regions()

  return useDocumentsQuery<{ regions: MedusaRegionSummary[] }>(
    queryKey,
    () => client.listRegions(),
    options
  )
}
