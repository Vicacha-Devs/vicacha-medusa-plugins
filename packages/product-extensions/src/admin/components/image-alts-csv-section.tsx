import * as React from "react"
import { SectionRow } from "@medusajs/dashboard/components"
import { Button, Container, Heading, Text, Textarea } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

export interface ImageAltsCsvTabProps {
  csvContent: string
  onCsvChange: (val: string) => void
  isBusy: boolean
  onExport: () => void
  onImport: () => void
}

export const ImageAltsCsvSection: React.FC<ImageAltsCsvTabProps> = ({
  csvContent,
  onCsvChange,
  isBusy,
  onExport,
  onImport,
}) => {
  const { t } = useTranslation()

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">{t("imageAltsTab.title")}</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {t("imageAltsTab.subtitle")}
          </Text>
        </div>
        <div className="flex items-center gap-x-2">
          <Button
            variant="secondary"
            size="small"
            isLoading={isBusy}
            onClick={onExport}
          >
            {t("imageAltsTab.exportButton")}
          </Button>
          <Button
            variant="primary"
            size="small"
            isLoading={isBusy}
            onClick={onImport}
          >
            {t("imageAltsTab.importButton")}
          </Button>
        </div>
      </div>
      <SectionRow
        title="CSV Header"
        value="product_id,image_url,image_id,alt,title,caption,locale"
      />
      <div className="px-6 py-4">
        <Textarea
          rows={8}
          value={csvContent}
          onChange={(e) => onCsvChange(e.target.value)}
          className="font-mono text-xs"
        />
      </div>
    </Container>
  )
}

export const ImageAltsCsvTab = ImageAltsCsvSection
