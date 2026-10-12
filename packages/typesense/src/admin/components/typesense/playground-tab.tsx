import {
  Badge,
  Button,
  Heading,
  Input,
  Label,
  Select,
  Text,
} from "@medusajs/ui"
import React from "react"
import { useTranslation } from "react-i18next"

import { renderSafeHighlight } from "./safe-highlight"
import type { CollectionOverviewItem, PlaygroundResponse } from "./types"

export interface PlaygroundTabProps {
  collections: CollectionOverviewItem[]
  playEntity: string
  setPlayEntity: (val: string) => void
  playQuery: string
  setPlayQuery: (val: string) => void
  playMode: string
  setPlayMode: (val: string) => void
  playAlpha: string
  setPlayAlpha: (val: string) => void
  playResult: PlaygroundResponse | null
  playLoading: boolean
  onRunPlayground: (e?: React.FormEvent) => void
}

export const PlaygroundTab: React.FC<PlaygroundTabProps> = ({
  collections,
  playEntity,
  setPlayEntity,
  playQuery,
  setPlayQuery,
  playMode,
  setPlayMode,
  playAlpha,
  setPlayAlpha,
  playResult,
  playLoading,
  onRunPlayground,
}) => {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-y-4">
      <form
        onSubmit={onRunPlayground}
        className="border-ui-border-base grid grid-cols-1 gap-3 rounded-lg border p-4 md:grid-cols-5"
      >
        <div>
          <Label>{t("playground.entityLabel")}</Label>
          <Select value={playEntity} onValueChange={setPlayEntity}>
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
        <div className="md:col-span-2">
          <Label>{t("playground.queryLabel")}</Label>
          <Input
            placeholder={t("playground.queryPlaceholder")}
            value={playQuery}
            onChange={(e) => setPlayQuery(e.target.value)}
          />
        </div>
        <div>
          <Label>{t("playground.modeLabel")}</Label>
          <Select value={playMode} onValueChange={setPlayMode}>
            <Select.Trigger>
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="keyword">
                {t("playground.modeKeyword")}
              </Select.Item>
              <Select.Item value="hybrid">
                {t("playground.modeHybrid")}
              </Select.Item>
              <Select.Item value="semantic">
                {t("playground.modeSemantic")}
              </Select.Item>
              <Select.Item value="conversational">
                {t("playground.modeConversational")}
              </Select.Item>
            </Select.Content>
          </Select>
        </div>
        <div className="flex items-end gap-x-2">
          <div className="w-24">
            <Label>{t("playground.alphaLabel")}</Label>
            <Input
              value={playAlpha}
              onChange={(e) => setPlayAlpha(e.target.value)}
            />
          </div>
          <Button type="submit" variant="primary" isLoading={playLoading}>
            {t("playground.searchButton")}
          </Button>
        </div>
      </form>

      {playResult && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="border-ui-border-base rounded-lg border p-4">
            <Heading level="h3" className="mb-2">
              {t("playground.facetsTitle", {
                count: playResult.facets?.length || 0,
              })}
            </Heading>
            {Array.isArray(playResult.facets) &&
            playResult.facets.length > 0 ? (
              playResult.facets.map((f) => (
                <div key={f.field_name} className="mb-3">
                  <Text weight="plus" size="xsmall" className="uppercase">
                    {f.field_name}
                  </Text>
                  <div className="mt-1 flex flex-col gap-y-1">
                    {(f.counts || []).slice(0, 6).map((c) => (
                      <div
                        key={c.value}
                        className="flex justify-between text-xs"
                      >
                        <span>{c.value}</span>
                        <Badge size="xsmall" color="grey">
                          {c.count}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <Text size="small" className="text-ui-fg-subtle">
                {t("playground.noFacets")}
              </Text>
            )}
          </div>

          <div className="flex flex-col gap-y-3 md:col-span-3">
            <div className="flex items-center justify-between">
              <Text size="small">
                {t("playground.resultsSummary", {
                  found: playResult.found,
                  ms: playResult.search_time_ms,
                  collection: playResult.collection,
                })}
              </Text>
            </div>

            {playResult.conversation?.answer && (
              <div className="bg-ui-bg-subtle border-ui-border-base rounded-lg border p-3">
                <Text weight="plus" size="small">
                  {t("playground.aiAnswerTitle")}
                </Text>
                <Text size="small" className="mt-1">
                  {playResult.conversation.answer}
                </Text>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {(playResult.hits || []).map((hit, i) => {
                const doc = hit.document || {}
                const firstHl = Array.isArray(hit.highlights)
                  ? hit.highlights[0]?.snippet
                  : undefined
                return (
                  <div
                    key={doc.id || i}
                    className="border-ui-border-base rounded-lg border p-3"
                  >
                    <div className="flex items-center justify-between">
                      <Text weight="plus">
                        {doc.title || doc.name || doc.id}
                      </Text>
                      {hit.curated && (
                        <Badge color="purple" size="xsmall">
                          {t("playground.pinnedBadge")}
                        </Badge>
                      )}
                    </div>
                    <Text
                      size="xsmall"
                      className="text-ui-fg-subtle font-mono"
                    >
                      {t("playground.idLabel", { id: doc.id })}{" "}
                      {doc.min_price !== undefined
                        ? t("playground.minPriceLabel", {
                            price: doc.min_price,
                          })
                        : ""}
                    </Text>
                    {firstHl && (
                      <div className="mt-2 text-xs">
                        {renderSafeHighlight(firstHl)}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
