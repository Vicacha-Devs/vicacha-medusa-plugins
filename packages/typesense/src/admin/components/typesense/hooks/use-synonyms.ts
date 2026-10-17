import { toast } from "@medusajs/ui"
import { useCallback, useState } from "react"
import { useTranslation } from "react-i18next"

import {
  useDeleteTypesenseSynonym,
  useTypesenseSynonyms,
  useUpsertTypesenseSynonym,
} from "../../../../hooks"
import {
  splitCsv,
  unwrapFormValues,
  type FormEventOrValues,
} from "./form-utils"

type SynonymFormValues = { synId?: string; synRoot?: string; synTerms?: string }

export function useSynonyms(merchEntity: string, initialQuery?: string) {
  const { t } = useTranslation()
  const [synId, setSynId] = useState(initialQuery ? `syn-${initialQuery}` : "")
  const [synRoot, setSynRoot] = useState(initialQuery || "")
  const [synTerms, setSynTerms] = useState("")

  const { data } = useTypesenseSynonyms(merchEntity)
  const upsertMutation = useUpsertTypesenseSynonym()
  const deleteMutation = useDeleteTypesenseSynonym()

  const handleCreateSynonym = useCallback(
    async (eOrValues?: FormEventOrValues<SynonymFormValues>) => {
      const vals = unwrapFormValues(eOrValues)

      const id = (vals?.synId ?? synId).trim()
      const root = (vals?.synRoot ?? synRoot).trim()
      const terms = splitCsv(vals?.synTerms ?? synTerms)

      if (!id || terms.length === 0) {
        toast.error(t("messages.synonymRequired"))
        return
      }

      try {
        await upsertMutation.mutateAsync({
          entity: merchEntity,
          payload: {
            id,
            synonyms: terms,
            root: root || undefined,
          },
        })
        toast.success(t("messages.synonymSaved", { id }))
        setSynId("")
        setSynRoot("")
        setSynTerms("")
      } catch (e: any) {
        toast.error(e?.message || t("messages.synonymSaveError"))
      }
    },
    [merchEntity, synId, synRoot, synTerms, t, upsertMutation]
  )

  const handleDeleteSynonym = useCallback(
    async (id: string) => {
      try {
        await deleteMutation.mutateAsync({ entity: merchEntity, id })
        toast.success(t("messages.synonymDeleted", { id }))
      } catch (e: any) {
        toast.error(e?.message || t("messages.synonymDeleteError"))
      }
    },
    [deleteMutation, merchEntity, t]
  )

  const prefill = useCallback((query: string) => {
    setSynId(`syn-${query.toLowerCase().replace(/[^a-z0-9_-]+/g, "-")}`)
    setSynRoot(query)
  }, [])

  return {
    prefill,
    state: {
      synonyms: data?.synonyms || [],
      synId,
      setSynId,
      synRoot,
      setSynRoot,
      synTerms,
      setSynTerms,
      savingSynonym: upsertMutation.isPending,
      handleCreateSynonym,
      handleDeleteSynonym,
    },
  }
}
