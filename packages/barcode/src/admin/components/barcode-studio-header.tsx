import { SectionRow } from "@medusajs/dashboard/components"
import {
  Badge,
  Button,
  Container,
  Heading,
  StatusBadge,
  Text,
} from "@medusajs/ui"
import { useTranslation } from "react-i18next"

export interface BarcodeStudioHeaderProps {
  overview: Record<string, unknown>
  lastScanned: string | null
  bannerMessage?: string | null
  bannerTone?: "success" | "error"
  onDismissBanner?: () => void
  onRefresh: () => void
  onBulkGenerate: () => void
}

export const BarcodeStudioHeader = ({
  overview,
  lastScanned,
  onRefresh,
  onBulkGenerate,
}: BarcodeStudioHeaderProps) => {
  const { t } = useTranslation()
  const providers = Array.isArray(overview.active_providers)
    ? (overview.active_providers as string[])
    : []

  return (
    <Container className="divide-y p-0">
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Heading className="font-sans font-medium h1-core">
              {t("header.title")}
            </Heading>
            <StatusBadge color="green">
              {t("header.providersBadge")}
            </StatusBadge>
            {lastScanned ? (
              <Badge color="blue">
                {t("header.lastHidScan", { code: lastScanned })}
              </Badge>
            ) : null}
          </div>
          <Text className="text-ui-fg-subtle mt-1">{t("header.subtitle")}</Text>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="small" onClick={onBulkGenerate}>
            {t("header.bulkGenerateButton")}
          </Button>
          <Button variant="secondary" size="small" onClick={onRefresh}>
            {t("header.refreshButton")}
          </Button>
        </div>
      </div>

      <SectionRow
        title={t("header.activeProvidersStat")}
        value={
          <Badge size="xsmall" color="green">
            {providers.length}
          </Badge>
        }
      />
    </Container>
  )
}
