import * as React from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Tabs } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import {
  BarcodeStudioHeader,
  DynamicQrTagsTab,
  GtinLookupTab,
  LabelPrintCenterTab,
  ProvidersCacheTab,
  WarehouseStockTakeTab,
} from "../../components"
import { useBarcodeStudio } from "../../hooks/use-barcode-studio"

const BarcodeStudioPage = () => {
  const { t, i18n } = useTranslation()
  const studio = useBarcodeStudio()

  const isRtl = (i18n.resolvedLanguage || i18n.language || "").startsWith("ar")

  return (
    <div
      className="flex flex-col gap-y-6 p-6"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <BarcodeStudioHeader
        overview={studio.overview}
        lastScanned={studio.lastScanned}
        bannerMessage={studio.bannerMessage}
        bannerTone={studio.bannerTone}
        onDismissBanner={studio.dismissBanner}
        onRefresh={studio.onRefresh}
        onBulkGenerate={() => void studio.handleBulkGenerateBarcodes()}
      />

      <Tabs defaultValue="lookup">
        <Tabs.List>
          <Tabs.Trigger value="lookup">
            {t("tabs.lookup", { count: studio.barcodes.length })}
          </Tabs.Trigger>
          <Tabs.Trigger value="tags">
            {t("tabs.tags", { count: studio.tags.length })}
          </Tabs.Trigger>
          <Tabs.Trigger value="print">{t("tabs.print")}</Tabs.Trigger>
          <Tabs.Trigger value="stock-take">
            {t("tabs.stockTake", { count: studio.sessions.length })}
          </Tabs.Trigger>
          <Tabs.Trigger value="providers">
            {t("tabs.providers", { count: studio.cacheEntries.length })}
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="lookup">
          <GtinLookupTab
            form={studio.lookupForm}
            onFormChange={studio.setLookupForm}
            lookupResult={studio.lookupResult}
            barcodes={studio.barcodes}
            onLookup={() => void studio.handleLookupBarcode()}
            onCreateProduct={() => void studio.handleCreateProductFromBarcode()}
            onBatchImport={() => void studio.handleBatchImport()}
          />
        </Tabs.Content>

        <Tabs.Content value="tags">
          <DynamicQrTagsTab
            form={studio.tagForm}
            onFormChange={studio.setTagForm}
            tags={studio.tags}
            onCreateTag={() => void studio.handleCreateTag()}
            onDeleteTag={(id) => void studio.handleDeleteTag(id)}
          />
        </Tabs.Content>

        <Tabs.Content value="print">
          <LabelPrintCenterTab
            form={studio.printForm}
            onFormChange={studio.setPrintForm}
            templates={studio.templates}
            output={studio.printOutput}
            onRenderLabels={() => void studio.handleRenderLabels()}
          />
        </Tabs.Content>

        <Tabs.Content value="stock-take">
          <WarehouseStockTakeTab
            form={studio.countForm}
            onFormChange={studio.setCountForm}
            sessions={studio.sessions}
            selectedSessionId={studio.selectedSessionId}
            onSelectSession={studio.setSelectedSessionId}
            onCreateSession={() => void studio.handleCreateCountSession()}
            onScanDelta={(delta) => void studio.handleScanIntoSession(delta)}
            onApplySession={(id) => void studio.handleApplyCountSession(id)}
          />
        </Tabs.Content>

        <Tabs.Content value="providers">
          <ProvidersCacheTab
            overview={studio.overview}
            cacheEntries={studio.cacheEntries}
            onPurgeExpired={() => void studio.handlePurgeCache(false)}
            onClearAllCache={() => void studio.handlePurgeCache(true)}
          />
        </Tabs.Content>
      </Tabs>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "nav.label",
  translationNs: "barcodes",
})

export default BarcodeStudioPage
