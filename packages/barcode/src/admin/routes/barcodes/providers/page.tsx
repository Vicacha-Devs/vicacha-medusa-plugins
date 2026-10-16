import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CORE_LAYOUT_IDS } from "@medusajs/admin-shared"
import { LayoutComposer } from "@medusajs/dashboard/components"
import { CheckCircle } from "@medusajs/icons"
import { Toaster } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

import {
  ProvidersCacheSection,
  ProvidersRegistrySection,
} from "../../../components"
import { useBarcodeStudio } from "../../../hooks/use-barcode-studio"

const BarcodeProvidersPage = () => {
  const studio = useBarcodeStudio()

  return (
    <>
      <Toaster />
      <LayoutComposer
        widgetsZonePrefix="barcodes.providers.details"
        preferredLayoutId={CORE_LAYOUT_IDS.TWO_COLUMN}
        sections={{
          main: (
            <LayoutComposer.Entry id="BarcodeProvidersCacheSection">
              <ProvidersCacheSection
                cacheEntries={studio.cacheEntries}
                onPurgeExpired={() => void studio.handlePurgeCache(false)}
                onClearAllCache={() => void studio.handlePurgeCache(true)}
              />
            </LayoutComposer.Entry>
          ),
          side: (
            <LayoutComposer.Entry id="BarcodeProvidersRegistrySection">
              <ProvidersRegistrySection overview={studio.overview} />
            </LayoutComposer.Entry>
          ),
        }}
      />
    </>
  )
}

const Breadcrumb = () => {
  const { t } = useTranslation()
  return t("providersTab.providersTitle")
}

export const config = defineRouteConfig({
  label: "providersTab.providersTitle",
  translationNs: "barcodes",
  icon: CheckCircle,
})

export const handle = {
  breadcrumb: () => <Breadcrumb />,
}

export default BarcodeProvidersPage
