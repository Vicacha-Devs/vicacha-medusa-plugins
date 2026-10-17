import { useEffect, useState } from "react"

import type { CollectionOverviewItem } from "../types"
import { useCurations } from "./use-curations"
import { useStopwords } from "./use-stopwords"
import { useSynonyms } from "./use-synonyms"

/**
 * Merchandising tab state: the selected entity plus synonyms, curations and stopwords.
 */
export function useMerchandising(
  collections: CollectionOverviewItem[],
  initialSynonymQuery?: string
) {
  const [merchEntity, setMerchEntity] = useState("products")

  useEffect(() => {
    if (
      collections.length > 0 &&
      !collections.some((c) => c.entity === merchEntity)
    ) {
      setMerchEntity(collections[0].entity)
    }
  }, [collections, merchEntity])

  const synonyms = useSynonyms(merchEntity, initialSynonymQuery)
  const curations = useCurations(merchEntity)
  const stopwords = useStopwords()

  return {
    prefillSynonym: synonyms.prefill,
    merchandising: {
      merchEntity,
      setMerchEntity,
      ...synonyms.state,
      ...curations,
      ...stopwords,
    },
  }
}
