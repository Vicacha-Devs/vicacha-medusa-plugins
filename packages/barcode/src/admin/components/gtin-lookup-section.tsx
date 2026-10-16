import { SectionRow } from "@medusajs/dashboard/components"
import {
  Button,
  Container,
  Heading,
  Input,
  Select,
  StatusBadge,
  Text,
} from "@medusajs/ui"
import { useTranslation } from "react-i18next"

import type {
  BarcodeLookupChainResult,
  EnrichmentStrategy,
} from "../../modules/barcode/types"
import { BarcodeImage } from "../../ui"
import type { LookupFormState } from "../hooks/use-barcode-studio"
import { GtinLookupBatchSection } from "./batch-import-section"

export interface GtinLookupTabProps {
  form: LookupFormState
  onFormChange: React.Dispatch<React.SetStateAction<LookupFormState>>
  lookupResult: BarcodeLookupChainResult | null
  barcodes: Array<Record<string, unknown>>
  onLookup: () => void
  onCreateProduct: () => void
  onBatchImport: () => void
}

export const GtinLookupLookupSection = ({
  form,
  onFormChange,
  lookupResult,
  onLookup,
  onCreateProduct,
}: Pick<
  GtinLookupTabProps,
  "form" | "onFormChange" | "lookupResult" | "onLookup" | "onCreateProduct"
>) => {
  const { t } = useTranslation()

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">{t("lookupTab.lookupTitle")}</Heading>
        <Text size="small" className="text-ui-fg-subtle mt-1">
          {t("lookupTab.lookupSubtitle")}
        </Text>
      </div>

      <div className="flex flex-col gap-3 px-6 py-4">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <Input
              value={form.barcode}
              onChange={(e) =>
                onFormChange((prev) => ({ ...prev, barcode: e.target.value }))
              }
              placeholder={t("lookupTab.barcodePlaceholder")}
            />
          </div>
          <Select
            value={form.strategy}
            onValueChange={(val) =>
              onFormChange((prev) => ({
                ...prev,
                strategy: val as EnrichmentStrategy,
              }))
            }
          >
            <Select.Trigger>
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="first-hit">
                {t("lookupTab.strategyFirstHit")}
              </Select.Item>
              <Select.Item value="deep-merge">
                {t("lookupTab.strategyDeepMerge")}
              </Select.Item>
            </Select.Content>
          </Select>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="small" onClick={onLookup}>
            {t("lookupTab.lookupOnlyButton")}
          </Button>
          <Button variant="primary" size="small" onClick={onCreateProduct}>
            {t("lookupTab.lookupAndCreateButton", { status: form.status })}
          </Button>
        </div>
      </div>

      {lookupResult ? (
        <>
          <SectionRow
            title={
              lookupResult.product?.name ||
              t("lookupTab.normalizedFallback", {
                barcode: lookupResult.barcode,
              })
            }
            value={
              <StatusBadge color={lookupResult.found ? "green" : "orange"}>
                {lookupResult.found
                  ? t("lookupTab.matchedVia", {
                      provider: lookupResult.product?.provider ?? "",
                    })
                  : t("lookupTab.notFound")}
              </StatusBadge>
            }
          />
          <SectionRow
            title={lookupResult.parsed.type.toUpperCase()}
            value={t("lookupTab.resultDetails", {
              symbology: lookupResult.parsed.type.toUpperCase(),
              valid: lookupResult.parsed.isValid
                ? t("lookupTab.yes")
                : t("lookupTab.no"),
              brand: lookupResult.product?.brand || t("lookupTab.na"),
            })}
          />
          <div className="px-6 py-4">
            <BarcodeImage
              code={lookupResult.barcode}
              symbology={lookupResult.parsed.type}
            />
          </div>
        </>
      ) : null}
    </Container>
  )
}

export const GtinLookupTab = (props: GtinLookupTabProps) => {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <GtinLookupLookupSection
        form={props.form}
        onFormChange={props.onFormChange}
        lookupResult={props.lookupResult}
        onLookup={props.onLookup}
        onCreateProduct={props.onCreateProduct}
      />
      <GtinLookupBatchSection
        form={props.form}
        onFormChange={props.onFormChange}
        barcodes={props.barcodes}
        onBatchImport={props.onBatchImport}
      />
    </div>
  )
}
