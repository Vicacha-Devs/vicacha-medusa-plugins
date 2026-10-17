import * as React from "react"
import { SectionRow } from "@medusajs/dashboard/components"
import {
  Badge,
  Button,
  Container,
  Heading,
  Input,
  Label,
  Text,
} from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import type {
  ProductExtensionDTO,
  ResolvedProductAttributeEntry,
} from "../../modules/product-ext/types"

export interface ProductExtDetailCardProps {
  productTitle?: string
  extension: ProductExtensionDTO | null
  attributes: ResolvedProductAttributeEntry[]
  taglineInput: string
  onTaglineChange: (val: string) => void
  videosCsvInput: string
  onVideosCsvChange: (val: string) => void
  glbUrlInput: string
  onGlbUrlChange: (val: string) => void
  isBusy: boolean
  onSave: () => void
}

export const ProductExtDetailCard: React.FC<ProductExtDetailCardProps> = ({
  productTitle,
  extension,
  attributes,
  taglineInput,
  onTaglineChange,
  videosCsvInput,
  onVideosCsvChange,
  glbUrlInput,
  onGlbUrlChange,
  isBusy,
  onSave,
}) => {
  const { t, i18n } = useTranslation()
  const isRtl = (i18n.resolvedLanguage || i18n.language || "").startsWith("ar")

  return (
    <Container
      className="divide-y p-0"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">
            {t("widget.productTitle")}
            {productTitle ? ` — ${productTitle}` : ""}
          </Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {t("widget.productSubtitle")}
          </Text>
        </div>
        <div className="flex items-center gap-x-2">
          <Badge size="small" color="blue">
            {t("widget.videosBadge", {
              count: extension?.videos?.length ?? 0,
            })}
          </Badge>
          <Badge size="small" color="purple">
            {t("widget.attributesBadge", { count: attributes.length })}
          </Badge>
          <Button
            variant="primary"
            size="small"
            isLoading={isBusy}
            onClick={onSave}
          >
            {t("widget.saveButton")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 px-6 py-4 md:grid-cols-3">
        <div>
          <Label size="small">{t("widget.taglineField")}</Label>
          <Input
            placeholder={t("widget.taglinePlaceholder")}
            value={taglineInput}
            onChange={(e) => onTaglineChange(e.target.value)}
          />
        </div>
        <div>
          <Label size="small">{t("widget.videosCsvField")}</Label>
          <Input
            placeholder={t("widget.videosCsvPlaceholder")}
            value={videosCsvInput}
            onChange={(e) => onVideosCsvChange(e.target.value)}
          />
        </div>
        <div>
          <Label size="small">{t("widget.glbUrlField")}</Label>
          <Input
            placeholder={t("widget.glbUrlPlaceholder")}
            value={glbUrlInput}
            onChange={(e) => onGlbUrlChange(e.target.value)}
          />
        </div>
      </div>

      {attributes.length > 0 ? (
        attributes.map((attr) => (
          <SectionRow
            key={attr.definition.id}
            title={attr.definition.label}
            value={
              <Badge size="small" color="grey">
                {attr.display_value}
              </Badge>
            }
          />
        ))
      ) : (
        <SectionRow
          title={t("widget.attributesBadge", { count: 0 })}
          value={t("widget.noAttributes")}
        />
      )}
    </Container>
  )
}
