import {
  Button,
  Container,
  Heading,
  StatusBadge,
  Table,
} from "@medusajs/ui"
import { useTranslation } from "react-i18next"

export interface ProvidersCacheSectionProps {
  cacheEntries: Array<Record<string, unknown>>
  onPurgeExpired: () => void
  onClearAllCache: () => void
}

export const ProvidersCacheSection = ({
  cacheEntries,
  onPurgeExpired,
  onClearAllCache,
}: ProvidersCacheSectionProps) => {
  const { t } = useTranslation()

  return (
    <Container className="divide-y p-0">
      <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-4">
        <Heading level="h2">
          {t("providersTab.cacheTitle", { count: cacheEntries.length })}
        </Heading>
        <div className="flex gap-2">
          <Button variant="secondary" size="small" onClick={onPurgeExpired}>
            {t("providersTab.purgeExpiredButton")}
          </Button>
          <Button variant="secondary" size="small" onClick={onClearAllCache}>
            {t("providersTab.clearAllButton")}
          </Button>
        </div>
      </div>

      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Barcode</Table.HeaderCell>
            <Table.HeaderCell>Provider</Table.HeaderCell>
            <Table.HeaderCell>Hits</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {cacheEntries.map((entry) => (
            <Table.Row key={String(entry.id)}>
              <Table.Cell className="font-mono font-bold">
                {String(entry.barcode)}
              </Table.Cell>
              <Table.Cell>{String(entry.provider)}</Table.Cell>
              <Table.Cell>
                <StatusBadge color={entry.found ? "green" : "orange"}>
                  {t("providersTab.hitsBadge", {
                    count: String(entry.hit_count ?? 1),
                  })}
                </StatusBadge>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </Container>
  )
}
