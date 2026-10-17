import { SectionRow } from "@medusajs/dashboard/components"
import { Container, Heading, Select, Text } from "@medusajs/ui"
import React from "react"
import { useTranslation } from "react-i18next"

import { CurationsSection } from "./curations-section"
import { StopwordsSection } from "./stopwords-section"
import { SynonymsSection } from "./synonyms-section"
import type {
  CollectionOverviewItem,
  CurationItem,
  StopwordSetItem,
  SynonymItem,
} from "./types"

export interface MerchandisingTabProps {
  collections: CollectionOverviewItem[]
  merchEntity: string
  setMerchEntity: (val: string) => void
  synonyms: SynonymItem[]
  curations: CurationItem[]
  stopwords: StopwordSetItem[]
  synId: string
  setSynId: (val: string) => void
  synRoot: string
  setSynRoot: (val: string) => void
  synTerms: string
  setSynTerms: (val: string) => void
  curId: string
  setCurId: (val: string) => void
  curQuery: string
  setCurQuery: (val: string) => void
  curMatch: "exact" | "contains"
  setCurMatch: (val: "exact" | "contains") => void
  curIncludesStr: string
  setCurIncludesStr: (val: string) => void
  curExcludesStr: string
  setCurExcludesStr: (val: string) => void
  curBannerTitle: string
  setCurBannerTitle: (val: string) => void
  stopId: string
  setStopId: (val: string) => void
  stopWordsStr: string
  setStopWordsStr: (val: string) => void
  savingSynonym?: boolean
  savingCuration?: boolean
  savingStopwords?: boolean
  onCreateSynonym: (eOrValues?: any) => void
  onDeleteSynonym: (id: string) => void
  onCreateCuration: (eOrValues?: any) => void
  onDeleteCuration: (id: string) => void
  onCreateStopwords: (eOrValues?: any) => void
  onDeleteStopwords: (id: string) => void
}

export const MerchandisingTab: React.FC<MerchandisingTabProps> = (props) => {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-y-4">
      <Container className="divide-y p-0">
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div>
            <Heading level="h2">{t("tabs.merchandising")}</Heading>
            <Text size="small" className="text-ui-fg-subtle mt-0.5">
              {t("merchandising.targetEntityLabel")}
            </Text>
          </div>
          <div className="w-60">
            <Select
              value={props.merchEntity}
              onValueChange={props.setMerchEntity}
            >
              <Select.Trigger>
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                {props.collections.map((c) => (
                  <Select.Item key={c.entity} value={c.entity}>
                    {c.entity}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </div>
        </div>
        <SectionRow
          title={t("overview.synonyms")}
          value={String(props.synonyms.length)}
        />
        <SectionRow
          title={t("overview.curations")}
          value={String(props.curations.length)}
        />
      </Container>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <SynonymsSection
          synonyms={props.synonyms}
          synId={props.synId}
          setSynId={props.setSynId}
          synRoot={props.synRoot}
          setSynRoot={props.setSynRoot}
          synTerms={props.synTerms}
          setSynTerms={props.setSynTerms}
          savingSynonym={props.savingSynonym}
          onCreateSynonym={props.onCreateSynonym}
          onDeleteSynonym={props.onDeleteSynonym}
        />

        <CurationsSection
          curations={props.curations}
          curId={props.curId}
          setCurId={props.setCurId}
          curQuery={props.curQuery}
          setCurQuery={props.setCurQuery}
          curMatch={props.curMatch}
          setCurMatch={props.setCurMatch}
          curIncludesStr={props.curIncludesStr}
          setCurIncludesStr={props.setCurIncludesStr}
          curExcludesStr={props.curExcludesStr}
          setCurExcludesStr={props.setCurExcludesStr}
          curBannerTitle={props.curBannerTitle}
          setCurBannerTitle={props.setCurBannerTitle}
          savingCuration={props.savingCuration}
          onCreateCuration={props.onCreateCuration}
          onDeleteCuration={props.onDeleteCuration}
        />
      </div>

      <StopwordsSection
        stopwords={props.stopwords}
        stopId={props.stopId}
        setStopId={props.setStopId}
        stopWordsStr={props.stopWordsStr}
        setStopWordsStr={props.setStopWordsStr}
        savingStopwords={props.savingStopwords}
        onCreateStopwords={props.onCreateStopwords}
        onDeleteStopwords={props.onDeleteStopwords}
      />
    </div>
  )
}
