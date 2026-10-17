import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CORE_LAYOUT_IDS } from "@medusajs/admin-shared"
import { LayoutComposer, SectionRow } from "@medusajs/dashboard/components"
import { Swatch } from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  Heading,
  StatusBadge,
  Toaster,
} from "@medusajs/ui"
import React from "react"
import { useTranslation } from "react-i18next"

import { EntitiesTab } from "../../../components/typesense/entities-tab"
import { useTypesenseStudio } from "../../../components/typesense/use-typesense-studio"

const TypesenseEntitiesPage: React.FC = () => {
  const { t } = useTranslation()
  const studio = useTypesenseStudio()

  return (
    <>
      <Toaster />
      <LayoutComposer
        widgetsZonePrefix="typesense.entities"
        preferredLayoutId={CORE_LAYOUT_IDS.TWO_COLUMN}
        sections={{
          main: (
            <LayoutComposer.Entry id="TypesenseEntitiesFormSection">
              <EntitiesTab
                entityKey={studio.entityForm.entityKey}
                setEntityKey={studio.entityForm.setEntityKey}
                graphEntity={studio.entityForm.graphEntity}
                setGraphEntity={studio.entityForm.setGraphEntity}
                graphFieldsStr={studio.entityForm.graphFieldsStr}
                setGraphFieldsStr={studio.entityForm.setGraphFieldsStr}
                queryByStr={studio.entityForm.queryByStr}
                setQueryByStr={studio.entityForm.setQueryByStr}
                facetByStr={studio.entityForm.facetByStr}
                setFacetByStr={studio.entityForm.setFacetByStr}
                enableEmbedder={studio.entityForm.enableEmbedder}
                setEnableEmbedder={studio.entityForm.setEnableEmbedder}
                embedderModel={studio.entityForm.embedderModel}
                setEmbedderModel={studio.entityForm.setEmbedderModel}
                saving={studio.entityForm.saving}
                onSaveEntityConfig={(e) =>
                  void studio.entityForm.handleSaveEntityConfig(e)
                }
              />
            </LayoutComposer.Entry>
          ),
          side: (
            <LayoutComposer.Entry id="TypesenseEntitiesSidebarSection">
              <Container className="divide-y p-0">
                <div className="flex items-center justify-between px-6 py-4">
                  <Heading level="h2">{t("tabs.entities")}</Heading>
                  <StatusBadge color={studio.healthy ? "green" : "red"}>
                    {studio.healthy
                      ? t("header.healthy")
                      : t("header.unreachable")}
                  </StatusBadge>
                </div>

                {studio.collections.map((col) => (
                  <SectionRow
                    key={col.entity}
                    title={col.entity}
                    value={
                      <div className="flex items-center gap-x-2">
                        <Badge
                          size="xsmall"
                          color={col.physicalCollection ? "green" : "orange"}
                        >
                          {col.numDocuments} {t("overview.documents")}
                        </Badge>
                        <Button
                          variant="transparent"
                          size="small"
                          onClick={() =>
                            studio.entityForm.selectEntityConfig(col.entity)
                          }
                        >
                          Edit
                        </Button>
                      </div>
                    }
                  />
                ))}
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
  return t("tabs.entities")
}

export const config = defineRouteConfig({
  label: "tabs.entities",
  translationNs: "typesense",
  icon: Swatch,
})

export const handle = {
  breadcrumb: () => <Breadcrumb />,
}

export default TypesenseEntitiesPage
