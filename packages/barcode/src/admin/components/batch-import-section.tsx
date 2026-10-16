import {
  Badge,
  Button,
  Container,
  Heading,
  Table,
  Text,
  Textarea,
} from "@medusajs/ui"
import { useTranslation } from "react-i18next"

import type { LookupFormState } from "../hooks/use-barcode-studio"

export interface GtinLookupBatchSectionProps {
  form: LookupFormState
  onFormChange: React.Dispatch<React.SetStateAction<LookupFormState>>
  barcodes: Array<Record<string, unknown>>
  onBatchImport: () => void
}

export const GtinLookupBatchSection = ({
  form,
  onFormChange,
  barcodes,
  onBatchImport,
}: GtinLookupBatchSectionProps) => {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-y-4">
      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Heading level="h2">{t("lookupTab.batchTitle")}</Heading>
          <Text size="small" className="text-ui-fg-subtle mt-1">
            {t("lookupTab.batchSubtitle")}
          </Text>
        </div>

        <div className="flex flex-col gap-3 px-6 py-4">
          <Textarea
            rows={4}
            value={form.batchInput}
            onChange={(e) =>
              onFormChange((prev) => ({ ...prev, batchInput: e.target.value }))
            }
          />
          <div>
            <Button variant="secondary" size="small" onClick={onBatchImport}>
              {t("lookupTab.batchRunButton")}
            </Button>
          </div>
        </div>
      </Container>

      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h2">
            {t("lookupTab.recentlyLinkedTitle", { count: barcodes.length })}
          </Heading>
          <Badge size="xsmall" color="grey">
            {barcodes.length}
          </Badge>
        </div>
        {barcodes.length === 0 ? (
          <div className="px-6 py-4">
            <Text size="small" className="text-ui-fg-subtle">
              {t("lookupTab.noLinkedProducts")}
            </Text>
          </div>
        ) : (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>GTIN / Barcode</Table.HeaderCell>
                <Table.HeaderCell>Product ID</Table.HeaderCell>
                <Table.HeaderCell>Provider</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {barcodes.map((row) => (
                <Table.Row key={String(row.id)}>
                  <Table.Cell className="font-mono font-semibold">
                    {String(row.barcode)}
                  </Table.Cell>
                  <Table.Cell>{String(row.product_id)}</Table.Cell>
                  <Table.Cell>
                    <Badge size="xsmall" color="blue">
                      {String(row.provider)}
                    </Badge>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}
      </Container>
    </div>
  )
}
