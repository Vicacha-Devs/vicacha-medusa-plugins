import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ChatBubbleLeftRight } from "@medusajs/icons"
import { Tabs } from "@medusajs/ui"
import React from "react"
import { useTranslation } from "react-i18next"
import { BroadcastsConsentTab } from "../../components/mpn/broadcasts-tab"
import { ChannelsConfigTab } from "../../components/mpn/channels-tab"
import { DeliveryLogsTab } from "../../components/mpn/delivery-logs-tab"
import { EventMappingsTab } from "../../components/mpn/event-mappings-tab"
import { NotificationHeaderBar } from "../../components/mpn/header-bar"
import { DummySandboxTab } from "../../components/mpn/sandbox-tab"
import { TemplatesBuilderTab } from "../../components/mpn/templates-tab"
import { useNotificationStudio } from "../../components/mpn/use-notification-studio"

const NotificationStudioPage: React.FC = () => {
  const { t, i18n } = useTranslation()
  const {
    statusBanner,
    setStatusBanner,
    templates,
    mappings,
    supportedEvents,
    channelsConfig,
    logs,
    broadcasts,
    consentSummary,
    sandboxMessages,
    loadAllStudioData,
  } = useNotificationStudio()

  const isRtl = (i18n.resolvedLanguage || i18n.language || "").startsWith("ar")

  return (
    <div className="flex flex-col gap-y-4 p-6" dir={isRtl ? "rtl" : "ltr"}>
      <NotificationHeaderBar
        statusBanner={statusBanner}
        onRefresh={() => void loadAllStudioData()}
      />

      <Tabs defaultValue="templates">
        <Tabs.List>
          <Tabs.Trigger value="templates">
            {t("tabs.templates", { count: templates.length })}
          </Tabs.Trigger>
          <Tabs.Trigger value="mappings">
            {t("tabs.mappings", { count: mappings.length })}
          </Tabs.Trigger>
          <Tabs.Trigger value="channels">{t("tabs.channels")}</Tabs.Trigger>
          <Tabs.Trigger value="logs">
            {t("tabs.logs", { count: logs.length })}
          </Tabs.Trigger>
          <Tabs.Trigger value="broadcasts">
            {t("tabs.broadcasts")}
          </Tabs.Trigger>
          <Tabs.Trigger value="sandbox">
            {t("tabs.sandbox", { count: sandboxMessages.length })}
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="templates" className="mt-4">
          <TemplatesBuilderTab
            templates={templates}
            onRefresh={loadAllStudioData}
            onStatus={setStatusBanner}
          />
        </Tabs.Content>

        <Tabs.Content value="mappings" className="mt-4">
          <EventMappingsTab
            mappings={mappings}
            supportedEvents={supportedEvents}
            templates={templates}
            onRefresh={loadAllStudioData}
            onStatus={setStatusBanner}
          />
        </Tabs.Content>

        <Tabs.Content value="channels" className="mt-4">
          <ChannelsConfigTab
            channelsConfig={channelsConfig}
            onRefresh={loadAllStudioData}
            onStatus={setStatusBanner}
          />
        </Tabs.Content>

        <Tabs.Content value="logs" className="mt-4">
          <DeliveryLogsTab logs={logs} />
        </Tabs.Content>

        <Tabs.Content value="broadcasts" className="mt-4">
          <BroadcastsConsentTab
            broadcasts={broadcasts}
            consentSummary={consentSummary}
            templates={templates}
            onRefresh={loadAllStudioData}
            onStatus={setStatusBanner}
          />
        </Tabs.Content>

        <Tabs.Content value="sandbox" className="mt-4">
          <DummySandboxTab
            sandboxMessages={sandboxMessages}
            onRefresh={loadAllStudioData}
          />
        </Tabs.Content>
      </Tabs>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Notifications",
  icon: ChatBubbleLeftRight,
})

export default NotificationStudioPage
