import { MedusaError } from "@medusajs/framework/utils"
import type {
  DiffDocV1,
  ResolvedItemNodeV1,
  ResolvedSectionNodeV1,
  ResolvedTreeV1,
  TreeDocV1,
  TreeItemNodeV1,
  TreeNodeV1,
  TreeSectionNodeV1,
} from "../types"

export function createEmptyTree(rootId = "root"): TreeDocV1 {
  return {
    schema: "tree@1",
    root_id: rootId,
    nodes: {
      [rootId]: {
        id: rootId,
        parent_id: null,
        type: "root",
        order: 0,
      },
    },
  }
}

export function validateTreeDocV1(tree: unknown): TreeDocV1 {
  if (!tree || typeof tree !== "object") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Content tree must be an object"
    )
  }

  const candidate = tree as TreeDocV1
  if (candidate.schema !== "tree@1") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Content tree schema must be "tree@1", received "${String(candidate.schema)}"`
    )
  }

  if (!candidate.root_id || typeof candidate.root_id !== "string") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Content tree must specify a valid root_id"
    )
  }

  if (!candidate.nodes || typeof candidate.nodes !== "object") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Content tree must include a nodes map"
    )
  }

  const rootNode = candidate.nodes[candidate.root_id]
  if (!rootNode || rootNode.type !== "root" || rootNode.parent_id !== null) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Root node "${candidate.root_id}" must exist with type "root" and parent_id null`
    )
  }

  for (const [nodeKey, node] of Object.entries(candidate.nodes)) {
    if (!node || typeof node !== "object") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Invalid tree node at key "${nodeKey}"`
      )
    }
    if (node.id !== nodeKey) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Tree node id "${node.id}" does not match map key "${nodeKey}"`
      )
    }

    if (node.type === "root") {
      if (node.id !== candidate.root_id) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Multiple root nodes are not allowed (found "${node.id}")`
        )
      }
      continue
    }

    // DFS ancestor walk for cycle detection and parent validation
    const visited = new Set<string>([node.id])
    let cursorParentId: string | null = node.parent_id
    while (cursorParentId !== null) {
      if (visited.has(cursorParentId)) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Cycle detected in content tree involving node "${node.id}"`
        )
      }
      visited.add(cursorParentId)
      const parentNode = candidate.nodes[cursorParentId]
      if (!parentNode) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Node "${node.id}" references missing parent_id "${cursorParentId}"`
        )
      }
      cursorParentId = parentNode.parent_id
    }

    const directParent = node.parent_id ? candidate.nodes[node.parent_id] : null
    if (node.type === "section") {
      if (!directParent || directParent.type !== "root") {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Section node "${node.id}" must have root as its parent`
        )
      }
      if (!node.title || typeof node.title !== "string") {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Section node "${node.id}" must have a non-empty title`
        )
      }
    } else if (node.type === "item") {
      if (!directParent || directParent.type !== "section") {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Item node "${node.id}" must have a section node as its parent`
        )
      }
      if (!node.title || typeof node.title !== "string") {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Item node "${node.id}" must have a non-empty title`
        )
      }
      if (!Array.isArray(node.blocks)) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Item node "${node.id}" must have a blocks array`
        )
      }
    }
  }

  return candidate
}

