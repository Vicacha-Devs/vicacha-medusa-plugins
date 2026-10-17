import { SectionRow } from "@medusajs/dashboard/components"
import {
  Badge,
  Button,
  Container,
  Heading,
  Input,
  Label,
  Text,
  Textarea,
} from "@medusajs/ui"
import React from "react"
import { useTranslation } from "react-i18next"
import { BLOCK_TYPES } from "./constants"
import { TemplatePreviewSection } from "./template-preview-section"

export interface TemplateEditorSectionProps {
  selectedTemplate: Record<string, any> | null
  selectedBlocks: Array<Record<string, any>>
  previewContextType: string
  previewLocale: string
  previewResult: Record<string, any> | null
  isSaving?: boolean
  onTemplateChange: (nextTemplate: Record<string, any>) => void
  onAddBlock: (blockType: string) => void
  onRemoveBlock: (index: number) => void
  onSaveTemplate: () => void
  onContextChange: (contextType: string) => void
  onLocaleChange: (locale: string) => void
}

export const TemplateEditorSection: React.FC<TemplateEditorSectionProps> = ({
  selectedTemplate,
  selectedBlocks,
  previewContextType,
  previewLocale,
  previewResult,
  isSaving = false,
  onTemplateChange,
  onAddBlock,
  onRemoveBlock,
  onSaveTemplate,
  onContextChange,
  onLocaleChange,
}) => {
  const { t } = useTranslation()

  return (
    <Container className="divide-y p-0 lg:col-span-7">
      {selectedTemplate ? (
        <>
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <Heading level="h2">{selectedTemplate.label}</Heading>
              <Text className="text-ui-fg-subtle text-xs mt-1">
                ID: {selectedTemplate.id} ({selectedTemplate.channel} /{" "}
                {selectedTemplate.mode})
              </Text>
            </div>
            {selectedTemplate.source === "db" && (
              <Button
                size="small"
                variant="primary"
                isLoading={isSaving}
                onClick={onSaveTemplate}
              >
                {t("templates.saveButton")}
              </Button>
            )}
          </div>

          <SectionRow
            title={t("mappings.channelLabel")}
            value={
              <Badge size="2xsmall" color="blue">
                {selectedTemplate.channel}
              </Badge>
            }
          />

          {selectedTemplate.source === "db" && (
            <div className="grid grid-cols-1 gap-4 px-6 py-4 md:grid-cols-2">
              <div className="flex flex-col gap-y-2">
                <Label size="small">{t("templates.subjectLabel")}</Label>
                <Input
                  size="small"
                  value={selectedTemplate.subject || ""}
                  onChange={(e) =>
                    onTemplateChange({
                      ...selectedTemplate,
                      subject: e.target.value,
                    })
                  }
                />
              </div>
              <div className="flex flex-col gap-y-2">
                <Label size="small">{t("templates.metaTemplateLabel")}</Label>
                <Input
                  size="small"
                  value={selectedTemplate.meta_template_name || ""}
                  onChange={(e) =>
                    onTemplateChange({
                      ...selectedTemplate,
                      meta_template_name: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          )}

          <div className="px-6 py-4">
            {selectedTemplate.mode === "raw" ? (
              <div className="flex flex-col gap-y-2">
                <Label size="small">{t("templates.rawContentLabel")}</Label>
                <Textarea
                  rows={5}
                  value={selectedTemplate.raw_content || ""}
                  disabled={selectedTemplate.source === "system"}
                  onChange={(e) =>
                    onTemplateChange({
                      ...selectedTemplate,
                      raw_content: e.target.value,
                    })
                  }
                />
              </div>
            ) : (
              <div>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <Label size="small">
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
                          onClick={() => onAddBlock(bType)}
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
                      className="flex items-center justify-between rounded border border-ui-border-base p-2.5"
                    >
                      <div className="flex items-center gap-x-2">
                        <Badge size="2xsmall" color="purple">
                          {blk.type}
                        </Badge>
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
                          onClick={() => onRemoveBlock(idx)}
                        >
                          {t("templates.removeBlock")}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <TemplatePreviewSection
            templateId={selectedTemplate.id}
            previewContextType={previewContextType}
            previewLocale={previewLocale}
            previewResult={previewResult}
            onContextChange={onContextChange}
            onLocaleChange={onLocaleChange}
          />
        </>
      ) : (
        <div className="px-6 py-8">
          <Text className="text-ui-fg-subtle">
            {t("templates.emptySelection")}
          </Text>
        </div>
      )}
    </Container>
  )
}
