import {
  Badge,
  Container,
  Heading,
  StatusBadge,
  Table,
  Text,
} from "@medusajs/ui"
import { useTranslation } from "react-i18next"

export interface PosTransactionsSectionProps {
  posTransactions: Array<Record<string, unknown>>
}

export const PosTransactionsSection = ({
  posTransactions,
}: PosTransactionsSectionProps) => {
  const { t } = useTranslation()

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">
          {t("barcodeTab.posTransactionsTitle", {
            count: posTransactions.length,
          })}
        </Heading>
        <Badge size="2xsmall" color="grey">
          {posTransactions.length}
        </Badge>
      </div>

      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>POS</Table.HeaderCell>
            <Table.HeaderCell>Orders</Table.HeaderCell>
            <Table.HeaderCell className="text-right">Status</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {posTransactions.map((tx) => (
            <Table.Row key={String(tx.id)}>
              <Table.Cell>
                <Text size="small" weight="plus">
                  {t("barcodeTab.posHeader", {
                    externalId: String(tx.external_transaction_id),
                    currency: String(tx.currency),
                    total: (Number(tx.total_cents ?? 0) / 100).toFixed(2),
                  })}
                </Text>
              </Table.Cell>
              <Table.Cell>
                <Text size="small" className="text-ui-fg-subtle">
                  {t("barcodeTab.posOrders", {
                    medusaOrder: String(
                      tx.medusa_order_id ?? t("barcodeTab.pending")
                    ),
                    odooOrder: String(
                      tx.odoo_order_id ?? t("barcodeTab.pending")
                    ),
                  })}
                </Text>
              </Table.Cell>
              <Table.Cell className="text-right">
                <StatusBadge
                  color={tx.status === "replayed" ? "green" : "orange"}
                >
                  {String(tx.status)}
                </StatusBadge>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </Container>
  )
}
