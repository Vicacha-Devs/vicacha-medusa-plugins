import { SectionRow } from "@medusajs/dashboard/components"
import { Container, Heading, StatusBadge } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

import { ProvidersCacheSection } from "./providers-cache-table"

export interface ProvidersCacheTabProps {
  overview: Record<string, unknown>
  cacheEntries: Array<Record<string, unknown>>
  onPurgeExpired: () => void
  onClearAllCache: () => void
}

export const ProvidersRegistrySection = ({
  overview,
}: Pick<ProvidersCacheTabProps, "overview">) => {
  const { t } = useTranslation()
  const providers = Array.isArray(overview.active_providers)
    ? (overview.active_providers as string[])
    : []

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">{t("providersTab.providersTitle")}</Heading>
      </div>
      {providers.map((p) => (
        <SectionRow
          key={p}
          title={p}
          value={<StatusBadge color="green">{p}</StatusBadge>}
        />
      ))}
    </Container>
  )
}

export const ProvidersCacheTab = (props: ProvidersCacheTabProps) => {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <ProvidersRegistrySection overview={props.overview} />
      <ProvidersCacheSection
        cacheEntries={props.cacheEntries}
        onPurgeExpired={props.onPurgeExpired}
        onClearAllCache={props.onClearAllCache}
      />
    </div>
  )
}
