import {
  Badge,
  Heading,
  Select,
  Text,
} from "@medusajs/ui"
import React from "react"
import { useTranslation } from "react-i18next"
import { CONTEXT_TYPES, SUPPORTED_LOCALES } from "./constants"

export interface TemplatePreviewSectionProps {
  templateId: string
  previewContextType: string
  previewLocale: string
  previewResult: Record<string, any> | null
  onContextChange: (contextType: string) => void
  onLocaleChange: (locale: string) => void
}

export const TemplatePreviewSection: React.FC<TemplatePreviewSectionProps> = ({
  previewContextType,
  previewLocale,
  previewResult,
  onContextChange,
  onLocaleChange,
}) => {
  const { t } = useTranslation()

  return (
    <div className="px-6 py-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Heading level="h3">
          {t("templates.previewTitle", {
            locale: previewLocale.toUpperCase(),
          })}
        </Heading>
        <div className="flex items-center gap-x-2">
          <Select
            size="small"
            value={previewContextType}
            onValueChange={onContextChange}
          >
            <Select.Trigger>
              <Select.Value placeholder={t("templates.contextPlaceholder")} />
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
            size="small"
            value={previewLocale}
            onValueChange={onLocaleChange}
          >
            <Select.Trigger>
              <Select.Value placeholder={t("templates.localePlaceholder")} />
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
        <div className="rounded border border-ui-border-base bg-ui-bg-subtle p-4">
          {previewResult.subject && (
            <Text className="font-semibold mb-2">
              {t("templates.subjectPrefix", {
                subject: previewResult.subject,
              })}
            </Text>
          )}
          {previewResult.sms_options && (
            <div className="mb-2 flex items-center gap-x-2">
              <Badge size="2xsmall" color="green">
                {t("templates.encodingBadge", {
                  encoding: previewResult.sms_options.encoding,
                })}
              </Badge>
              <Badge size="2xsmall" color="blue">
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
              {previewResult.whatsapp_options.buttons.map((btn: any) => (
                <Badge key={btn.id} size="2xsmall" color="green">
                  {t("templates.waButtonPrefix", {
                    title: btn.title,
                  })}
                </Badge>
              ))}
            </div>
          )}
          {previewResult.telegram_options?.inline_keyboard?.length > 0 && (
            <div className="mt-3 flex gap-x-2">
              {previewResult.telegram_options.inline_keyboard
                .flat()
                .map((btn: any, i: number) => (
                  <Badge key={i} size="2xsmall" color="blue">
                    {t("templates.tgInlinePrefix", { text: btn.text })}
                  </Badge>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
