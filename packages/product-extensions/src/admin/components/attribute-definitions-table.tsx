import * as React from "react"
import {
  Badge,
  Button,
  Container,
  Heading,
  Input,
  Label,
  Select,
  Switch,
  Table,
  Text,
} from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import type {
  AttributeDefinitionDTO,
  AttributeValueType,
  UnitCode,
  UnitFamily,
} from "../../modules/product-ext/types"
import type { AttributeFormState } from "../hooks/use-product-ext-studio"
import { ATTRIBUTE_TYPES, UNIT_CODES, UNIT_FAMILIES } from "./attribute-create-form"

export interface AttributeDefinitionsTableProps {
  attributes: AttributeDefinitionDTO[]
  isBusy: boolean
  onDelete: (id: string) => void
  onCreateClick?: () => void
}

export const AttributeDefinitionsTable: React.FC<AttributeDefinitionsTableProps> = ({
  attributes,
  isBusy,
  onDelete,
  onCreateClick,
}) => {
  const { t } = useTranslation()

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">{t("attributesTab.listTitle", { count: attributes.length })}</Heading>
          <Text size="small" className="text-ui-fg-subtle">{t("attributesTab.createTitle")}</Text>
        </div>
        {onCreateClick && (
          <Button size="small" variant="secondary" onClick={onCreateClick}>
            {t("attributesTab.createButton")}
          </Button>
        )}
      </div>
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>{t("attributesTab.labelField")}</Table.HeaderCell>
            <Table.HeaderCell>{t("attributesTab.keyField")}</Table.HeaderCell>
            <Table.HeaderCell>{t("attributesTab.typeField")}</Table.HeaderCell>
            <Table.HeaderCell>{t("attributesTab.unitFamilyField")}</Table.HeaderCell>
            <Table.HeaderCell className="text-right" />
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {attributes.map((attr) => (
            <Table.Row key={attr.id}>
              <Table.Cell className="font-medium">{attr.label}</Table.Cell>
              <Table.Cell className="text-ui-fg-subtle">{attr.key}</Table.Cell>
              <Table.Cell><Badge size="small" color="blue">{attr.type}</Badge></Table.Cell>
              <Table.Cell>
                {attr.unit_family ? (
                  <Badge size="small" color="purple">{attr.unit_family} ({attr.default_unit ?? "SI"})</Badge>
                ) : (
                  <Text size="small" className="text-ui-fg-muted">—</Text>
                )}
              </Table.Cell>
              <Table.Cell className="text-right">
                <Button variant="danger" size="small" disabled={isBusy} onClick={() => onDelete(attr.id)}>
                  {t("attributesTab.deleteButton")}
                </Button>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </Container>
  )
}

export interface AttributeDefinitionsTabProps {
  form: AttributeFormState
  onFormChange: React.Dispatch<React.SetStateAction<AttributeFormState>>
  attributes: AttributeDefinitionDTO[]
  isBusy: boolean
  onCreate: () => void
  onDelete: (id: string) => void
  onOpenCreateDrawer?: () => void
}

export const AttributeDefinitionsTab: React.FC<AttributeDefinitionsTabProps> = ({
  form,
  onFormChange,
  attributes,
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
          <Heading level="h2">{t("attributesTab.createTitle")}</Heading>
          <Button variant="primary" size="small" isLoading={isBusy} onClick={onCreate}>
            {t("attributesTab.createButton")}
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-4 px-6 py-4 md:grid-cols-3">
          <div>
            <Label size="small">{t("attributesTab.labelField")}</Label>
            <Input
              placeholder={t("attributesTab.labelPlaceholder")}
              value={form.label}
              onChange={(e) => onFormChange((p) => ({ ...p, label: e.target.value }))}
            />
          </div>
          <div>
            <Label size="small">{t("attributesTab.keyField")}</Label>
            <Input
              placeholder={t("attributesTab.keyPlaceholder")}
              value={form.key}
              onChange={(e) => onFormChange((p) => ({ ...p, key: e.target.value }))}
            />
          </div>
          <div>
            <Label size="small">{t("attributesTab.typeField")}</Label>
            <Select value={form.type} onValueChange={(v) => onFormChange((p) => ({ ...p, type: v as AttributeValueType }))}>
              <Select.Trigger><Select.Value /></Select.Trigger>
              <Select.Content>
                {ATTRIBUTE_TYPES.map((opt) => <Select.Item key={opt} value={opt}>{opt}</Select.Item>)}
              </Select.Content>
            </Select>
          </div>
          <div>
            <Label size="small">{t("attributesTab.unitFamilyField")}</Label>
            <Select
              value={form.unit_family || "none"}
              onValueChange={(v) => onFormChange((p) => ({ ...p, unit_family: (v === "none" ? "" : v) as UnitFamily | "" }))}
            >
              <Select.Trigger><Select.Value /></Select.Trigger>
              <Select.Content>
                <Select.Item value="none">—</Select.Item>
                {UNIT_FAMILIES.map((uf) => <Select.Item key={uf} value={uf}>{uf}</Select.Item>)}
              </Select.Content>
            </Select>
          </div>
          <div>
            <Label size="small">{t("attributesTab.defaultUnitField")}</Label>
            <Select
              value={form.default_unit || "none"}
              onValueChange={(v) => onFormChange((p) => ({ ...p, default_unit: (v === "none" ? "" : v) as UnitCode | "" }))}
            >
              <Select.Trigger><Select.Value /></Select.Trigger>
              <Select.Content>
                <Select.Item value="none">—</Select.Item>
                {UNIT_CODES.map((uc) => <Select.Item key={uc} value={uc}>{uc}</Select.Item>)}
              </Select.Content>
            </Select>
          </div>
          <div>
            <Label size="small">{t("attributesTab.optionsCsvField")}</Label>
            <Input
              placeholder={t("attributesTab.optionsCsvPlaceholder")}
              value={form.options_csv}
              onChange={(e) => onFormChange((p) => ({ ...p, options_csv: e.target.value }))}
            />
          </div>
        </div>
        <div className="flex items-center gap-x-6 px-6 py-4">
          <div className="flex items-center gap-x-2">
            <Switch checked={form.is_filterable} onCheckedChange={(c) => onFormChange((p) => ({ ...p, is_filterable: c }))} />
            <Label size="small">{t("attributesTab.filterableSwitch")}</Label>
          </div>
          <div className="flex items-center gap-x-2">
            <Switch checked={form.is_global} onCheckedChange={(c) => onFormChange((p) => ({ ...p, is_global: c }))} />
            <Label size="small">{t("attributesTab.globalSwitch")}</Label>
          </div>
        </div>
      </Container>
      <AttributeDefinitionsTable attributes={attributes} isBusy={isBusy} onDelete={onDelete} onCreateClick={onOpenCreateDrawer} />
    </div>
  )
}
