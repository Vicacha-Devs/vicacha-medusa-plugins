import * as React from "react"
import {
  Badge,
  Button,
  Container,
  Heading,
  Input,
  Label,
  Select,
  Table,
  Text,
} from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import type { ProductFeatureDTO } from "../../modules/product-ext/types"
import type { FeatureFormState } from "../hooks/use-product-ext-studio"
import { FEATURE_BADGE_COLORS } from "./feature-create-form"

export interface FeatureBadgesTableProps {
  features: ProductFeatureDTO[]
  isBusy: boolean
  onDelete: (id: string) => void
  onCreateClick?: () => void
}

export const FeatureBadgesTable: React.FC<FeatureBadgesTableProps> = ({
  features,
  isBusy,
  onDelete,
  onCreateClick,
}) => {
  const { t } = useTranslation()

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">
            {t("featuresTab.listTitle", { count: features.length })}
          </Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {t("featuresTab.createTitle")}
          </Text>
        </div>
        {onCreateClick && (
          <Button size="small" variant="secondary" onClick={onCreateClick}>
            {t("featuresTab.createButton")}
          </Button>
        )}
      </div>
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>{t("featuresTab.titleField")}</Table.HeaderCell>
            <Table.HeaderCell>Code</Table.HeaderCell>
            <Table.HeaderCell>
              {t("featuresTab.subtitleField")}
            </Table.HeaderCell>
            <Table.HeaderCell className="text-right" />
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {features.map((feat) => (
            <Table.Row key={feat.id}>
              <Table.Cell className="font-medium">{feat.title}</Table.Cell>
              <Table.Cell>
                <Badge size="small" color="green">
                  {feat.code}
                </Badge>
              </Table.Cell>
              <Table.Cell className="text-ui-fg-subtle">
                {feat.subtitle || "—"}
              </Table.Cell>
              <Table.Cell className="text-right">
                <Button
                  variant="danger"
                  size="small"
                  disabled={isBusy}
                  onClick={() => onDelete(feat.id)}
                >
                  {t("featuresTab.deleteButton")}
                </Button>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </Container>
  )
}

export interface FeatureBadgesTabProps {
  form: FeatureFormState
  onFormChange: React.Dispatch<React.SetStateAction<FeatureFormState>>
  features: ProductFeatureDTO[]
  isBusy: boolean
  onCreate: () => void
  onDelete: (id: string) => void
  onOpenCreateDrawer?: () => void
}

export const FeatureBadgesTab: React.FC<FeatureBadgesTabProps> = ({
  form,
  onFormChange,
  features,
  isBusy,
  onCreate,
  onDelete,
  onOpenCreateDrawer,
}) => {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-y-4">
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h2">{t("featuresTab.createTitle")}</Heading>
          <Button
            variant="primary"
            size="small"
            isLoading={isBusy}
            onClick={onCreate}
          >
            {t("featuresTab.createButton")}
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-4 px-6 py-4 md:grid-cols-4">
          <div>
            <Label size="small">{t("featuresTab.titleField")}</Label>
            <Input
              placeholder={t("featuresTab.titlePlaceholder")}
              value={form.title}
              onChange={(e) =>
                onFormChange((prev) => ({ ...prev, title: e.target.value }))
              }
            />
          </div>
          <div>
            <Label size="small">{t("featuresTab.subtitleField")}</Label>
            <Input
              placeholder={t("featuresTab.subtitlePlaceholder")}
              value={form.subtitle}
              onChange={(e) =>
                onFormChange((prev) => ({ ...prev, subtitle: e.target.value }))
              }
            />
          </div>
          <div>
            <Label size="small">{t("featuresTab.iconUrlField")}</Label>
            <Input
              placeholder={t("featuresTab.iconUrlPlaceholder")}
              value={form.icon_url}
              onChange={(e) =>
                onFormChange((prev) => ({ ...prev, icon_url: e.target.value }))
              }
            />
          </div>
          <div>
            <Label size="small">{t("featuresTab.badgeColorField")}</Label>
            <Select
              value={form.badge_color || "blue"}
              onValueChange={(val) =>
                onFormChange((prev) => ({
                  ...prev,
                  badge_color: val,
                }))
              }
            >
              <Select.Trigger>
                <Select.Value
                  placeholder={t("featuresTab.badgeColorPlaceholder")}
                />
              </Select.Trigger>
              <Select.Content>
                {FEATURE_BADGE_COLORS.map((color) => (
                  <Select.Item key={color} value={color}>
                    {color}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </div>
        </div>
      </Container>

      <FeatureBadgesTable
        features={features}
        isBusy={isBusy}
        onDelete={onDelete}
        onCreateClick={onOpenCreateDrawer}
      />
    </div>
  )
}
