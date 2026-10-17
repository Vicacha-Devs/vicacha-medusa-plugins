import { toast } from "@medusajs/ui"
import { useCallback, useState } from "react"
import { useTranslation } from "react-i18next"

import {
  useDeleteTypesenseCuration,
  useTypesenseCurations,
  useUpsertTypesenseCuration,
} from "../../../../hooks"
import {
  parseCurationIncludes,
  splitCsv,
  unwrapFormValues,
  type FormEventOrValues,
} from "./form-utils"

type CurationFormValues = {
  curId?: string
  curQuery?: string
  curMatch?: "exact" | "contains"
  curIncludesStr?: string
  curExcludesStr?: string
  curBannerTitle?: string
}

export function useCurations(merchEntity: string) {
  const { t } = useTranslation()
  const [curId, setCurId] = useState("")
  const [curQuery, setCurQuery] = useState("")
  const [curMatch, setCurMatch] = useState<"exact" | "contains">("exact")
  const [curIncludesStr, setCurIncludesStr] = useState("")
  const [curExcludesStr, setCurExcludesStr] = useState("")
  const [curBannerTitle, setCurBannerTitle] = useState("")

  const { data } = useTypesenseCurations(merchEntity)
  const upsertMutation = useUpsertTypesenseCuration()
  const deleteMutation = useDeleteTypesenseCuration()

  const handleCreateCuration = useCallback(
    async (eOrValues?: FormEventOrValues<CurationFormValues>) => {
      const vals = unwrapFormValues(eOrValues)

      const id = (vals?.curId ?? curId).trim()
      const query = (vals?.curQuery ?? curQuery).trim()
      const match = vals?.curMatch ?? curMatch
      const includesRaw = vals?.curIncludesStr ?? curIncludesStr
      const excludesRaw = vals?.curExcludesStr ?? curExcludesStr
      const bannerTitle = (vals?.curBannerTitle ?? curBannerTitle).trim()

      if (!id || !query) {
        toast.error(t("messages.curationRequired"))
        return
      }

      const includes = parseCurationIncludes(includesRaw)
      const excludes = splitCsv(excludesRaw).map((item) => ({ id: item }))

      try {
        await upsertMutation.mutateAsync({
          entity: merchEntity,
          payload: {
            id,
            rule: { query, match },
            includes: includes.length > 0 ? includes : undefined,
            excludes: excludes.length > 0 ? excludes : undefined,
            ...(bannerTitle ? { metadata: { banner_title: bannerTitle } } : {}),
          } as any,
        })
        toast.success(t("messages.curationSaved", { id }))
        setCurId("")
        setCurQuery("")
        setCurIncludesStr("")
        setCurExcludesStr("")
        setCurBannerTitle("")
      } catch (e: any) {
        toast.error(e?.message || t("messages.curationSaveError"))
      }
    },
    [
      curBannerTitle,
      curExcludesStr,
      curId,
      curIncludesStr,
      curMatch,
      curQuery,
      merchEntity,
      t,
      upsertMutation,
    ]
  )

  const handleDeleteCuration = useCallback(
    async (id: string) => {
      try {
        await deleteMutation.mutateAsync({ entity: merchEntity, id })
        toast.success(t("messages.curationDeleted", { id }))
      } catch (e: any) {
        toast.error(e?.message || t("messages.curationDeleteError"))
      }
    },
    [deleteMutation, merchEntity, t]
  )

  return {
    curations: data?.curations || [],
    curId,
    setCurId,
    curQuery,
    setCurQuery,
    curMatch,
    setCurMatch,
    curIncludesStr,
    setCurIncludesStr,
    curExcludesStr,
    setCurExcludesStr,
    curBannerTitle,
    setCurBannerTitle,
    savingCuration: upsertMutation.isPending,
    handleCreateCuration,
    handleDeleteCuration,
  }
}
