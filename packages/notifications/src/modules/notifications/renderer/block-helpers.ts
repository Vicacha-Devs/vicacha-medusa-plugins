import type { TemplateBlockNode } from "../../../types"

export function isEmptyInterpolatedValue(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    (typeof value === "string" && value.trim() === "")
  )
}

export function getBlockMeta(node: TemplateBlockNode | Record<string, any>): Record<string, any> {
  return (node as any).metadata || (node as any).props || {}
}

export function getBlockChildren(
  node: TemplateBlockNode | Record<string, any>,
  meta: Record<string, any>
): TemplateBlockNode[] {
  if (Array.isArray(node.children) && node.children.length > 0) {
    return node.children
  }
  if (Array.isArray(meta.itemBlocks) && meta.itemBlocks.length > 0) {
    return meta.itemBlocks
  }
  if (Array.isArray(meta.blocks) && meta.blocks.length > 0) {
    return meta.blocks
  }
  return []
}

export function buildRepeaterItemContext(
  data: Record<string, any>,
  item: any,
  arrayKey: string
): Record<string, any> {
  if (item && typeof item === "object") {
    return {
      ...data,
      ...item,
      item,
      ...(arrayKey ? { [arrayKey]: item } : {}),
    }
  }
  return {
    ...data,
    item,
    ...(arrayKey ? { [arrayKey]: item } : {}),
  }
}
