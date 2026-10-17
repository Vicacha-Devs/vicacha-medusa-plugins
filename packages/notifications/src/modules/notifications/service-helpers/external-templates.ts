import { createRequire } from "node:module"
import type {
  BlockType,
  NotificationChannel,
  NotificationsPluginOptions,
  TemplateBlockNode,
} from "../types"

export type ModuleLogger = {
  info?: (...args: any[]) => void
  warn?: (...args: any[]) => void
  error?: (...args: any[]) => void
  debug?: (...args: any[]) => void
}

export interface LoadedExternalTemplate {
  id: string
  name: string
  label: string
  channel: NotificationChannel
  blocks: TemplateBlockNode[]
  translations?: Record<string, Record<string, any>>
  subject?: string | null
}

const nodeRequire = createRequire(import.meta.url)

/**
 * Loads declarative external templates configured under `options.extend.services[].templates`
 * via either `{ module }` or `{ path }` (`require` semantics supporting directory or extensionless paths).
 * Logs an error naming the template if loading or export validation fails (`codee-sh` v1.1.0 contract).
 */
export function loadExternalTemplates(
  options: NotificationsPluginOptions,
  logger?: ModuleLogger
): Map<string, LoadedExternalTemplate> {
  const registry = new Map<string, LoadedExternalTemplate>()
  const extServices = options.extend?.services || []
  for (const svc of extServices) {
    if (!Array.isArray(svc.templates)) continue
    const channel = (svc.channel ||
      (svc.id === "slack"
        ? "slack"
        : svc.id === "whatsapp"
          ? "whatsapp"
          : svc.id === "telegram"
            ? "telegram"
            : svc.id === "sms"
              ? "sms"
              : "email")) as NotificationChannel

    for (const tplConfig of svc.templates) {
      if (!tplConfig?.name) continue
      const templateId = tplConfig.name.startsWith("external_")
        ? tplConfig.name
        : `external_${tplConfig.name}`
      const sourceDesc = tplConfig.module
        ? "module option"
        : `"${tplConfig.path}"`

      try {
        const rawModule = tplConfig.module
          ? tplConfig.module
          : tplConfig.path
            ? nodeRequire(tplConfig.path)
            : null

        const exported = pickExternalTemplateExports(rawModule)
        if (!exported) {
          logger?.error?.(
            `External template "${templateId}" from ${sourceDesc} exports neither templateBlocks nor translations`
          )
          continue
        }

        const rawBlocks = Array.isArray(exported.templateBlocks)
          ? exported.templateBlocks
          : []
        const normalizedBlocks: TemplateBlockNode[] = rawBlocks.map(
          (blk: any, idx: number) => ({
            id: String(blk.id || `blk_${idx + 1}`),
            type: (blk.type || "text") as BlockType,
            position: Number(blk.position ?? idx),
            parent_id: blk.parent_id ?? null,
            metadata: blk.metadata || blk.props || {},
            children: Array.isArray(blk.children) ? blk.children : undefined,
          })
        )

        registry.set(templateId, {
          id: templateId,
          name: templateId,
          label: exported.label || templateId,
          channel,
          blocks: normalizedBlocks,
          translations: exported.translations,
          subject: exported.subject ?? null,
        })

        logger?.info?.(
          `Custom template "${templateId}" registered for handler "${svc.id}"`
        )
      } catch (err: any) {
        logger?.error?.(
          `Failed to load external template "${templateId}" from ${sourceDesc}: ${err?.message || "Unknown error"}`
        )
      }
    }
  }

  return registry
}

function pickExternalTemplateExports(rawModule: any): Record<string, any> | null {
  const candidates = [rawModule, rawModule?.default]
  return (
    candidates.find(
      (c) =>
        c &&
        typeof c === "object" &&
        (Array.isArray(c.templateBlocks) ||
          (c.translations && typeof c.translations === "object"))
    ) || null
  )
}
