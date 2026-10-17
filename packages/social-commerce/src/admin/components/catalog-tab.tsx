import {
  Badge,
  Container,
  Heading,
  StatusBadge,
  Table,
  Text,
} from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import type { CatalogSyncItemRecord } from "../../modules/social-commerce/types/index.js"
import {
  platformBadgeUiColor,
  statusBadgeUiColor,
} from "../utils/formatters.js"

export interface CatalogTabProps {
  catalogItems: CatalogSyncItemRecord[]
}

export const CatalogTab = ({ catalogItems }: CatalogTabProps) => {
  const { t } = useTranslation()

  return (
    <Container className="divide-y p-0">
      <div className="flex flex-col gap-y-2 px-6 py-4 md:flex-row md:items-center md:justify-between">
        <Heading level="h2">
          {t("tabs.catalog", { count: catalogItems.length })}
        </Heading>

        <div className="flex flex-wrap items-center gap-x-2 text-ui-fg-subtle">
          <Text size="small" className="text-ui-fg-subtle">
            {t("catalogTab.publicFeedsLabel")}
          </Text>
          <a
            href="/store/social/catalog-feed?format=xml"
            target="_blank"
            rel="noopener noreferrer"
            className="txt-compact-small text-ui-fg-interactive hover:text-ui-fg-interactive-hover transition-colors"
          >
            {t("catalogTab.metaXmlFeed")}
          </a>
          <Text size="small" className="text-ui-fg-muted">
            |
          </Text>
          <a
            href="/store/social/catalog-feed?format=csv"
            target="_blank"
            rel="noopener noreferrer"
            className="txt-compact-small text-ui-fg-interactive hover:text-ui-fg-interactive-hover transition-colors"
          >
            {t("catalogTab.tiktokCsvFeed")}
          </a>
          <Text size="small" className="text-ui-fg-muted">
            |
          </Text>
          <a
            href="/store/social/catalog-feed?format=json"
            target="_blank"
            rel="noopener noreferrer"
            className="txt-compact-small text-ui-fg-interactive hover:text-ui-fg-interactive-hover transition-colors"
          >
            {t("catalogTab.jsonFeed")}
          </a>
        </div>
      </div>

      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>
              {t("catalogTab.columns.productId")}
            </Table.HeaderCell>
            <Table.HeaderCell>
              {t("catalogTab.columns.platform")}
            </Table.HeaderCell>
            <Table.HeaderCell>
              {t("catalogTab.columns.externalProductId")}
            </Table.HeaderCell>
            <Table.HeaderCell>
              {t("catalogTab.columns.syncStatus")}
            </Table.HeaderCell>
            <Table.HeaderCell>
              {t("catalogTab.columns.lastSynced")}
            </Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {catalogItems.map((item) => (
            <Table.Row key={item.id}>
              <Table.Cell>
                <Text size="small" weight="plus">
                  {item.product_id}
                </Text>
              </Table.Cell>
              <Table.Cell>
                <Badge
                  size="2xsmall"
                  color={platformBadgeUiColor(item.platform)}
                >
                  {item.platform}
                </Badge>
              </Table.Cell>
              <Table.Cell>
                <Text size="small">
                  {item.external_product_id ?? t("catalogTab.emptyValue")}
                </Text>
              </Table.Cell>
              <Table.Cell>
                <StatusBadge color={statusBadgeUiColor(item.sync_status)}>
                  {item.sync_status}
                </StatusBadge>
              </Table.Cell>
              <Table.Cell>
                <Text size="small" className="text-ui-fg-subtle">
                  {item.last_synced_at
                    ? String(item.last_synced_at)
                    : t("catalogTab.emptyValue")}
                </Text>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </Container>
  )
}

