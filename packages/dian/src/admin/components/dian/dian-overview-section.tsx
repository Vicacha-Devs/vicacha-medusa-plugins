import { Badge, Button, Container, Heading, Select, Text } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { SUPPORTED_UI_LOCALES } from "../../i18n"

export interface DianOverviewSectionProps {
  config: Record<string, any> | null
  documents: Array<Record<string, any>>
  resolutions: Array<Record<string, any>>
}

export const DianOverviewSection: React.FC<DianOverviewSectionProps> = ({
  config,
  documents,
  resolutions,
}) => {
  const { t, i18n } = useTranslation()
  const currentLang = (i18n.resolvedLanguage || i18n.language || "es").slice(
    0,
    2
  )

  const validatedCount = documents.filter(
    (d) => d.status === "validated"
  ).length
  const contingencyCount = documents.filter(
    (d) => d.status === "contingency"
  ).length
  const activeResolutions = resolutions.filter((r) => r.is_active).length
  const isProd = config?.environment === "1"

  return (
    <Container className="divide-y p-0" dir={i18n.dir()}>
      <div className="flex flex-col gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Heading level="h1">{t("dian.overview.title")}</Heading>
            <Badge color={isProd ? "green" : "orange"}>
              {isProd
                ? t("dian.overview.envProd")
                : t("dian.overview.envTest")}
            </Badge>
          </div>
          <Text size="small" className="text-ui-fg-subtle mt-1">
            {t("dian.overview.subtitle")}
          </Text>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-32">
            <Select
              size="small"
              value={currentLang}
              onValueChange={(lng) => void i18n.changeLanguage(lng)}
            >
              <Select.Trigger>
                <Select.Value placeholder={t("dian.nav.language")} />
              </Select.Trigger>
              <Select.Content>
                {SUPPORTED_UI_LOCALES.map((loc) => (
                  <Select.Item key={loc.code} value={loc.code}>
                    {loc.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </div>
          <Button variant="secondary" size="small" asChild>
            <Link to="/dian/resolutions">
              {t("dian.overview.resolutionsBtn")}
            </Link>
          </Button>
          <Button variant="secondary" size="small" asChild>
            <Link to="/dian/fiscal-profiles">
              {t("dian.overview.fiscalProfilesBtn")}
            </Link>
          </Button>
          <Button variant="secondary" size="small" asChild>
            <Link to="/settings/dian">{t("dian.overview.settingsBtn")}</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 px-6 py-4 sm:grid-cols-4">
        <div className="rounded-lg border p-4">
          <Text size="xsmall" className="text-ui-fg-subtle uppercase">
            {t("dian.overview.issuerCardTitle")}
          </Text>
          <Text weight="plus" className="mt-1">
            {config?.registration_name || t("dian.overview.notConfigured")}
          </Text>
          <Text size="small" className="text-ui-fg-subtle">
            NIT {config?.seller_nit || "-"} - DV {config?.seller_dv || "-"}
          </Text>
        </div>

        <div className="rounded-lg border p-4">
          <Text size="xsmall" className="text-ui-fg-subtle uppercase">
            {t("dian.overview.validatedCardTitle")}
          </Text>
          <Heading level="h2" className="mt-1">
            {validatedCount}
          </Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {t("dian.overview.totalIssued", { count: documents.length })}
          </Text>
        </div>

        <div className="rounded-lg border p-4">
          <Text size="xsmall" className="text-ui-fg-subtle uppercase">
            {t("dian.overview.contingencyCardTitle")}
          </Text>
          <Heading level="h2" className="mt-1">
            {contingencyCount}
          </Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {t("dian.overview.contingencyQueue")}
          </Text>
        </div>

        <div className="rounded-lg border p-4">
          <Text size="xsmall" className="text-ui-fg-subtle uppercase">
            {t("dian.overview.activeResolutionsCardTitle")}
          </Text>
          <Heading level="h2" className="mt-1">
            {activeResolutions}
          </Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {t("dian.overview.providerPrefix", {
              provider: config?.provider || "native_soap",
            })}
          </Text>
        </div>
      </div>
    </Container>
  )
}
