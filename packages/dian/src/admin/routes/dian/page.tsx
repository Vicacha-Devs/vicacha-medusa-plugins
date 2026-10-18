import React, { useState } from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CORE_LAYOUT_IDS } from "@medusajs/admin-shared"
import { LayoutComposer } from "@medusajs/dashboard/components"
import { DocumentText } from "@medusajs/icons"
import { useTranslation } from "react-i18next"
import {
  useDianConfig,
  useDianDocuments,
  useDianResolutions,
} from "../../../hooks"
import {
  DianDocumentsTableSection,
  DianOverviewSection,
} from "../../components"

const DianMainPage: React.FC = () => {
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const { config } = useDianConfig()
  const { resolutions } = useDianResolutions()
  const { documents, loading, refresh } = useDianDocuments({
    document_type: typeFilter !== "all" ? typeFilter : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  })

  return (
    <LayoutComposer
      widgetsZonePrefix="dian.list"
      preferredLayoutId={CORE_LAYOUT_IDS.SINGLE_COLUMN}
      sections={{
        main: (
          <>
            <LayoutComposer.Entry id="DianOverviewSection">
              <DianOverviewSection
                config={config}
                documents={documents}
                resolutions={resolutions}
              />
            </LayoutComposer.Entry>
            <LayoutComposer.Entry id="DianDocumentsTableSection">
              <DianDocumentsTableSection
                documents={documents}
                loading={loading}
                typeFilter={typeFilter}
                setTypeFilter={setTypeFilter}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                onRefresh={() => void refresh()}
              />
            </LayoutComposer.Entry>
          </>
        ),
      }}
    />
  )
}

const Breadcrumb = () => {
  const { t } = useTranslation()
  return t("dian.nav.label")
}

export const config = defineRouteConfig({
  label: "dian.nav.label",
  icon: DocumentText,
  translationNs: "dian",
})

export const handle = {
  breadcrumb: () => <Breadcrumb />,
}

export default DianMainPage
