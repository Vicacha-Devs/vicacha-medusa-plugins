import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CORE_LAYOUT_IDS } from "@medusajs/admin-shared"
import { LayoutComposer, SectionRow } from "@medusajs/dashboard/components"
import { Tag } from "@medusajs/icons"
import { Badge, Container, Heading, StatusBadge, Toaster } from "@medusajs/ui"
import React from "react"
import { useTranslation } from "react-i18next"
import { useSearchParams } from "react-router-dom"

import { MerchandisingTab } from "../../../components/typesense/merchandising-tab"
import { useTypesenseStudio } from "../../../components/typesense/use-typesense-studio"

const TypesenseMerchandisingPage: React.FC = () => {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const initialQuery = searchParams.get("synonym") || undefined
  const studio = useTypesenseStudio(initialQuery)

  const currentCol = studio.collections.find(
    (c) => c.entity === studio.merchandising.merchEntity
  )

  return (
    <>
      <Toaster />
      <LayoutComposer
        widgetsZonePrefix="typesense.merchandising"
        preferredLayoutId={CORE_LAYOUT_IDS.TWO_COLUMN}
        sections={{
          main: (
            <LayoutComposer.Entry id="TypesenseMerchandisingMainSection">
              <MerchandisingTab
                collections={studio.collections}
                merchEntity={studio.merchandising.merchEntity}
                setMerchEntity={studio.merchandising.setMerchEntity}
                synonyms={studio.merchandising.synonyms}
                curations={studio.merchandising.curations}
                stopwords={studio.merchandising.stopwords}
                synId={studio.merchandising.synId}
                setSynId={studio.merchandising.setSynId}
                synRoot={studio.merchandising.synRoot}
                setSynRoot={studio.merchandising.setSynRoot}
                synTerms={studio.merchandising.synTerms}
                setSynTerms={studio.merchandising.setSynTerms}
                curId={studio.merchandising.curId}
                setCurId={studio.merchandising.setCurId}
                curQuery={studio.merchandising.curQuery}
                setCurQuery={studio.merchandising.setCurQuery}
                curMatch={studio.merchandising.curMatch}
                setCurMatch={studio.merchandising.setCurMatch}
                curIncludesStr={studio.merchandising.curIncludesStr}
                setCurIncludesStr={studio.merchandising.setCurIncludesStr}
                curExcludesStr={studio.merchandising.curExcludesStr}
                setCurExcludesStr={studio.merchandising.setCurExcludesStr}
                curBannerTitle={studio.merchandising.curBannerTitle}
                setCurBannerTitle={studio.merchandising.setCurBannerTitle}
                stopId={studio.merchandising.stopId}
                setStopId={studio.merchandising.setStopId}
                stopWordsStr={studio.merchandising.stopWordsStr}
                setStopWordsStr={studio.merchandising.setStopWordsStr}
                savingSynonym={studio.merchandising.savingSynonym}
                savingCuration={studio.merchandising.savingCuration}
                savingStopwords={studio.merchandising.savingStopwords}
                onCreateSynonym={(e) =>
                  void studio.merchandising.handleCreateSynonym(e)
                }
                onDeleteSynonym={(id) =>
                  void studio.merchandising.handleDeleteSynonym(id)
                }
                onCreateCuration={(e) =>
                  void studio.merchandising.handleCreateCuration(e)
                }
                onDeleteCuration={(id) =>
                  void studio.merchandising.handleDeleteCuration(id)
                }
                onCreateStopwords={(e) =>
                  void studio.merchandising.handleCreateStopwords(e)
                }
                onDeleteStopwords={(id) =>
                  void studio.merchandising.handleDeleteStopwords(id)
                }
              />
            </LayoutComposer.Entry>
          ),
          side: (
            <LayoutComposer.Entry id="TypesenseMerchandisingSidebarSection">
              <Container className="divide-y p-0">
                <div className="flex items-center justify-between px-6 py-4">
                  <Heading level="h2">
                    {studio.merchandising.merchEntity}
                  </Heading>
                  <StatusBadge
                    color={currentCol?.physicalCollection ? "green" : "orange"}
                  >
                    {currentCol?.physicalCollection
                      ? t("overview.indexedBadge")
                      : t("overview.notIndexedBadge")}
                  </StatusBadge>
                </div>

                <SectionRow
                  title={t("overview.documents")}
                  value={String(currentCol?.numDocuments ?? 0)}
                />
                <SectionRow
                  title={t("overview.synonyms")}
                  value={
                    <Badge size="xsmall" color="grey">
                      {studio.merchandising.synonyms.length}
                    </Badge>
                  }
                />
                <SectionRow
                  title={t("overview.curations")}
                  value={
                    <Badge size="xsmall" color="grey">
                      {studio.merchandising.curations.length}
                    </Badge>
                  }
                />
                <SectionRow
                  title={t("merchandising.stopwordsTitle")}
                  value={
                    <Badge size="xsmall" color="grey">
                      {studio.merchandising.stopwords.length}
                    </Badge>
                  }
                />
              </Container>
            </LayoutComposer.Entry>
          ),
        }}
      />
    </>
  )
}

const Breadcrumb = () => {
  const { t } = useTranslation()
  return t("tabs.merchandising")
}

export const config = defineRouteConfig({
  label: "tabs.merchandising",
  translationNs: "typesense",
  icon: Tag,
})

export const handle = {
  breadcrumb: () => <Breadcrumb />,
}

export default TypesenseMerchandisingPage
