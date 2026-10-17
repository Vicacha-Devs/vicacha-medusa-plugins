import {
  Badge,
  Button,
  Container,
  Heading,
  Select,
  StatusBadge,
  Table,
  Text,
} from "@medusajs/ui"
import React from "react"
import { useTranslation } from "react-i18next"
import { CHANNELS } from "./constants"

export interface TemplatesListSectionProps {
  templates: Array<Record<string, any>>
  channelFilter: string
  onChannelFilterChange: (channel: string) => void
  onSelectTemplate: (templateId: string) => void
  onClonePreset: (presetId: string) => void
  isCloning?: boolean
}

export const TemplatesListSection: React.FC<TemplatesListSectionProps> = ({
  templates,
  channelFilter,
  onChannelFilterChange,
  onSelectTemplate,
  onClonePreset,
  isCloning = false,
}) => {
  const { t } = useTranslation()

  const filteredTemplates = templates.filter((tpl) =>
    channelFilter === "all" ? true : tpl.channel === channelFilter
  )

  return (
    <Container className="divide-y p-0 lg:col-span-5">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{t("templates.title")}</Heading>
        <div className="w-40">
          <Select
            size="small"
            value={channelFilter}
            onValueChange={onChannelFilterChange}
          >
            <Select.Trigger>
              <Select.Value placeholder={t("templates.filterChannel")} />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="all">
                {t("templates.allChannels")}
              </Select.Item>
              {CHANNELS.map((ch) => (
                <Select.Item key={ch} value={ch}>
                  {ch.toUpperCase()}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>
      </div>

      <Table>
        <Table.Body>
          {filteredTemplates.map((tpl) => (
            <Table.Row key={tpl.id}>
              <Table.Cell className="py-3">
                <div className="flex items-center gap-x-2">
                  <Badge size="2xsmall" color="blue">
                    {tpl.channel}
                  </Badge>
                  <StatusBadge
                    color={tpl.source === "system" ? "grey" : "green"}
                  >
                    {tpl.source}
                  </StatusBadge>
                  <Text size="small" weight="plus">
                    {tpl.label}
                  </Text>
                </div>
                <Text className="text-ui-fg-subtle text-xs mt-1">
                  {tpl.name} &middot;{" "}
                  {t("templates.modeLabel", { mode: tpl.mode })}
                </Text>
              </Table.Cell>
              <Table.Cell className="py-3 text-right">
                <div className="flex items-center justify-end gap-x-2">
                  <Button
                    size="small"
                    variant="secondary"
                    onClick={() => onSelectTemplate(tpl.id)}
                  >
                    {t("templates.inspectPreview")}
                  </Button>
                  {tpl.source === "system" && (
                    <Button
                      size="small"
                      variant="primary"
                      isLoading={isCloning}
                      onClick={() => onClonePreset(tpl.id)}
                    >
                      {t("templates.cloneToDb")}
                    </Button>
                  )}
                </div>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </Container>
  )
}
