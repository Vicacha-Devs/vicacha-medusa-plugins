import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CORE_LAYOUT_IDS } from "@medusajs/admin-shared"
import { LayoutComposer, SectionRow } from "@medusajs/dashboard/components"
import { CommandLine } from "@medusajs/icons"
import { Badge, Container, Heading, StatusBadge, Toaster } from "@medusajs/ui"
import React from "react"
import { useTranslation } from "react-i18next"

import { PlaygroundTab } from "../../../components/typesense/playground-tab"
import { useTypesenseStudio } from "../../../components/typesense/use-typesense-studio"

const TypesensePlaygroundPage: React.FC = () => {
  const { t } = useTranslation()
  const studio = useTypesenseStudio()

  const activeCol = studio.collections.find(
    (c) => c.entity === studio.playground.playEntity
  )

  return (
    <LayoutComposer
      widgetsZonePrefix="typesense.playground"
      preferredLayoutId={CORE_LAYOUT_IDS.TWO_COLUMN}
      sections={{
        main: (
          <LayoutComposer.Entry id="TypesensePlaygroundMainSection">
            <PlaygroundTab
              collections={studio.collections}
              playEntity={studio.playground.playEntity}
              setPlayEntity={studio.playground.setPlayEntity}
              playQuery={studio.playground.playQuery}
              setPlayQuery={studio.playground.setPlayQuery}
              playMode={studio.playground.playMode}
              setPlayMode={studio.playground.setPlayMode}
              playAlpha={studio.playground.playAlpha}
              setPlayAlpha={studio.playground.setPlayAlpha}
              playResult={studio.playground.playResult}
              playLoading={studio.playground.playLoading}
              onRunPlayground={(e) =>
                void studio.playground.handleRunPlayground(e)
              }
            />
          </LayoutComposer.Entry>
        ),
        side: (
          <LayoutComposer.Entry id="TypesensePlaygroundSidebarSection">
            <Container className="divide-y p-0">
              <div className="flex items-center justify-between px-6 py-4">
                <Heading level="h2">{studio.playground.playEntity}</Heading>
                <StatusBadge color={studio.healthy ? "green" : "red"}>
                  {studio.healthy
                    ? t("header.healthy")
                    : t("header.unreachable")}
                </StatusBadge>
              </div>

              <SectionRow
                title={t("playground.modeLabel")}
                value={
                  <Badge size="xsmall" color="blue">
                    {studio.playground.playMode}
                  </Badge>
                }
              />
              <SectionRow
                title={t("playground.alphaLabel")}
                value={studio.playground.playAlpha}
              />
              <SectionRow
                title={t("overview.documents")}
                value={String(activeCol?.numDocuments ?? 0)}
              />
              {activeCol?.hasVectorEmbedder && (
                <SectionRow
                  title="Vector AI"
                  value={
                    <Badge size="xsmall" color="purple">
                      {activeCol.embedderModel || "Enabled"}
                    </Badge>
                  }
                />
              )}
            </Container>
          </LayoutComposer.Entry>
        ),
      }}
    />
  )
}

const Breadcrumb = () => {
  const { t } = useTranslation()
  return t("tabs.playground")
}

export const config = defineRouteConfig({
  label: "tabs.playground",
  translationNs: "typesense",
  icon: CommandLine,
})

export const handle = {
  breadcrumb: () => <Breadcrumb />,
}

export default TypesensePlaygroundPage