export function validateDiffDocV1(diff: unknown): DiffDocV1 {
  if (!diff || typeof diff !== "object") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Content diff must be an object"
    )
  }
  const candidate = diff as DiffDocV1
  if (candidate.schema !== "diff@1") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Content diff schema must be "diff@1", received "${String(candidate.schema)}"`
    )
  }
  return candidate
}

export function applyDiffToTree(
  baseTree: TreeDocV1,
  diff?: DiffDocV1 | null
): TreeDocV1 {
  const validBase = validateTreeDocV1(baseTree)
  if (!diff) {
    return validBase
  }
  const validDiff = validateDiffDocV1(diff)

  const mergedNodes: Record<string, TreeNodeV1> = {}
  for (const [id, node] of Object.entries(validBase.nodes)) {
    mergedNodes[id] = JSON.parse(JSON.stringify(node)) as TreeNodeV1
  }

  for (const deletedId of validDiff.deleted_node_ids ?? []) {
    if (deletedId !== validBase.root_id) {
      delete mergedNodes[deletedId]
    }
  }

  for (const [addedId, addedNode] of Object.entries(
    validDiff.added_nodes ?? {}
  )) {
    mergedNodes[addedId] = JSON.parse(JSON.stringify(addedNode)) as TreeNodeV1
  }

  for (const [patchId, patch] of Object.entries(validDiff.patches ?? {})) {
    const existing = mergedNodes[patchId]
    if (!existing || existing.type === "root") {
      continue
    }
    if (existing.type === "section") {
      const updated: TreeSectionNodeV1 = {
        ...existing,
        parent_id:
          patch.parent_id !== undefined ? patch.parent_id : existing.parent_id,
        order: patch.order !== undefined ? patch.order : existing.order,
        hidden: patch.hidden !== undefined ? patch.hidden : existing.hidden,
        title: patch.title !== undefined ? patch.title : existing.title,
        icon: patch.icon !== undefined ? patch.icon : existing.icon,
      }
      mergedNodes[patchId] = updated
    } else if (existing.type === "item") {
      const updated: TreeItemNodeV1 = {
        ...existing,
        parent_id:
          patch.parent_id !== undefined ? patch.parent_id : existing.parent_id,
        order: patch.order !== undefined ? patch.order : existing.order,
        hidden: patch.hidden !== undefined ? patch.hidden : existing.hidden,
        title: patch.title !== undefined ? patch.title : existing.title,
        blocks: patch.blocks !== undefined ? patch.blocks : existing.blocks,
      }
      mergedNodes[patchId] = updated
    }
  }

  // Remove orphaned items whose parent section was deleted
  for (const [nodeId, node] of Object.entries(mergedNodes)) {
    if (
      node.type !== "root" &&
      node.parent_id &&
      !mergedNodes[node.parent_id]
    ) {
      delete mergedNodes[nodeId]
    }
  }

  return validateTreeDocV1({
    schema: "tree@1",
    root_id: validBase.root_id,
    nodes: mergedNodes,
  })
}

export function resolveTree(
  baseTree?: TreeDocV1 | null,
  diff?: DiffDocV1 | null
): ResolvedTreeV1 {
  if (!baseTree) {
    return {
      root_id: "root",
      sections: [],
    }
  }

  const effectiveTree = applyDiffToTree(baseTree, diff)
  const sectionsMap = new Map<string, ResolvedSectionNodeV1>()

  const allNodes = Object.values(effectiveTree.nodes)
  const sectionNodes = allNodes
    .filter(
      (n): n is TreeSectionNodeV1 => n.type === "section" && !n.hidden
    )
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  for (let idx = 0; idx < sectionNodes.length; idx++) {
    const sec = sectionNodes[idx]
    sectionsMap.set(sec.id, {
      id: sec.id,
      title: sec.title,
      icon: sec.icon,
      order: typeof sec.order === "number" ? sec.order : idx,
      items: [],
    })
  }

  const itemNodes = allNodes
    .filter((n): n is TreeItemNodeV1 => n.type === "item" && !n.hidden)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  for (let idx = 0; idx < itemNodes.length; idx++) {
    const item = itemNodes[idx]
    if (!item.parent_id) {
      continue
    }
    const parentSection = sectionsMap.get(item.parent_id)
    if (!parentSection) {
      continue
    }
    const resolvedItem: ResolvedItemNodeV1 = {
      id: item.id,
      title: item.title,
      order: typeof item.order === "number" ? item.order : idx,
      blocks: item.blocks,
    }
    parentSection.items.push(resolvedItem)
  }

  return {
    root_id: effectiveTree.root_id,
    sections: Array.from(sectionsMap.values()),
  }
}
