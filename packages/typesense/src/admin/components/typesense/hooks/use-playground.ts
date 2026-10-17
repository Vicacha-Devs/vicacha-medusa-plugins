import { toast } from "@medusajs/ui"
import type React from "react"
import { useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { useTypesensePlaygroundSearch } from "../../../../hooks"
import type {
  CollectionOverviewItem,
  PlaygroundResponse,
  SearchMode,
} from "../types"

/**
 * Search playground form state and query runner.
 */
export function usePlayground(collections: CollectionOverviewItem[]) {
  const { t } = useTranslation()
  const [playEntity, setPlayEntity] = useState("products")
  const [playQuery, setPlayQuery] = useState("*")
  const [playMode, setPlayMode] = useState<string>("hybrid")
  const [playAlpha, setPlayAlpha] = useState("0.3")

  const playgroundMutation = useTypesensePlaygroundSearch()

  useEffect(() => {
    if (
      collections.length > 0 &&
      !collections.some((c) => c.entity === playEntity)
    ) {
      setPlayEntity(collections[0].entity)
    }
  }, [collections, playEntity])

  const handleRunPlayground = useCallback(
    async (e?: React.FormEvent) => {
      if (e && "preventDefault" in e) {
        e.preventDefault()
      }
      try {
        await playgroundMutation.mutateAsync({
          entity: playEntity,
          q: playQuery || "*",
          mode: (playMode as SearchMode) || "hybrid",
          alpha: Number(playAlpha) || 0.3,
          disjunctive_facets: true,
          limit: 12,
        })
      } catch (err: any) {
        toast.error(err?.message || t("messages.playgroundError"))
      }
    },
    [playAlpha, playEntity, playMode, playQuery, playgroundMutation, t]
  )

  return {
    playEntity,
    setPlayEntity,
    playQuery,
    setPlayQuery,
    playMode,
    setPlayMode,
    playAlpha,
    setPlayAlpha,
    playResult: (playgroundMutation.data as PlaygroundResponse) ?? null,
    playLoading: playgroundMutation.isPending,
    handleRunPlayground,
  }
}
