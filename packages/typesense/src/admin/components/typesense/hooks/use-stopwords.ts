import { toast } from "@medusajs/ui"
import { useCallback, useState } from "react"
import { useTranslation } from "react-i18next"

import {
  useDeleteTypesenseStopwords,
  useTypesenseStopwords,
  useUpsertTypesenseStopwords,
} from "../../../../hooks"
import {
  splitCsv,
  unwrapFormValues,
  type FormEventOrValues,
} from "./form-utils"

type StopwordsFormValues = { stopId?: string; stopWordsStr?: string }

export function useStopwords() {
  const { t } = useTranslation()
  const [stopId, setStopId] = useState("default_stopwords")
  const [stopWordsStr, setStopWordsStr] = useState("the, a, an, of, in")

  const { data } = useTypesenseStopwords()
  const upsertMutation = useUpsertTypesenseStopwords()
  const deleteMutation = useDeleteTypesenseStopwords()

  const handleCreateStopwords = useCallback(
    async (eOrValues?: FormEventOrValues<StopwordsFormValues>) => {
      const vals = unwrapFormValues(eOrValues)

      const id = (vals?.stopId ?? stopId).trim()
      const words = splitCsv(vals?.stopWordsStr ?? stopWordsStr)

      if (!id || words.length === 0) {
        toast.error(t("messages.stopwordsRequired"))
        return
      }

      try {
        await upsertMutation.mutateAsync({ id, stopwords: words })
        toast.success(t("messages.stopwordsSaved", { id }))
      } catch (e: any) {
        toast.error(e?.message || t("messages.stopwordsSaveError"))
      }
    },
    [stopId, stopWordsStr, t, upsertMutation]
  )

  const handleDeleteStopwords = useCallback(
    async (id: string) => {
      try {
        await deleteMutation.mutateAsync({ id })
        toast.success(t("messages.stopwordsDeleted", { id }))
      } catch (e: any) {
        toast.error(e?.message || t("messages.stopwordsDeleteError"))
      }
    },
    [deleteMutation, t]
  )

  return {
    stopwords: data?.stopwords || [],
    stopId,
    setStopId,
    stopWordsStr,
    setStopWordsStr,
    savingStopwords: upsertMutation.isPending,
    handleCreateStopwords,
    handleDeleteStopwords,
  }
}
