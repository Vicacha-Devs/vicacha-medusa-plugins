import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CORE_LAYOUT_IDS } from "@medusajs/admin-shared"
import { LayoutComposer } from "@medusajs/dashboard/components"
import {
  ArrowPath,
  ChatBubbleLeftRight,
  CheckCircle,
  CogSixTooth,
  DocumentText,
  EnvelopeSolid,
  Megaphone,
  Tag,
} from "@medusajs/icons"
import {
  Button,
  Container,
  Heading,
  Text,
  Toaster,
  toast,
} from "@medusajs/ui"
import React from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import {
  NavigationCard,
  StatCard,
  useNotificationStudio,
} from "../../components/mpn"

const NotificationStudioOverviewPage: React.FC = () => {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const {
    isLoading,
    templates,
    mappings,
    logs,
    sandboxMessages,
    loadAllStudioData,
  } = useNotificationStudio()

  const isRtl = (i18n.resolvedLanguage || i18n.language || "").startsWith("ar")

  const handleRefresh = async () => {
    try {
      await loadAllStudioData()
      toast.success(t("header.refresh"))
    } catch {
      toast.error(t("messages.loadStudioError"))
    }
  }

  return (
    <LayoutComposer
      widgetsZonePrefix="mpn.overview"
      preferredLayoutId={CORE_LAYOUT_IDS.SINGLE_COLUMN}
      sections={{
        main: (
          <LayoutComposer.Entry id="MpnOverviewDashboard">
            <div className="flex flex-col gap-y-4" dir={isRtl ? "rtl" : "ltr"}>
              <Toaster />
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <Heading className="font-sans font-medium h1-core">
                    {t("header.title")}
                  </Heading>

                  <Text className="text-ui-fg-subtle mt-1">
                    {t("header.subtitle")}
                  </Text>
                </div>

                <Button
                  size="small"
                  variant="secondary"
                  onClick={() => void handleRefresh()}
                >
                  <ArrowPath />
                  {t("header.refresh")}
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <StatCard
                  title={t("templates.title")}
                  value={templates.length}
                  icon={<DocumentText />}
                  loading={isLoading}
                  onClick={() => navigate("/mpn/templates")}
                />

                <StatCard
                  title={t("mappings.title")}
                  value={mappings.length}
                  icon={<Tag />}
                  loading={isLoading}
                  onClick={() => navigate("/mpn/mappings")}
                />

                <StatCard
                  title={t("logs.title")}
                  value={logs.length}
                  icon={<CheckCircle />}
                  loading={isLoading}
                  onClick={() => navigate("/mpn/logs")}
                />

                <StatCard
                  title={t("sandbox.title")}
                  value={sandboxMessages.length}
                  icon={<EnvelopeSolid />}
                  loading={isLoading}
                  onClick={() => navigate("/mpn/sandbox")}
                />
              </div>

              <Container className="p-0 overflow-hidden">
                <div className="px-6 py-5 border-b border-ui-border-base">
                  <Heading level="h2">{t("nav.label")}</Heading>

                  <Text className="text-ui-fg-subtle mt-1">
                    {t("header.subtitle")}
                  </Text>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2">
                  <NavigationCard
                    icon={<DocumentText />}
                    title={t("tabs.templates", { count: templates.length })}
                    description={t("templates.emptySelection")}
                    onClick={() => navigate("/mpn/templates")}
                    position="top-left"
                  />

                  <NavigationCard
                    icon={<Tag />}
                    title={t("tabs.mappings", { count: mappings.length })}
                    description={t("mappings.title")}
                    onClick={() => navigate("/mpn/mappings")}
                    position="top-right"
                  />

                  <NavigationCard
                    icon={<CogSixTooth />}
                    title={t("tabs.channels")}
                    description={t("channels.whatsappSubtitle")}
                    onClick={() => navigate("/mpn/channels")}
                    position="middle-left"
                  />

                  <NavigationCard
                    icon={<CheckCircle />}
                    title={t("tabs.logs", { count: logs.length })}
                    description={t("logs.title")}
                    onClick={() => navigate("/mpn/logs")}
                    position="middle-right"
                  />

                  <NavigationCard
                    icon={<Megaphone />}
                    title={t("tabs.broadcasts")}
                    description={t("broadcasts.title")}
                    onClick={() => navigate("/mpn/broadcasts")}
                    position="bottom-left"
                  />

                  <NavigationCard
                    icon={<EnvelopeSolid />}
                    title={t("tabs.sandbox", { count: sandboxMessages.length })}
                    description={t("sandbox.subtitle")}
                    onClick={() => navigate("/mpn/sandbox")}
                    position="bottom-right"
                  />
                </div>
              </Container>
            </div>
          </LayoutComposer.Entry>
        ),
      }}
    />
  )
}

const Breadcrumb = () => {
  const { t } = useTranslation()
  return t("nav.label")
}

export const config = defineRouteConfig({
  label: "Notifications",
  translationNs: "mpn",
  icon: ChatBubbleLeftRight,
})

export const handle = {
  breadcrumb: () => <Breadcrumb />,
}

export default NotificationStudioOverviewPage
