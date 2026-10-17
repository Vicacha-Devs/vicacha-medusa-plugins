import type { NotificationChannel, NotificationsPluginOptions, TemplateBlockNode } from "../types"
import {
  buildBlockTreeFromFlatBlocks,
  SYSTEM_TEMPLATE_PRESETS,
} from "../utils/system-presets"
import type { LoadedExternalTemplate } from "./external-templates"

export type TemplateListFilters = {
  channel?: NotificationChannel
  source?: "system" | "db" | "external"
  locale?: string
}

type SystemPreset = (typeof SYSTEM_TEMPLATE_PRESETS)[number]

export type ResolvedTemplate = {
  template: Record<string, any>
  blocks: TemplateBlockNode[]
  flatBlocks: Array<Record<string, any>>
}

/**
 * Lists read-only System Presets (`system_*`), optionally filtered by channel.
 */
export function listSystemTemplates(
  filters?: TemplateListFilters
): Array<Record<string, any>> {
  const results: Array<Record<string, any>> = []
  for (const preset of SYSTEM_TEMPLATE_PRESETS) {
    if (filters?.channel && preset.channel !== filters.channel) {
      continue
    }
    results.push({
      id: preset.id,
      name: preset.name,
      label: preset.label,
      description: preset.description,
      channel: preset.channel,
      mode: preset.mode,
      locale: filters?.locale || "en",
      subject: preset.subject ?? null,
      raw_content: preset.raw_content ?? null,
      variable_map: preset.variable_map ?? null,
      meta_template_name: preset.meta_template_name ?? null,
      meta_language_code: preset.meta_language_code ?? null,
      is_active: true,
      source: "system",
      default_event: preset.default_event,
      blocks_count: preset.blocks.length,
    })
  }
  return results
}

/**
 * Lists External Service templates (`external_*`): loaded block templates plus
 * raw templates exposed by `svc.getSystemTemplates()`.
 */
export function listExternalTemplates(
  externalTemplates: Map<string, LoadedExternalTemplate>,
  options: NotificationsPluginOptions,
  filters?: TemplateListFilters
): Array<Record<string, any>> {
  const results: Array<Record<string, any>> = []

  for (const extTpl of externalTemplates.values()) {
    if (filters?.channel && extTpl.channel !== filters.channel) continue
    results.push({
      id: extTpl.id,
      name: extTpl.name,
      label: extTpl.label,
      channel: extTpl.channel,
      mode: "blocks",
      locale: filters?.locale || "en",
      subject: extTpl.subject ?? null,
      source: "external",
      is_active: true,
      blocks_count: extTpl.blocks.length,
    })
  }

  const extServices = options.extend?.services || []
  for (const svc of extServices) {
    if (filters?.channel && svc.channel && svc.channel !== filters.channel)
      continue
    const templates = svc.getSystemTemplates ? svc.getSystemTemplates() : []
    for (const tpl of templates) {
      results.push({
        ...tpl,
        id: tpl.id.startsWith("external_") ? tpl.id : `external_${tpl.id}`,
        source: "external",
        mode: "raw",
        is_active: true,
      })
    }
  }

  return results
}

export function resolveExternalTemplate(
  extTpl: LoadedExternalTemplate
): ResolvedTemplate {
  return {
    template: {
      id: extTpl.id,
      name: extTpl.name,
      label: extTpl.label,
      channel: extTpl.channel,
      mode: "blocks",
      locale: "en",
      subject: extTpl.subject ?? null,
      translations: extTpl.translations,
      is_active: true,
      source: "external",
    },
    blocks: extTpl.blocks,
    flatBlocks: extTpl.blocks,
  }
}

export function resolveSystemPreset(preset: SystemPreset): ResolvedTemplate {
  return {
    template: {
      id: preset.id,
      name: preset.name,
      label: preset.label,
      description: preset.description,
      channel: preset.channel,
      mode: preset.mode,
      locale: "en",
      subject: preset.subject ?? null,
      raw_content: preset.raw_content ?? null,
      variable_map: preset.variable_map ?? null,
      meta_template_name: preset.meta_template_name ?? null,
      meta_language_code: preset.meta_language_code ?? null,
      is_active: true,
      source: "system",
    },
    blocks: buildBlockTreeFromFlatBlocks(preset.blocks),
    flatBlocks: preset.blocks,
  }
}

/**
 * Merges a template's own translations (falling back to `en`) over the base dictionary.
 */
export function mergeTemplateTranslations(
  baseTranslations: Record<string, any>,
  templateTranslations: unknown,
  locale: string
): Record<string, any> {
  if (!templateTranslations || typeof templateTranslations !== "object") {
    return baseTranslations
  }
  const dict = templateTranslations as Record<string, any>
  const tplLocaleDict = dict[locale] || dict.en || {}
  return {
    ...baseTranslations,
    ...tplLocaleDict,
    general: {
      ...(baseTranslations.general || {}),
      ...(tplLocaleDict.general || {}),
    },
  }
}
