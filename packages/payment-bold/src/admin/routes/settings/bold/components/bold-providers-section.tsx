import { Text } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

import { EBoldPaymentProvider } from "../../../../../types"
import { ProviderCard, Section } from "../../../../components"

interface BoldProvidersSectionProps {
  activeBoldProviders: EBoldPaymentProvider[]
  isLoading: boolean
}

const PROVIDERS = [
  EBoldPaymentProvider.LINK,
  EBoldPaymentProvider.ONLINE,
  EBoldPaymentProvider.TERMINAL,
  EBoldPaymentProvider.BUTTON,
]

export const BoldProvidersSection = ({
  activeBoldProviders,
  isLoading,
}: BoldProvidersSectionProps) => {
  const { t } = useTranslation()

  return (
    <Section
      title={t("bold.admin.settings.enabled_providers", {
        defaultValue: "Enabled Providers",
      })}
      description={t("bold.admin.settings.enabled_providers_description", {
        defaultValue: "Active payment provider types",
      })}
    >
      {isLoading ? (
        <div className="p-4">
          <Text className="text-xs text-ui-fg-subtle">
            {t("bold.admin.settings.loading", { defaultValue: "Loading..." })}
          </Text>
        </div>
      ) : activeBoldProviders.length === 0 ? (
        <div className="p-4">
          <Text className="text-xs text-ui-fg-subtle">
            {t("bold.admin.settings.no_providers_configured", {
              defaultValue: "No providers configured",
            })}
          </Text>
        </div>
      ) : (
        <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {PROVIDERS.map((provider) => {
            const providerKey = provider.replace("bold-", "")
            return (
              <ProviderCard
                key={provider}
                title={t(`bold.admin.settings.provider_${providerKey}`, {
                  defaultValue: providerKey,
                })}
                providerId={provider}
                isEnabled={activeBoldProviders.includes(provider)}
              />
            )
          })}
        </div>
      )}
    </Section>
  )
}
