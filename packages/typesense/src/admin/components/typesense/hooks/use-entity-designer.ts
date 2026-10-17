import { toast } from "@medusajs/ui"
import { useCallback, useState } from "react"
import { useTranslation } from "react-i18next"

import {
  useDeleteTypesenseCustomEntity,
  useUpsertTypesenseEntityConfig,
} from "../../../../hooks"
import {
  splitCsv,
  unwrapFormValues,
  type FormEventOrValues,
} from "./form-utils"

type EntityFormValues = {
  entityKey?: string
  graphEntity?: string
  graphFieldsStr?: string
  queryByStr?: string
  facetByStr?: string
  enableEmbedder?: boolean
  embedderModel?: string
}

/**
 * Entity Designer form state plus save / remove handlers.
 */
export function useEntityDesigner(entities: any[]) {
  const { t } = useTranslation()
  const [entityKey, setEntityKey] = useState("brands")
  const [graphEntity, setGraphEntity] = useState("brand")
  const [graphFieldsStr, setGraphFieldsStr] = useState(
    "id, name, slug, description, created_at, updated_at"
  )
  const [queryByStr, setQueryByStr] = useState("name, slug, description")
  const [facetByStr, setFacetByStr] = useState("name")
  const [enableEmbedder, setEnableEmbedder] = useState(false)
  const [embedderModel, setEmbedderModel] = useState("ts/all-MiniLM-L6-v2")

  const upsertEntityMutation = useUpsertTypesenseEntityConfig()
  const deleteEntityMutation = useDeleteTypesenseCustomEntity()

  const selectEntityConfig = useCallback(
    (targetEntityKey: string) => {
      setEntityKey(targetEntityKey)
      const existing = entities.find(
        (item) => (item.entity || item.entity_type) === targetEntityKey
      )
      if (existing) {
        setGraphEntity(existing.graphEntity || existing.graph_entity || targetEntityKey)
        setGraphFieldsStr(
          Array.isArray(existing.graphFields || existing.graph_fields)
            ? (existing.graphFields || existing.graph_fields).join(", ")
            : "id, title, handle"
        )
        setQueryByStr(
          Array.isArray(existing.queryBy || existing.query_by)
            ? (existing.queryBy || existing.query_by).join(", ")
            : "title, handle"
        )
        setFacetByStr(
          Array.isArray(existing.facetBy || existing.facet_by)
            ? (existing.facetBy || existing.facet_by).join(", ")
            : ""
        )
        setEnableEmbedder(Boolean(existing.embedder?.enabled))
        if (existing.embedder?.model_name) {
          setEmbedderModel(existing.embedder.model_name)
        }
      }
    },
    [entities]
  )

  const handleSaveEntityConfig = useCallback(
    async (eOrValues?: FormEventOrValues<EntityFormValues>) => {
      const vals = unwrapFormValues(eOrValues)

      const targetEntity = (vals?.entityKey ?? entityKey).trim()
      if (!targetEntity) {
        toast.error(t("messages.entityKeyRequired"))
        return
      }

      const targetGraph = (vals?.graphEntity ?? graphEntity).trim()
      const graphFields = splitCsv(vals?.graphFieldsStr ?? graphFieldsStr)
      const queryBy = splitCsv(vals?.queryByStr ?? queryByStr)
      const facetBy = splitCsv(vals?.facetByStr ?? facetByStr)
      const isEmbedEnabled = vals?.enableEmbedder ?? enableEmbedder
      const targetModel = vals?.embedderModel ?? embedderModel

      try {
        await upsertEntityMutation.mutateAsync({
          entity: targetEntity,
          entity_type: targetEntity,
          enabled: true,
          graph_entity: targetGraph || undefined,
          graph_fields: graphFields.length > 0 ? graphFields : undefined,
          query_by: queryBy.length > 0 ? queryBy : ["title", "name", "handle"],
          facet_by: facetBy,
          embedder: isEmbedEnabled
            ? {
                enabled: true,
                model_name: targetModel,
              }
            : null,
        } as any)
        toast.success(t("messages.entitySaved", { entity: targetEntity }))
      } catch (e: any) {
        toast.error(e?.message || t("messages.entitySaveError"))
      }
    },
    [
      embedderModel,
      enableEmbedder,
      entityKey,
      facetByStr,
      graphEntity,
      graphFieldsStr,
      queryByStr,
      t,
      upsertEntityMutation,
    ]
  )

  const handleDeleteCustomEntity = useCallback(
    async (entityType: string) => {
      try {
        await deleteEntityMutation.mutateAsync({ entity: entityType })
        toast.success(t("messages.entityRemoved", { entity: entityType }))
      } catch (e: any) {
        toast.error(e?.message || t("messages.entityRemoveError"))
      }
    },
    [deleteEntityMutation, t]
  )

  return {
    handleDeleteCustomEntity,
    entityForm: {
      entityKey,
      setEntityKey,
      graphEntity,
      setGraphEntity,
      graphFieldsStr,
      setGraphFieldsStr,
      queryByStr,
      setQueryByStr,
      facetByStr,
      setFacetByStr,
      enableEmbedder,
      setEnableEmbedder,
      embedderModel,
      setEmbedderModel,
      saving: upsertEntityMutation.isPending,
      selectEntityConfig,
      handleSaveEntityConfig,
    },
  }
}
