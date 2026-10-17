import * as React from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CORE_LAYOUT_IDS } from "@medusajs/admin-shared"
import { LayoutComposer } from "@medusajs/dashboard/components"
import {
  CheckCircle,
  DocumentText,
  MediaPlay,
  Photo,
  Tag,
} from "@medusajs/icons"
import { Button, Container, Heading, Text, Toaster } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { NavigationCard, StatCard } from "../../components"
import { useProductExtStudio } from "../../hooks/use-product-ext-studio"

const ProductExtOverviewPage = () => {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const studio = useProductExtStudio()

  const isRtl = (i18n.resolvedLanguage || i18n.language || "").startsWith("ar")

  return (
    <LayoutComposer
      widgetsZonePrefix="product_ext.overview"
      preferredLayoutId={CORE_LAYOUT_IDS.SINGLE_COLUMN}
      sections={{
        main: (
          <LayoutComposer.Entry id="ProductExtOverview">
            <div className="flex flex-col gap-y-4" dir={isRtl ? "rtl" : "ltr"}>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <Heading className="font-sans font-medium h1-core">
                    {t("header.title")}
                  </Heading>
                  <Text className="text-ui-fg-subtle mt-1">
                    {t("header.subtitle")}
                  </Text>
                </div>
                <Button
                  variant="secondary"
                  size="small"
                  isLoading={studio.isBusy}
                  onClick={studio.onRefresh}
                >
                  {t("header.refresh")}
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <StatCard
                  title={t("attributesTab.createTitle")}
                  value={studio.attributes.length}
                  icon={<Tag />}
                  loading={studio.isBusy}
                  onClick={() => navigate("/product-ext/attributes")}
                />
                <StatCard
                  title={t("templatesTab.createTitle")}
                  value={studio.templates.length}
                  icon={<DocumentText />}
                  loading={studio.isBusy}
                  onClick={() => navigate("/product-ext/templates")}
                />
                <StatCard
                  title={t("featuresTab.createTitle")}
                  value={studio.features.length}
                  icon={<CheckCircle />}
                  loading={studio.isBusy}
                  onClick={() => navigate("/product-ext/features")}
                />
                <StatCard
                  title={t("tabs.variantMedia")}
                  value="CSV / Media"
                  icon={<MediaPlay />}
                  loading={studio.isBusy}
                  onClick={() => navigate("/product-ext/variant-media")}
                />
              </div>

              <Container className="p-0 overflow-hidden">
                <div className="px-6 py-5 border-b border-ui-border-base">
                  <Heading level="h2">{t("nav.label")}</Heading>
                  <Text className="text-ui-fg-subtle mt-1">
                    {t("header.subtitle")}
                  </Text>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2">
                  <NavigationCard
                    icon={<Tag />}
                    title={t("tabs.attributes", {
                      count: studio.attributes.length,
                    })}
                    description={t("attributesTab.createTitle")}
                    onClick={() => navigate("/product-ext/attributes")}
                    position="top-left"
                  />
                  <NavigationCard
                    icon={<DocumentText />}
                    title={t("tabs.templates", {
                      count: studio.templates.length,
                    })}
                    description={t("templatesTab.createTitle")}
                    onClick={() => navigate("/product-ext/templates")}
                    position="top-right"
                  />
                  <NavigationCard
                    icon={<CheckCircle />}
                    title={t("tabs.features", {
                      count: studio.features.length,
                    })}
                    description={t("featuresTab.createTitle")}
                    onClick={() => navigate("/product-ext/features")}
                    position="middle-left"
                  />
                  <NavigationCard
                    icon={<MediaPlay />}
                    title={t("tabs.variantMedia")}
                    description={t("variantMediaTab.subtitle")}
                    onClick={() => navigate("/product-ext/variant-media")}
                    position="middle-right"
                  />
                  <NavigationCard
                    icon={<Photo />}
                    title={t("tabs.imageAlts")}
                    description={t("imageAltsTab.subtitle")}
                    onClick={() => navigate("/product-ext/image-alts")}
                    position="bottom-left"
                  />
                </div>
              </Container>
            </div>
            <Toaster />
          </LayoutComposer.Entry>
        ),
      }}
    />
  )
}

const Breadcrumb = () => {
  const { t } = useTranslation()
  return t("nav.label")
}

export const config = defineRouteConfig({
  label: "nav.label",
  translationNs: "product-ext",
  icon: Tag,
})

export const handle = {
  breadcrumb: () => <Breadcrumb />,
}

export default ProductExtOverviewPage
