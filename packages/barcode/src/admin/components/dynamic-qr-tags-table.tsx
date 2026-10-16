import {
  Badge,
  Button,
  Container,
  Heading,
  StatusBadge,
  Table,
  Text,
} from "@medusajs/ui"
import { useTranslation } from "react-i18next"

import type { BarcodeSymbology } from "../../modules/barcode/types"
import { BarcodeImage } from "../../ui"
import type { TagFormState } from "../hooks/use-barcode-studio"
import { DynamicQrTagCreateSection } from "./dynamic-qr-tag-form"

export interface DynamicQrTagsTabProps {
  form: TagFormState
  onFormChange: React.Dispatch<React.SetStateAction<TagFormState>>
  tags: Array<Record<string, unknown>>
  onCreateTag: () => void
  onDeleteTag: (id: string) => void
  onOpenCreateDrawer?: () => void
}

export const DynamicQrTagsTableSection = ({
  tags,
  onDeleteTag,
  onOpenCreateDrawer,
}: Pick<
  DynamicQrTagsTabProps,
  "tags" | "onDeleteTag" | "onOpenCreateDrawer"
>) => {
  const { t } = useTranslation()

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">
          {t("tagsTab.listTitle", { count: tags.length })}
        </Heading>
        {onOpenCreateDrawer ? (
          <Button variant="secondary" size="small" onClick={onOpenCreateDrawer}>
            {t("tagsTab.generateButton")}
          </Button>
        ) : null}
      </div>

      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>{t("widget.codeLabel")}</Table.HeaderCell>
            <Table.HeaderCell>{t("widget.actionLabel")}</Table.HeaderCell>
            <Table.HeaderCell>{t("widget.scansLabel")}</Table.HeaderCell>
            <Table.HeaderCell />
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {tags.map((tag) => (
            <Table.Row key={String(tag.id)}>
              <Table.Cell>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold">
                      {String(tag.code)}
                    </span>
                    <Badge size="xsmall" color="purple">
                      {String(tag.symbology)}
                    </Badge>
                  </div>
                  {tag.hmac_signature ? (
                    <Text size="xsmall" className="font-mono text-ui-fg-subtle">
                      {t("tagsTab.hmacLabel", {
                        signature: String(tag.hmac_signature).slice(0, 16),
                      })}
                    </Text>
                  ) : null}
                </div>
              </Table.Cell>
              <Table.Cell>
                <StatusBadge color="green">
                  {String(tag.scan_action)}
                </StatusBadge>
              </Table.Cell>
              <Table.Cell>
                <Text size="small">
                  {t("tagsTab.tagMeta", {
                    target: String(tag.target_id),
                    scans: String(tag.scan_count ?? 0),
                  })}
                </Text>
              </Table.Cell>
              <Table.Cell>
                <div className="flex items-center justify-end gap-2">
                  {typeof tag.svg_markup === "string" ? (
                    <BarcodeImage
                      code={String(tag.code)}
                      symbology={tag.symbology as BarcodeSymbology}
                      svgMarkup={tag.svg_markup}
                      width={80}
                      height={44}
                    />
                  ) : null}
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => onDeleteTag(String(tag.id))}
                  >
                    {t("tagsTab.deleteButton")}
                  </Button>
                </div>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </Container>
  )
}

export const DynamicQrTagsTab = (props: DynamicQrTagsTabProps) => {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <DynamicQrTagCreateSection
        form={props.form}
        onFormChange={props.onFormChange}
        onCreateTag={props.onCreateTag}
      />
      <DynamicQrTagsTableSection
        tags={props.tags}
        onDeleteTag={props.onDeleteTag}
        onOpenCreateDrawer={props.onOpenCreateDrawer}
      />
    </div>
  )
}
