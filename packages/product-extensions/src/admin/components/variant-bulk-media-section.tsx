import * as React from "react"
import { SectionRow } from "@medusajs/dashboard/components"
import { Button, Container, Heading, Input, Label, Text } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import type { BulkMediaFormState } from "../hooks/use-product-ext-studio"

export interface VariantBulkMediaTabProps {
  form: BulkMediaFormState
  onFormChange: React.Dispatch<React.SetStateAction<BulkMediaFormState>>
  isBusy: boolean
  onBulkAssign: () => void
}

export const VariantBulkMediaSection: React.FC<VariantBulkMediaTabProps> = ({
  form,
  onFormChange,
  isBusy,
  onBulkAssign,
}) => {
  const { t } = useTranslation()

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">{t("variantMediaTab.title")}</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {t("variantMediaTab.subtitle")}
          </Text>
        </div>
        <Button
          variant="primary"
          size="small"
          isLoading={isBusy}
          onClick={onBulkAssign}
        >
          {t("variantMediaTab.applyButton")}
        </Button>
      </div>
      <SectionRow
        title={t("variantMediaTab.optionTitleField")}
        value={`${form.option_title || "—"} = ${form.option_value || "—"}`}
      />
      <div className="grid grid-cols-1 gap-4 px-6 py-4 md:grid-cols-3">
        <div>
          <Label size="small">{t("variantMediaTab.productIdField")}</Label>
          <Input
            placeholder={t("variantMediaTab.productIdPlaceholder")}
            value={form.product_id}
            onChange={(e) =>
              onFormChange((prev) => ({
                ...prev,
                product_id: e.target.value,
              }))
            }
          />
        </div>
        <div>
          <Label size="small">{t("variantMediaTab.optionTitleField")}</Label>
          <Input
            placeholder={t("variantMediaTab.optionTitlePlaceholder")}
            value={form.option_title}
            onChange={(e) =>
              onFormChange((prev) => ({
                ...prev,
                option_title: e.target.value,
              }))
            }
          />
        </div>
        <div>
          <Label size="small">{t("variantMediaTab.optionValueField")}</Label>
          <Input
            placeholder={t("variantMediaTab.optionValuePlaceholder")}
            value={form.option_value}
            onChange={(e) =>
              onFormChange((prev) => ({
                ...prev,
                option_value: e.target.value,
              }))
            }
          />
        </div>
        <div>
          <Label size="small">{t("variantMediaTab.variantIdsField")}</Label>
          <Input
            placeholder={t("variantMediaTab.variantIdsPlaceholder")}
            value={form.variant_id_sample}
            onChange={(e) =>
              onFormChange((prev) => ({
                ...prev,
                variant_id_sample: e.target.value,
              }))
            }
          />
        </div>
        <div>
          <Label size="small">{t("variantMediaTab.thumbnailField")}</Label>
          <Input
            placeholder={t("variantMediaTab.thumbnailPlaceholder")}
            value={form.thumbnail}
            onChange={(e) =>
              onFormChange((prev) => ({
                ...prev,
                thumbnail: e.target.value,
              }))
            }
          />
        </div>
        <div>
          <Label size="small">{t("variantMediaTab.swatchColorField")}</Label>
          <Input
            placeholder={t("variantMediaTab.swatchColorPlaceholder")}
            value={form.swatch_color}
            onChange={(e) =>
              onFormChange((prev) => ({
                ...prev,
                swatch_color: e.target.value,
              }))
            }
          />
        </div>
        <div className="md:col-span-2">
          <Label size="small">{t("variantMediaTab.imagesCsvField")}</Label>
          <Input
            placeholder={t("variantMediaTab.imagesCsvPlaceholder")}
            value={form.images_csv}
            onChange={(e) =>
              onFormChange((prev) => ({
                ...prev,
                images_csv: e.target.value,
              }))
            }
          />
        </div>
        <div>
          <Label size="small">{t("variantMediaTab.videosCsvField")}</Label>
          <Input
            placeholder={t("variantMediaTab.videosCsvPlaceholder")}
            value={form.videos_csv}
            onChange={(e) =>
              onFormChange((prev) => ({
                ...prev,
                videos_csv: e.target.value,
              }))
            }
          />
        </div>
      </div>
    </Container>
  )
}

export const VariantBulkMediaTab = VariantBulkMediaSection
