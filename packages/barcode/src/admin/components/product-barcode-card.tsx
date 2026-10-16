import { SectionRow } from "@medusajs/dashboard/components"
import {
  Badge,
  Button,
  Container,
  Heading,
  StatusBadge,
  Text,
  Textarea,
} from "@medusajs/ui"
import { useTranslation } from "react-i18next"

import type {
  BarcodeSymbology,
  LabelPrintOutput,
} from "../../modules/barcode/types"
import { BarcodeImage } from "../../ui"

export interface ProductBarcodeCardProps {
  productTitle?: string
  tags: Array<Record<string, unknown>>
  linkedBarcodes: Array<Record<string, unknown>>
  printPreview: LabelPrintOutput | null
  isBusy: boolean
  feedback: string | null
  onGenerateBarcodes: () => void
  onQuickPrintLabels: () => void
}

export const ProductBarcodeCard = ({
  productTitle,
  tags,
  linkedBarcodes,
  printPreview,
  isBusy,
  onGenerateBarcodes,
  onQuickPrintLabels,
}: ProductBarcodeCardProps) => {
  const { t, i18n } = useTranslation()
  const isRtl = (i18n.resolvedLanguage || i18n.language || "").startsWith("ar")
  const primaryTag = tags[0]

  return (
    <Container className="divide-y p-0" dir={isRtl ? "rtl" : "ltr"}>
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
        <div>
          <Heading level="h2">{t("widget.title")}</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {t("widget.subtitle", {
              productTitle: productTitle || t("widget.defaultProductTitle"),
              tagsCount: tags.length,
              barcodesCount: linkedBarcodes.length,
            })}
          </Text>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="small"
            isLoading={isBusy}
            onClick={onGenerateBarcodes}
          >
            {t("widget.generateButton")}
          </Button>
          <Button
            variant="primary"
            size="small"
            isLoading={isBusy}
            onClick={onQuickPrintLabels}
          >
            {t("widget.printButton")}
          </Button>
        </div>
      </div>

      {primaryTag ? (
        <>
          <SectionRow
            title={t("widget.codeLabel")}
            value={
              <Badge size="xsmall" color="grey">
                {String(primaryTag.code)}
              </Badge>
            }
          />
          <SectionRow
            title={t("widget.actionLabel")}
            value={
              <StatusBadge color="green">
                {String(primaryTag.scan_action)}
              </StatusBadge>
            }
          />
          <SectionRow
            title={t("widget.scansLabel")}
            value={String(primaryTag.scan_count ?? 0)}
          />
          <div className="px-6 py-4">
            <BarcodeImage
              code={String(primaryTag.code)}
              symbology={(primaryTag.symbology as BarcodeSymbology) || "ean13"}
              svgMarkup={
                typeof primaryTag.svg_markup === "string"
                  ? primaryTag.svg_markup
                  : undefined
              }
            />
          </div>
        </>
      ) : null}

      {printPreview ? (
        <div className="px-6 py-4">
          <Text size="xsmall" weight="plus" className="mb-1">
            {t("widget.zplOutputLabel", { name: printPreview.template.name })}
          </Text>
          <Textarea
            readOnly
            rows={4}
            value={printPreview.zpl}
            className="font-mono text-xs"
          />
        </div>
      ) : null}
    </Container>
  )
}
