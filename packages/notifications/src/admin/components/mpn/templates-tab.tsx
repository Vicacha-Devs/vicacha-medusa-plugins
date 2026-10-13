import {
  Badge,
  Button,
  Container,
  Heading,
  Input,
  Label,
  Select,
  Text,
  Textarea,
} from "@medusajs/ui"
import React, { useState } from "react"
import { useTranslation } from "react-i18next"
import {
  useCreateOrCloneMpnTemplate,
  useRenderMpnTemplatePreview,
  useUpdateMpnTemplate,
} from "../../../hooks"
import { notificationsAdminSdk } from "../../../sdk"
import {
  BLOCK_TYPES,
  CHANNELS,
  CONTEXT_TYPES,
  SUPPORTED_LOCALES,
  type StatusBannerState,
} from "./constants"

interface TemplatesBuilderTabProps {
  templates: Array<Record<string, any>>
  onRefresh: () => Promise<void>
  onStatus: (status: StatusBannerState) => void
}

export const TemplatesBuilderTab: React.FC<TemplatesBuilderTabProps> = ({
  templates,
  onRefresh,
  onStatus,
}) => {
  const { t } = useTranslation()
  const [channelFilter, setChannelFilter] = useState<string>("all")
  const [selectedTemplate, setSelectedTemplate] = useState<Record<
    string,
    any
  > | null>(null)
  const [selectedBlocks, setSelectedBlocks] = useState<
    Array<Record<string, any>>
  >([])
  const [previewContextType, setPreviewContextType] = useState<string>("order")
  const [previewLocale, setPreviewLocale] = useState<string>("en")
  const [previewResult, setPreviewResult] = useState<Record<
    string,
    any
  > | null>(null)

  const renderPreviewMutation = useRenderMpnTemplatePreview()
  const cloneTemplateMutation = useCreateOrCloneMpnTemplate()
  const updateTemplateMutation = useUpdateMpnTemplate()

  const filteredTemplates = templates.filter((tpl) =>
    channelFilter === "all" ? true : tpl.channel === channelFilter
  )

  const handlePreviewTemplate = async (
    templateId: string,
    contextType: string,
    locale: string
  ) => {
    try {
      const data = await renderPreviewMutation.mutateAsync({
        template_id: templateId,
        context_type: contextType,
        locale,
        append_sms_consent_footer: true,
      })
      setPreviewResult(data.rendered || null)
    } catch {
      // Ignore preview errors
    }
  }

  const handleSelectTemplate = async (templateId: string) => {
    try {
      const data = await notificationsAdminSdk.getTemplate(templateId)
      setSelectedTemplate(data.template || null)
      setSelectedBlocks(data.flat_blocks || [])
      await handlePreviewTemplate(
        templateId,
        previewContextType,
        previewLocale
      )
    } catch {
      // Ignore selection error
    }
  }

  const handleClonePresetToDb = async (presetId: string) => {
    try {
      const data = await cloneTemplateMutation.mutateAsync({
        clone_from_preset_id: presetId,
      })
      onStatus({
        type: "success",
        text: t("messages.clonedPresetSuccess", {
          label: data.template?.label || presetId,
        }),
      })
      await onRefresh()
      if (data.template?.id) {
        await handleSelectTemplate(data.template.id)
      }
    } catch {
      onStatus({
        type: "error",
        text: t("messages.clonePresetError"),
      })
    }
  }

  const handleSaveDbTemplate = async () => {
    if (!selectedTemplate || selectedTemplate.source === "system") return
    try {
      await updateTemplateMutation.mutateAsync({
        id: selectedTemplate.id,
        payload: {
          label: selectedTemplate.label,
          subject: selectedTemplate.subject,
          mode: selectedTemplate.mode,
          raw_content: selectedTemplate.raw_content,
          meta_template_name: selectedTemplate.meta_template_name,
          blocks: selectedBlocks,
        },
      })
      onStatus({
        type: "success",
        text: t("messages.savedTemplateSuccess"),
      })
      await handlePreviewTemplate(
        selectedTemplate.id,
        previewContextType,
        previewLocale
      )
      await onRefresh()
    } catch {
      onStatus({ type: "error", text: t("messages.saveTemplateError") })
    }
  }

  const handleAddBlock = (type: string) => {
    const nextPos = selectedBlocks.length
    setSelectedBlocks([
      ...selectedBlocks,
      {
        id: `blk_${Date.now()}`,
        type,
        position: nextPos,
        parent_id: null,
        metadata:
          type === "row"
            ? { label: "Field", value: "{{data.total_formatted}}" }
            : type === "button" || type === "actions"
              ? { text: "View Order", url: "{{data.order_url}}" }
              : { text: "New content block ({{data.first_name}})" },
      },
    ])
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      <Container className="p-4 lg:col-span-5">
        <div className="mb-3 flex items-center justify-between">
          <Heading level="h2">{t("templates.title")}</Heading>
          <Select
            value={channelFilter}
            onValueChange={(v) => setChannelFilter(v)}
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

        <div className="flex flex-col gap-y-2">
          {filteredTemplates.map((tpl) => (
            <div
              key={tpl.id}
              className="flex items-center justify-between rounded border p-3"
            >
              <div>
                <div className="flex items-center gap-x-2">
                  <Badge color="blue">{tpl.channel}</Badge>
                  <Badge color={tpl.source === "system" ? "grey" : "green"}>
                    {tpl.source}
                  </Badge>
                  <Text className="font-medium">{tpl.label}</Text>
                </div>
                <Text className="text-ui-fg-subtle text-xs mt-1">
                  {tpl.name} &middot;{" "}
                  {t("templates.modeLabel", { mode: tpl.mode })}
                </Text>
              </div>
              <div className="flex items-center gap-x-2">
                <Button
                  size="small"
                  variant="secondary"
                  onClick={() => void handleSelectTemplate(tpl.id)}
                >
                  {t("templates.inspectPreview")}
                </Button>
                {tpl.source === "system" && (
                  <Button
                    size="small"
                    variant="primary"
                    onClick={() => void handleClonePresetToDb(tpl.id)}
                  >
                    {t("templates.cloneToDb")}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Container>

      <Container className="p-4 lg:col-span-7">
        {selectedTemplate ? (
          <div className="flex flex-col gap-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Heading level="h2">{selectedTemplate.label}</Heading>
                <Text className="text-ui-fg-subtle text-xs">
                  ID: {selectedTemplate.id} ({selectedTemplate.channel} /{" "}
                  {selectedTemplate.mode})
                </Text>
              </div>
              {selectedTemplate.source === "db" && (
                <Button
                  variant="primary"
                  onClick={() => void handleSaveDbTemplate()}
                >
                  {t("templates.saveButton")}
                </Button>
              )}
            </div>

            {selectedTemplate.source === "db" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t("templates.subjectLabel")}</Label>
                  <Input
                    value={selectedTemplate.subject || ""}
                    onChange={(e) =>
                      setSelectedTemplate({
                        ...selectedTemplate,
                        subject: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label>{t("templates.metaTemplateLabel")}</Label>
                  <Input
                    value={selectedTemplate.meta_template_name || ""}
                    onChange={(e) =>
                      setSelectedTemplate({
                        ...selectedTemplate,
                        meta_template_name: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            )}

            {selectedTemplate.mode === "raw" ? (
              <div>
                <Label>{t("templates.rawContentLabel")}</Label>
                <Textarea
                  rows={5}
                  value={selectedTemplate.raw_content || ""}
                  disabled={selectedTemplate.source === "system"}
                  onChange={(e) =>
                    setSelectedTemplate({
                      ...selectedTemplate,
                      raw_content: e.target.value,
                    })
                  }
                />
              </div>
            ) : (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <Label>
                    {t("templates.blockTreeLabel", {
                      count: selectedBlocks.length,
                    })}
                  </Label>
                  {selectedTemplate.source === "db" && (
                    <div className="flex flex-wrap gap-1">
                      {BLOCK_TYPES.slice(0, 6).map((bType) => (
                        <Button
                          key={bType}
                          size="small"
                          variant="secondary"
                          onClick={() => handleAddBlock(bType)}
                        >
                          + {bType}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-y-2">
                  {selectedBlocks.map((blk, idx) => (
                    <div
                      key={blk.id || idx}
                      className="flex items-center justify-between rounded border p-2"
                    >
                      <div className="flex items-center gap-x-2">
                        <Badge color="purple">{blk.type}</Badge>
                        <Text className="text-xs">
                          {blk.metadata?.text ||
                            blk.metadata?.label ||
                            blk.metadata?.arrayKey ||
                            blk.metadata?.variant ||
                            "—"}
                        </Text>
                      </div>
                      {selectedTemplate.source === "db" && (
                        <Button
                          size="small"
                          variant="transparent"
                          onClick={() =>
                            setSelectedBlocks(
                              selectedBlocks.filter((_, i) => i !== idx)
                            )
                          }
                        >
                          {t("templates.removeBlock")}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* LIVE MULTI-CHANNEL PREVIEW */}
            <div className="border-t pt-4">
              <div className="mb-2 flex items-center justify-between">
                <Heading level="h3">
                  {t("templates.previewTitle", {
                    locale: previewLocale.toUpperCase(),
                  })}
                </Heading>
                <div className="flex items-center gap-x-2">
                  <Select
                    value={previewContextType}
                    onValueChange={(val) => {
                      setPreviewContextType(val)
                      void handlePreviewTemplate(
                        selectedTemplate.id,
                        val,
                        previewLocale
                      )
                    }}
                  >
                    <Select.Trigger>
                      <Select.Value
                        placeholder={t("templates.contextPlaceholder")}
                      />
                    </Select.Trigger>
                    <Select.Content>
                      {CONTEXT_TYPES.map((ct) => (
                        <Select.Item key={ct} value={ct}>
                          {ct}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select>

                  <Select
                    value={previewLocale}
                    onValueChange={(loc) => {
                      setPreviewLocale(loc)
                      void handlePreviewTemplate(
                        selectedTemplate.id,
                        previewContextType,
                        loc
                      )
                    }}
                  >
                    <Select.Trigger>
                      <Select.Value
                        placeholder={t("templates.localePlaceholder")}
                      />
                    </Select.Trigger>
                    <Select.Content>
                      {SUPPORTED_LOCALES.map((loc) => (
                        <Select.Item key={loc} value={loc}>
                          {loc.toUpperCase()}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select>
                </div>
              </div>

              {previewResult && (
                <div className="rounded border bg-ui-bg-subtle p-4">
                  {previewResult.subject && (
                    <Text className="font-semibold mb-2">
                      {t("templates.subjectPrefix", {
                        subject: previewResult.subject,
                      })}
                    </Text>
                  )}
                  {previewResult.sms_options && (
                    <div className="mb-2 flex items-center gap-x-2">
                      <Badge color="green">
                        {t("templates.encodingBadge", {
                          encoding: previewResult.sms_options.encoding,
                        })}
                      </Badge>
                      <Badge color="blue">
                        {t("templates.segmentsBadge", {
                          segments: previewResult.sms_options.segments,
                          chars: previewResult.sms_options.character_count,
                        })}
                      </Badge>
                    </div>
                  )}
                  <pre className="whitespace-pre-wrap text-xs font-mono">
                    {previewResult.text}
                  </pre>
                  {previewResult.whatsapp_options?.buttons?.length > 0 && (
                    <div className="mt-3 flex gap-x-2">
                      {previewResult.whatsapp_options.buttons.map(
                        (btn: any) => (
                          <Badge key={btn.id} color="green">
                            {t("templates.waButtonPrefix", {
                              title: btn.title,
                            })}
                          </Badge>
                        )
                      )}
                    </div>
                  )}
                  {previewResult.telegram_options?.inline_keyboard?.length >
                    0 && (
                    <div className="mt-3 flex gap-x-2">
                      {previewResult.telegram_options.inline_keyboard
                        .flat()
                        .map((btn: any, i: number) => (
                          <Badge key={i} color="blue">
                            {t("templates.tgInlinePrefix", { text: btn.text })}
                          </Badge>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <Text className="text-ui-fg-subtle">
            {t("templates.emptySelection")}
          </Text>
        )}
      </Container>
    </div>
  )
}
