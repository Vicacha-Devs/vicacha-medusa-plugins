import * as React from "react"
import { SectionRow } from "@medusajs/dashboard/components"
import { Badge, Button, Container, Heading, Text } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import type { AttributeDefinitionDTO } from "../../modules/product-ext/types"

export interface CategoryAttributesCardProps {
  categoryName?: string
  attributes: AttributeDefinitionDTO[]
  isLoading: boolean
  onRefresh: () => void
}

export const CategoryAttributesCard: React.FC<CategoryAttributesCardProps> = ({
  categoryName,
  attributes,
  isLoading,
  onRefresh,
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
            {t("widget.categoryTitle")}
            {categoryName ? ` — ${categoryName}` : ""}
          </Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {t("widget.categorySubtitle")}
          </Text>
        </div>
        <Button
          variant="secondary"
          size="small"
          isLoading={isLoading}
          onClick={onRefresh}
        >
          {t("widget.refreshButton")}
        </Button>
      </div>

      {attributes.length > 0 ? (
        attributes.map((attr) => (
          <SectionRow
            key={attr.id}
            title={attr.label}
            value={
              <Badge
                size="small"
                color={attr.is_global ? "purple" : "blue"}
              >
                {attr.key} · {attr.type}
              </Badge>
            }
          />
        ))
      ) : (
        <SectionRow
          title={t("widget.categoryTitle")}
          value={t("widget.noCategoryAttributes")}
        />
      )}
    </Container>
  )
}
