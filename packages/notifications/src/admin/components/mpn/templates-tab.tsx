import { Toaster, toast } from "@medusajs/ui"
import React, { useState } from "react"
import { useTranslation } from "react-i18next"
import {
  useCreateOrCloneMpnTemplate,
  useRenderMpnTemplatePreview,
  useUpdateMpnTemplate,
} from "../../../hooks"
import { notificationsAdminSdk } from "../../../sdk"
import type { StatusBannerState } from "./constants"
import { TemplateEditorSection } from "./template-editor-section"
import { TemplatesListSection } from "./templates-list-section"

export interface TemplatesBuilderTabProps {
  templates: Array<Record<string, any>>
  onRefresh: () => Promise<void>
  onStatus?: (status: StatusBannerState) => void
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
      const msg = t("messages.clonedPresetSuccess", {
        label: data.template?.label || presetId,
      })
      toast.success(msg)
      onStatus?.({ type: "success", text: msg })
      await onRefresh()
      if (data.template?.id) {
        await handleSelectTemplate(data.template.id)
      }
    } catch {
      const msg = t("messages.clonePresetError")
      toast.error(msg)
      onStatus?.({ type: "error", text: msg })
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
      const msg = t("messages.savedTemplateSuccess")
      toast.success(msg)
      onStatus?.({ type: "success", text: msg })
      await handlePreviewTemplate(
        selectedTemplate.id,
        previewContextType,
        previewLocale
      )
      await onRefresh()
    } catch {
      const msg = t("messages.saveTemplateError")
      toast.error(msg)
      onStatus?.({ type: "error", text: msg })
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
      <Toaster />
      <TemplatesListSection
        templates={templates}
        channelFilter={channelFilter}
        onChannelFilterChange={setChannelFilter}
        onSelectTemplate={(id) => void handleSelectTemplate(id)}
        onClonePreset={(id) => void handleClonePresetToDb(id)}
        isCloning={cloneTemplateMutation.isPending}
      />

      <TemplateEditorSection
        selectedTemplate={selectedTemplate}
        selectedBlocks={selectedBlocks}
        previewContextType={previewContextType}
        previewLocale={previewLocale}
        previewResult={previewResult}
        isSaving={updateTemplateMutation.isPending}
        onTemplateChange={setSelectedTemplate}
        onAddBlock={handleAddBlock}
        onRemoveBlock={(idx) =>
          setSelectedBlocks(selectedBlocks.filter((_, i) => i !== idx))
        }
        onSaveTemplate={() => void handleSaveDbTemplate()}
        onContextChange={(val) => {
          setPreviewContextType(val)
          if (selectedTemplate?.id) {
            void handlePreviewTemplate(selectedTemplate.id, val, previewLocale)
          }
        }}
        onLocaleChange={(loc) => {
          setPreviewLocale(loc)
          if (selectedTemplate?.id) {
            void handlePreviewTemplate(
              selectedTemplate.id,
              previewContextType,
              loc
            )
          }
        }}
      />
    </div>
  )
}
