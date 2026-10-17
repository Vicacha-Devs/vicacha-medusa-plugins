import { normalizeLocale } from "../i18n"
import type { BlockType } from "../types"
import type { getSystemPresetById } from "../utils/system-presets"

type SystemPreset = NonNullable<ReturnType<typeof getSystemPresetById>>

export type CreateBlockRow = (
  data: Record<string, any>
) => Promise<Record<string, any>>

/**
 * Builds the editable `mpn_template` row for a cloned System Preset.
 */
export function buildClonedTemplateRow(
  preset: SystemPreset,
  overrides?: { name?: string; label?: string; locale?: string }
) {
  return {
    name: overrides?.name || `${preset.name}-custom`,
    label: overrides?.label || `${preset.label} (Custom)`,
    description: preset.description,
    channel: preset.channel,
    mode: preset.mode,
    locale: normalizeLocale(overrides?.locale || "en"),
    subject: preset.subject ?? null,
    raw_content: preset.raw_content ?? null,
    variable_map: preset.variable_map ?? null,
    meta_template_name: preset.meta_template_name ?? null,
    meta_language_code: preset.meta_language_code ?? null,
    source_preset_id: preset.id,
    is_active: true,
  }
}

/**
 * Persists a preset's block tree, mapping preset block IDs to new DB IDs
 * while preserving `parent_id` relationships (roots first, then children).
 */
export async function createPresetBlocks(
  createBlock: CreateBlockRow,
  templateId: string,
  presetBlocks: SystemPreset["blocks"]
): Promise<Array<Record<string, any>>> {
  const oldToNewId = new Map<string, string>()
  const created: Array<Record<string, any>> = []

  const sortedBlocks = [...presetBlocks].sort((a, b) => a.position - b.position)

  for (const pass of [
    sortedBlocks.filter((b) => !b.parent_id),
    sortedBlocks.filter((b) => Boolean(b.parent_id)),
  ]) {
    for (const blk of pass) {
      const mappedParentId = blk.parent_id
        ? oldToNewId.get(blk.parent_id) || null
        : null
      const row = await createBlock({
        template_id: templateId,
        type: blk.type,
        position: blk.position,
        parent_id: mappedParentId,
        metadata: blk.metadata,
      })
      oldToNewId.set(blk.id, row.id)
      created.push(row)
    }
  }

  return created
}

export type BlockInput = {
  id?: string
  type?: BlockType
  position?: number
  parent_id?: string | null
  metadata?: Record<string, any>
}

/**
 * Persists client-submitted blocks (roots first, then children), remapping
 * client-side parent IDs to the newly created DB IDs.
 */
export async function createBlocksFromInput(
  createBlock: CreateBlockRow,
  templateId: string,
  blocks: BlockInput[]
): Promise<Array<Record<string, any>>> {
  const clientIdToDbId = new Map<string, string>()
  const created: Array<Record<string, any>> = []

  for (const pass of [
    blocks.filter((b) => !b.parent_id),
    blocks.filter((b) => Boolean(b.parent_id)),
  ]) {
    for (let i = 0; i < pass.length; i++) {
      const blk = pass[i]
      const parentId = blk.parent_id
        ? clientIdToDbId.get(blk.parent_id) || blk.parent_id
        : null
      const row = await createBlock({
        template_id: templateId,
        type: blk.type || "text",
        position: blk.position ?? i,
        parent_id: parentId,
        metadata: blk.metadata ?? {},
      })
      if (blk.id) clientIdToDbId.set(blk.id, row.id)
      created.push(row)
    }
  }

  return created
}
