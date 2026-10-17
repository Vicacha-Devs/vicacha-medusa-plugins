import * as React from "react"
import {
  Badge,
  Button,
  Container,
  Heading,
  Input,
  Label,
  Table,
  Text,
  Textarea,
} from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import type { AttributeTemplateDTO } from "../../modules/product-ext/types"
import type { TemplateFormState } from "../hooks/use-product-ext-studio"

export interface TemplatesTableProps {
  templates: AttributeTemplateDTO[]
  isBusy: boolean
  onDelete: (id: string) => void
  onCreateClick?: () => void
}

export const TemplatesTable: React.FC<TemplatesTableProps> = ({
  templates,
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
            {t("templatesTab.listTitle", { count: templates.length })}
          </Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {t("templatesTab.createTitle")}
          </Text>
        </div>
        {onCreateClick && (
          <Button size="small" variant="secondary" onClick={onCreateClick}>
            {t("templatesTab.createButton")}
          </Button>
        )}
      </div>
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>{t("templatesTab.nameField")}</Table.HeaderCell>
            <Table.HeaderCell>Code</Table.HeaderCell>
            <Table.HeaderCell>{t("templatesTab.attributeKeysField")}</Table.HeaderCell>
            <Table.HeaderCell className="text-right" />
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {templates.map((tpl) => (
            <Table.Row key={tpl.id}>
              <Table.Cell className="font-medium">{tpl.name}</Table.Cell>
              <Table.Cell>
                <Badge size="small" color="purple">{tpl.code}</Badge>
              </Table.Cell>
              <Table.Cell className="text-ui-fg-subtle">
                {t("templatesTab.summaryStats", {
                  attributesCount: tpl.attribute_keys.length,
                  nodesCount: Object.keys(tpl.content_tree?.nodes ?? {}).length,
                })}
              </Table.Cell>
              <Table.Cell className="text-right">
                <Button
                  variant="danger"
                  size="small"
                  disabled={isBusy}
                  onClick={() => onDelete(tpl.id)}
                >
                  {t("templatesTab.deleteButton")}
                </Button>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </Container>
  )
}

export interface TemplatesBuilderTabProps {
  form: TemplateFormState
  onFormChange: React.Dispatch<React.SetStateAction<TemplateFormState>>
  templates: AttributeTemplateDTO[]
  isBusy: boolean
  onCreate: () => void
  onDelete: (id: string) => void
  onOpenCreateDrawer?: () => void
}

export const TemplatesBuilderTab: React.FC<TemplatesBuilderTabProps> = ({
  form,
  onFormChange,
  templates,
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
          <Heading level="h2">{t("templatesTab.createTitle")}</Heading>
          <Button variant="primary" size="small" isLoading={isBusy} onClick={onCreate}>
            {t("templatesTab.createButton")}
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-4 px-6 py-4 md:grid-cols-3">
          <div>
            <Label size="small">{t("templatesTab.nameField")}</Label>
            <Input
              placeholder={t("templatesTab.namePlaceholder")}
              value={form.name}
              onChange={(e) => onFormChange((p) => ({ ...p, name: e.target.value }))}
            />
          </div>
          <div>
            <Label size="small">{t("templatesTab.categoryIdsField")}</Label>
            <Input
              placeholder={t("templatesTab.categoryIdsPlaceholder")}
              value={form.category_ids_csv}
              onChange={(e) => onFormChange((p) => ({ ...p, category_ids_csv: e.target.value }))}
            />
          </div>
          <div>
            <Label size="small">{t("templatesTab.attributeKeysField")}</Label>
            <Input
              placeholder={t("templatesTab.attributeKeysPlaceholder")}
              value={form.attribute_keys_csv}
              onChange={(e) => onFormChange((p) => ({ ...p, attribute_keys_csv: e.target.value }))}
            />
          </div>
          <div>
            <Label size="small">{t("templatesTab.sectionTitleField")}</Label>
            <Input
              value={form.section_title}
              onChange={(e) => onFormChange((p) => ({ ...p, section_title: e.target.value }))}
            />
          </div>
          <div>
            <Label size="small">{t("templatesTab.itemTitleField")}</Label>
            <Input
              value={form.item_title}
              onChange={(e) => onFormChange((p) => ({ ...p, item_title: e.target.value }))}
            />
          </div>
          <div>
            <Label size="small">{t("templatesTab.markdownField")}</Label>
            <Textarea
              rows={2}
              value={form.item_markdown}
              onChange={(e) => onFormChange((p) => ({ ...p, item_markdown: e.target.value }))}
            />
          </div>
        </div>
      </Container>

      <TemplatesTable
        templates={templates}
        isBusy={isBusy}
        onDelete={onDelete}
        onCreateClick={onOpenCreateDrawer}
      />
    </div>
  )
}
