import { useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  useMpnBroadcasts,
  useMpnChannels,
  useMpnLogs,
  useMpnMappings,
  useMpnSandboxMessages,
  useMpnTemplates,
} from "../../../hooks"
import { invalidateNotificationsQueries, notificationsQueryKeys } from "../../../sdk"
import type { StatusBannerState } from "./constants"

export function useNotificationStudio() {
  const { t } = useTranslation()
  const [statusBanner, setStatusBanner] = useState<StatusBannerState | null>(
    null
  )

  const handleLoadError = useCallback(() => {
    setStatusBanner({
      type: "error",
      text: t("messages.loadStudioError"),
    })
  }, [t])

  const { data: tplData } = useMpnTemplates(undefined, {
    onError: handleLoadError,
  })
  const { data: mapData } = useMpnMappings({
    onError: handleLoadError,
  })
  const { data: chData } = useMpnChannels({
    onError: handleLoadError,
  })
  const { data: logData } = useMpnLogs(
    { limit: 50 },
    { onError: handleLoadError }
  )
  const { data: brcData } = useMpnBroadcasts({
    onError: handleLoadError,
  })
  const { data: sbxData } = useMpnSandboxMessages(
    { limit: 50 },
    { onError: handleLoadError }
  )

  const loadAllStudioData = useCallback(async () => {
    invalidateNotificationsQueries(notificationsQueryKeys.all)
  }, [])

  return {
    statusBanner,
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
