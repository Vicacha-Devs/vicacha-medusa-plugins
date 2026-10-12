import { XMarkMini } from "@medusajs/icons"
import {
  Badge,
  Button,
  Heading,
  Input,
  Label,
  Select,
} from "@medusajs/ui"
import React from "react"
import { useTranslation } from "react-i18next"

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
  onCreateSynonym: (e: React.FormEvent) => void
  onDeleteSynonym: (id: string) => void
  onCreateCuration: (e: React.FormEvent) => void
  onDeleteCuration: (id: string) => void
  onCreateStopwords: (e: React.FormEvent) => void
  onDeleteStopwords: (id: string) => void
}

export const MerchandisingTab: React.FC<MerchandisingTabProps> = ({
  collections,
  merchEntity,
  setMerchEntity,
  synonyms,
  curations,
  stopwords,
  synId,
  setSynId,
  synRoot,
  setSynRoot,
  synTerms,
  setSynTerms,
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
  stopId,
  setStopId,
  stopWordsStr,
  setStopWordsStr,
  onCreateSynonym,
  onDeleteSynonym,
  onCreateCuration,
  onDeleteCuration,
  onCreateStopwords,
  onDeleteStopwords,
}) => {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-y-6">
      <div className="flex items-center gap-x-3">
        <Label>{t("merchandising.targetEntityLabel")}</Label>
        <div className="w-60">
          <Select value={merchEntity} onValueChange={setMerchEntity}>
            <Select.Trigger>
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              {collections.map((c) => (
                <Select.Item key={c.entity} value={c.entity}>
                  {c.entity}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Synonyms Editor */}
        <div className="border-ui-border-base rounded-lg border p-4">
          <Heading level="h2" className="mb-2">
            {t("merchandising.synonymsTitle")}
          </Heading>
          <form
            onSubmit={onCreateSynonym}
            className="mb-4 flex flex-col gap-y-3"
          >
            <Input
              placeholder={t("merchandising.synonymIdPlaceholder")}
              value={synId}
              onChange={(e) => setSynId(e.target.value)}
            />
            <Input
              placeholder={t("merchandising.synonymRootPlaceholder")}
              value={synRoot}
              onChange={(e) => setSynRoot(e.target.value)}
            />
            <Input
              placeholder={t("merchandising.synonymTermsPlaceholder")}
              value={synTerms}
              onChange={(e) => setSynTerms(e.target.value)}
            />
            <Button type="submit" variant="secondary" size="small">
              {t("merchandising.saveSynonymButton")}
            </Button>
          </form>

          <div className="flex flex-col gap-y-2">
            {synonyms.map((s) => (
              <div
                key={s.id}
                className="bg-ui-bg-subtle flex items-center justify-between rounded p-2 text-xs"
              >
                <div>
                  <span className="font-semibold">{s.id}</span>:{" "}
                  {s.root ? `${s.root} → ` : ""}
                  {Array.isArray(s.synonyms) ? s.synonyms.join(", ") : ""}
                </div>
                <Button
                  variant="transparent"
                  size="small"
                  onClick={() => onDeleteSynonym(s.id)}
                >
                  {t("merchandising.deleteButton")}
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Curations / Overrides Editor */}
        <div className="border-ui-border-base rounded-lg border p-4">
          <Heading level="h2" className="mb-2">
            {t("merchandising.curationsTitle")}
          </Heading>
          <form
            onSubmit={onCreateCuration}
            className="mb-4 flex flex-col gap-y-3"
          >
            <Input
              placeholder={t("merchandising.curationIdPlaceholder")}
              value={curId}
              onChange={(e) => setCurId(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder={t("merchandising.curationQueryPlaceholder")}
                value={curQuery}
                onChange={(e) => setCurQuery(e.target.value)}
              />
              <Select
                value={curMatch}
                onValueChange={(v) => setCurMatch(v as "exact" | "contains")}
              >
                <Select.Trigger>
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="exact">
                    {t("merchandising.matchExact")}
                  </Select.Item>
                  <Select.Item value="contains">
                    {t("merchandising.matchContains")}
                  </Select.Item>
                </Select.Content>
              </Select>
            </div>
            <Input
              placeholder={t("merchandising.curationIncludesPlaceholder")}
              value={curIncludesStr}
              onChange={(e) => setCurIncludesStr(e.target.value)}
            />
            <Input
              placeholder={t("merchandising.curationExcludesPlaceholder")}
              value={curExcludesStr}
              onChange={(e) => setCurExcludesStr(e.target.value)}
            />
            <Input
              placeholder={t("merchandising.curationBannerPlaceholder")}
              value={curBannerTitle}
              onChange={(e) => setCurBannerTitle(e.target.value)}
            />
            <Button type="submit" variant="secondary" size="small">
              {t("merchandising.saveCurationButton")}
            </Button>
          </form>

          <div className="flex flex-col gap-y-2">
            {curations.map((c) => (
              <div
                key={c.id}
                className="bg-ui-bg-subtle flex items-center justify-between rounded p-2 text-xs"
              >
                <div>
                  <span className="font-semibold">{c.id}</span> (
                  {t("merchandising.queryLabel")}{" "}
                  <code>{c.rule?.query}</code> [{c.rule?.match}])
                </div>
                <Button
                  variant="transparent"
                  size="small"
                  onClick={() => onDeleteCuration(c.id)}
                >
                  {t("merchandising.deleteButton")}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stopwords Set Editor */}
      <div className="border-ui-border-base rounded-lg border p-4">
        <Heading level="h2" className="mb-2">
          {t("merchandising.stopwordsTitle")}
        </Heading>
        <form
          onSubmit={onCreateStopwords}
          className="flex flex-wrap items-center gap-3"
        >
          <Input
            placeholder={t("merchandising.stopwordIdPlaceholder")}
            value={stopId}
            onChange={(e) => setStopId(e.target.value)}
          />
          <Input
            placeholder={t("merchandising.stopwordsListPlaceholder")}
            value={stopWordsStr}
            onChange={(e) => setStopWordsStr(e.target.value)}
          />
          <Button type="submit" variant="secondary" size="small">
            {t("merchandising.saveStopwordsButton")}
          </Button>
        </form>
        {stopwords.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {stopwords.map((sw) => (
              <div key={sw.id} className="inline-flex items-center gap-x-1">
                <Badge color="grey" size="small">
                  {sw.id} (
                  {t("merchandising.wordsCount", {
                    count: Array.isArray(sw.stopwords)
                      ? sw.stopwords.length
                      : 0,
                  })}
                  )
                </Badge>
                <Button
                  variant="transparent"
                  size="small"
                  onClick={() => onDeleteStopwords(sw.id)}
                >
                  <XMarkMini />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
