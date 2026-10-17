import { SectionRow } from "@medusajs/dashboard/components"
import { Badge, Container, Heading, Text } from "@medusajs/ui"
import React from "react"
import { useTranslation } from "react-i18next"

import { renderSafeHighlight } from "./safe-highlight"
import type { PlaygroundResponse } from "./types"

export interface PlaygroundResultsSectionProps {
  playResult: PlaygroundResponse
}

export const PlaygroundResultsSection: React.FC<
  PlaygroundResultsSectionProps
> = ({ playResult }) => {
  const { t } = useTranslation()

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Heading level="h2">
            {t("playground.facetsTitle", {
              count: playResult.facets?.length || 0,
            })}
          </Heading>
        </div>
        {Array.isArray(playResult.facets) && playResult.facets.length > 0 ? (
          playResult.facets.map((f) => (
            <div key={f.field_name} className="px-6 py-3">
              <Text weight="plus" size="xsmall" className="uppercase">
                {f.field_name}
              </Text>
              <div className="mt-2 flex flex-col gap-y-1">
                {(f.counts || []).slice(0, 6).map((c) => (
                  <div
                    key={c.value}
                    className="flex items-center justify-between text-xs"
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
          <div className="px-6 py-4">
            <Text size="small" className="text-ui-fg-subtle">
              {t("playground.noFacets")}
            </Text>
          </div>
        )}
      </Container>

      <div className="flex flex-col gap-y-4 md:col-span-3">
        <Container className="divide-y p-0">
          <div className="px-6 py-4">
            <Text size="small">
              {t("playground.resultsSummary", {
                found: playResult.found,
                ms: playResult.search_time_ms,
                collection: playResult.collection,
              })}
            </Text>
          </div>

          {playResult.conversation?.answer && (
            <SectionRow
              title={t("playground.aiAnswerTitle")}
              value={playResult.conversation.answer}
            />
          )}
        </Container>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {(playResult.hits || []).map((hit, i) => {
            const doc = hit.document || {}
            const firstHl = Array.isArray(hit.highlights)
              ? hit.highlights[0]?.snippet
              : undefined
            return (
              <Container key={doc.id || i} className="divide-y p-0">
                <div className="flex items-center justify-between px-6 py-4">
                  <Heading level="h3">
                    {doc.title || doc.name || doc.id}
                  </Heading>
                  {hit.curated && (
                    <Badge color="purple" size="xsmall">
                      {t("playground.pinnedBadge")}
                    </Badge>
                  )}
                </div>
                <SectionRow title="ID" value={String(doc.id || "—")} />
                {doc.min_price !== undefined && (
                  <SectionRow
                    title="Min Price"
                    value={String(doc.min_price)}
                  />
                )}
                {firstHl && (
                  <div className="px-6 py-3 text-xs">
                    {renderSafeHighlight(firstHl)}
                  </div>
                )}
              </Container>
            )
          })}
        </div>
      </div>
    </div>
  )
}
