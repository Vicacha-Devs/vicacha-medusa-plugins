import { useCallback } from "react"
import { toast } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import {
  useMpnBroadcasts,
  useMpnChannels,
  useMpnLogs,
  useMpnMappings,
  useMpnSandboxMessages,
  useMpnTemplates,
} from "../../../hooks"
import {
  invalidateNotificationsQueries,
  notificationsQueryKeys,
} from "../../../sdk"
import type { StatusBannerState } from "./constants"

export function useNotificationStudio() {
  const { t } = useTranslation()

  const handleLoadError = useCallback(() => {
    toast.error(t("messages.loadStudioError"))
  }, [t])

  const { data: tplData, isLoading: templatesLoading } = useMpnTemplates(
    undefined,
    {
      onError: handleLoadError,
    }
  )
  const { data: mapData, isLoading: mappingsLoading } = useMpnMappings({
    onError: handleLoadError,
  })
  const { data: chData, isLoading: channelsLoading } = useMpnChannels({
    onError: handleLoadError,
  })
  const { data: logData, isLoading: logsLoading } = useMpnLogs(
    { limit: 50 },
    { onError: handleLoadError }
  )
  const { data: brcData, isLoading: broadcastsLoading } = useMpnBroadcasts({
    onError: handleLoadError,
  })
  const { data: sbxData, isLoading: sandboxLoading } = useMpnSandboxMessages(
    { limit: 50 },
    { onError: handleLoadError }
  )

  const setStatusBanner = useCallback((status: StatusBannerState | null) => {
    if (!status) return
    if (status.type === "success") {
      toast.success(status.text)
    } else {
      toast.error(status.text)
    }
  }, [])

  const loadAllStudioData = useCallback(async () => {
    invalidateNotificationsQueries(notificationsQueryKeys.all)
  }, [])

  const isLoading =
    templatesLoading ||
    mappingsLoading ||
    channelsLoading ||
    logsLoading ||
    broadcastsLoading ||
    sandboxLoading

  return {
    isLoading,
    statusBanner: null as StatusBannerState | null,
    setStatusBanner,
    templates: tplData?.templates || [],
    mappings: mapData?.mappings || [],
    supportedEvents: mapData?.supported_events || [],
    channelsConfig: chData?.channels || [],
    logs: logData?.logs || [],
    broadcasts: brcData?.broadcasts || [],
    consentSummary: brcData?.consent_summary || null,
    sandboxMessages: sbxData?.messages || [],
    loadAllStudioData,
  }
}
