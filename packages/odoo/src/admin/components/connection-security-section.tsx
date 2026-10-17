import { SectionRow } from "@medusajs/dashboard/components"
import { Badge, Container, Heading, StatusBadge } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

export interface ConnectionSecuritySideSectionProps {
  protocol: string
  allowPrivateNetwork: boolean
  savedFlags?: {
    hasPassword?: boolean
    hasApiKey?: boolean
    hasWebhookSecret?: boolean
  }
}

export const ConnectionSecuritySideSection = ({
  protocol,
  allowPrivateNetwork,
  savedFlags,
}: ConnectionSecuritySideSectionProps) => {
  const { t } = useTranslation()

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{t("tabs.connection")}</Heading>
      </div>
      <SectionRow
        title={t("connectionTab.protocolLabel")}
        value={
          <Badge size="2xsmall" color="blue">
            {protocol.toUpperCase()}
          </Badge>
        }
      />
      <SectionRow
        title={t("connectionTab.passwordLabel")}
        value={
          <StatusBadge color={savedFlags?.hasPassword ? "green" : "grey"}>
            {savedFlags?.hasPassword ? t("connectionTab.savedSuffix") : "—"}
          </StatusBadge>
        }
      />
      <SectionRow
        title={t("connectionTab.apiKeyLabel")}
        value={
          <StatusBadge color={savedFlags?.hasApiKey ? "green" : "grey"}>
            {savedFlags?.hasApiKey ? t("connectionTab.savedSuffix") : "—"}
          </StatusBadge>
        }
      />
      <SectionRow
        title={t("connectionTab.webhookSecretLabel")}
        value={
          <StatusBadge color={savedFlags?.hasWebhookSecret ? "green" : "grey"}>
            {savedFlags?.hasWebhookSecret
              ? t("connectionTab.savedSuffix")
              : "—"}
          </StatusBadge>
        }
      />
      <SectionRow
        title={t("connectionTab.privateNetworkLabel")}
        value={
          <Badge
            size="2xsmall"
            color={allowPrivateNetwork ? "orange" : "green"}
          >
            {allowPrivateNetwork ? "DEV" : "SSRF SAFE"}
          </Badge>
        }
      />
    </Container>
  )
}
