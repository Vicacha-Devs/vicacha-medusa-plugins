import * as React from "react"
import { Badge, Button, Container, Heading, Text } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

export interface ProductExtStudioHeaderProps {
  attributesCount: number
  templatesCount: number
  featuresCount: number
  onRefresh: () => void
  isLoading?: boolean
}

export const ProductExtStudioHeader: React.FC<ProductExtStudioHeaderProps> = ({
  attributesCount,
  templatesCount,
  featuresCount,
  onRefresh,
  isLoading = false,
}) => {
  const { t } = useTranslation()

  return (
    <Container className="divide-y p-0">
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
        <div>
          <Heading className="font-sans font-medium h1-core">
            {t("header.title")}
          </Heading>
          <Text size="small" className="text-ui-fg-subtle mt-1">
            {t("header.subtitle")}
          </Text>
        </div>
        <div className="flex items-center gap-x-2">
          <Badge size="small" color="blue">
            {t("header.attributesBadge", { count: attributesCount })}
          </Badge>
          <Badge size="small" color="purple">
            {t("header.templatesBadge", { count: templatesCount })}
          </Badge>
          <Badge size="small" color="green">
            {t("header.featuresBadge", { count: featuresCount })}
          </Badge>
          <Button
            variant="secondary"
            size="small"
            isLoading={isLoading}
            onClick={onRefresh}
          >
            {t("header.refresh")}
          </Button>
        </div>
      </div>
    </Container>
  )
}
