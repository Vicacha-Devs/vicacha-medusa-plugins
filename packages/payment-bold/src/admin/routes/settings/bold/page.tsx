import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Container,
  Heading,
  Badge,
  StatusBadge,
  Text,
  Alert,
  Button,
} from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { usePaymentProviders } from "@vicacha-devs/medusa-shared-admin/admin"

import { EBoldPaymentProvider } from "../../../../types"
import { isUnauthorizedError, getActiveBoldProviders } from "../../../../lib"
import { useBoldPaymentMethods, useBoldTerminals } from "../../../../hooks"
import { BoldFavIcon } from "../../../components/icons/bold-fav"
import BoldTerminalStatusWidget from "../../../components/bold-terminal-status"

const ProviderCard = ({
  title,
  providerId,
  isEnabled,
}: {
  title: string
  providerId: string
  isEnabled: boolean
}) => (
  <div className="p-3 border border-ui-border-base bg-ui-bg-base rounded-md space-y-2">
    <div className="flex items-center justify-between">
      <Text className="text-xs font-semibold text-ui-fg-base">{title}</Text>
      <StatusBadge color={isEnabled ? "green" : "grey"} />
    </div>
    <Text className="text-[10px] font-mono text-ui-fg-subtle truncate">{providerId}</Text>
  </div>
)

export const BoldSettingsPage = () => {
  const { t } = useTranslation()

  // 1. Fetch Registered Medusa Payment Providers
  const { providers = [], isLoading: isLoadingProviders } = usePaymentProviders()
  const activeBoldProviders = getActiveBoldProviders(providers)

  // 2. Query Live Terminals and Payment Methods from Bold API
  const { refetch: refetchTerminals } = useBoldTerminals()

  const {
    data: paymentMethodsData,
    isLoading: isLoadingMethods,
    error: methodsError,
    refetch: refetchMethods,
  } = useBoldPaymentMethods()

  const paymentMethods = Array.isArray(paymentMethodsData)
    ? paymentMethodsData
    : paymentMethodsData || []

  const isMethodsUnauthorized = isUnauthorizedError(methodsError)

  const handleRefresh = () => {
    refetchTerminals()
    refetchMethods()
  }

  return (
    <Container className="p-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-ui-border-base">
        <div>
          <Heading level="h1" className="text-xl font-semibold text-ui-fg-base">
            {t("bold.admin.settings.title", { defaultValue: "Bold Colombia Settings" })}
          </Heading>
          <Text className="text-xs text-ui-fg-subtle">
            {t("bold.admin.settings.subtitle", {
              defaultValue:
                "Manage active payment providers, POS terminal fleet, and available payment methods.",
            })}
          </Text>
        </div>

        <Button size="small" variant="secondary" onClick={handleRefresh}>
          {t("bold.admin.settings.refresh", { defaultValue: "Refresh Status" })}
        </Button>
      </div>

      {/* Top Grid: Enabled Providers & Available Methods */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Enabled Providers */}
        <div className="lg:col-span-2 border border-ui-border-base rounded-lg p-5 bg-ui-bg-subtle/30 space-y-4">
          <Heading level="h2" className="text-base font-semibold text-ui-fg-base">
            {t("bold.admin.settings.enabled_providers", { defaultValue: "Enabled Providers" })}
          </Heading>

          {isLoadingProviders ? (
            <Text className="text-xs text-ui-fg-subtle">
              {t("bold.admin.settings.loading", { defaultValue: "Loading providers..." })}
            </Text>
          ) : activeBoldProviders.length === 0 ? (
            <Text className="text-xs text-ui-fg-subtle">
              {t("bold.admin.settings.no_providers", {
                defaultValue: "No Bold payment providers registered in Medusa configuration.",
              })}
            </Text>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <ProviderCard
                title="Payment Link"
                providerId={EBoldPaymentProvider.LINK}
                isEnabled={activeBoldProviders.includes(EBoldPaymentProvider.LINK)}
              />
              <ProviderCard
                title="QR Code / Online"
                providerId={EBoldPaymentProvider.ONLINE}
                isEnabled={activeBoldProviders.includes(EBoldPaymentProvider.ONLINE)}
              />
              <ProviderCard
                title="Data-phone Terminal"
                providerId={EBoldPaymentProvider.TERMINAL}
                isEnabled={activeBoldProviders.includes(EBoldPaymentProvider.TERMINAL)}
              />
              <ProviderCard
                title="Bold Button"
                providerId={EBoldPaymentProvider.BUTTON || "pp_bold-button"}
                isEnabled={activeBoldProviders.includes(
                  EBoldPaymentProvider.BUTTON || ("pp_bold-button" as any)
                )}
              />
            </div>
          )}
        </div>

        {/* Available Payment Methods (Inlined Callout inside card) */}
        <div className="border border-ui-border-base rounded-lg p-5 bg-ui-bg-subtle/30 space-y-4">
          <Heading level="h2" className="text-base font-semibold text-ui-fg-base">
            {t("bold.admin.settings.available_methods", { defaultValue: "Available Payment Methods" })}
          </Heading>

          {isLoadingMethods ? (
            <Text className="text-xs text-ui-fg-subtle">
              {t("bold.admin.settings.loading", { defaultValue: "Querying Bold API..." })}
            </Text>
          ) : isMethodsUnauthorized ? (
            <div className="p-3 bg-ui-bg-base border border-ui-border-base rounded-md space-y-2">
              <div className="flex items-center gap-x-1.5 text-xs font-semibold text-ui-fg-error">
                <span>{t("bold.admin.settings.unauthorized_short", { defaultValue: "API Access Pending (403)" })}</span>
              </div>
              <Text className="text-[11px] text-ui-fg-subtle leading-normal">
                {t("bold.admin.settings.unauthorized_methods_desc", {
                  defaultValue:
                    "Please ensure Online Payments (API de Pagos en Línea) is activated in your Bold Merchant Portal.",
                })}
              </Text>
              <a
                href="https://developers.bold.co/pagos-en-linea/api-de-pagos-en-linea/activacion"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-medium text-ui-fg-interactive hover:underline block pt-0.5"
              >
                {t("bold.admin.settings.enable_payments_link", {
                  defaultValue: "Enable Online Payments API →",
                })}
              </a>
            </div>
          ) : paymentMethods.length === 0 ? (
            <Text className="text-xs text-ui-fg-subtle">
              {t("bold.admin.settings.no_methods", { defaultValue: "No payment methods returned." })}
            </Text>
          ) : (
            <div className="space-y-2">
              {paymentMethods.map((method: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-md bg-ui-bg-base border border-ui-border-base text-xs"
                >
                  <span className="font-medium text-ui-fg-base">{method.name}</span>
                  <Badge color={method.status === "ENABLED" ? "green" : "grey"} size="small">
                    {method.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Terminal Fleet Widget Section */}
      <BoldTerminalStatusWidget />
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Bold",
  icon: BoldFavIcon,
})

export default BoldSettingsPage
