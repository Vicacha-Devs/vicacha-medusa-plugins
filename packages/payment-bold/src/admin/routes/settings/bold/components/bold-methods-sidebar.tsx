import { Text } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

import { MethodItem, Section } from "../../../../components"

interface BoldMethodsSidebarProps {
  linkMethods: Record<string, any> | undefined
  isLoadingLink: boolean
  integrationMethods: Array<{ name: string; enabled?: boolean }>
  isLoadingIntegration: boolean
}

export const BoldMethodsSidebar = ({
  linkMethods,
  isLoadingLink,
  integrationMethods,
  isLoadingIntegration,
}: BoldMethodsSidebarProps) => {
  const { t } = useTranslation()

  return (
    <>
      <Section
        title={t("bold.admin.settings.payment_link_methods", {
          defaultValue: "Payment Link Methods",
        })}
        description={t("bold.admin.settings.payment_link_methods_description", {
          defaultValue: "Online payment methods (QR, Cards, PSE, Nequi)",
        })}
      >
        {isLoadingLink ? (
          <div className="p-4">
            <Text className="text-xs text-ui-fg-subtle">
              {t("bold.admin.settings.loading", { defaultValue: "Loading..." })}
            </Text>
          </div>
        ) : linkMethods && Object.keys(linkMethods).length > 0 ? (
          <div>
            {Object.entries(linkMethods).map(([method], i) => (
              <MethodItem
                key={i}
                name={method}
                status={t("bold.admin.settings.method_status_available", {
                  defaultValue: "Available",
                })}
              />
            ))}
          </div>
        ) : (
          <div className="p-4">
            <Text className="text-xs text-ui-fg-subtle">
              {t("bold.admin.settings.no_methods_available", {
                defaultValue: "No methods available",
              })}
            </Text>
          </div>
        )}
      </Section>

      <Section
        title={t("bold.admin.settings.integration_methods", {
          defaultValue: "Integration API Methods",
        })}
        description={t("bold.admin.settings.integration_methods_description", {
          defaultValue: "POS and terminal payment methods",
        })}
      >
        {isLoadingIntegration ? (
          <div className="p-4">
            <Text className="text-xs text-ui-fg-subtle">
              {t("bold.admin.settings.loading", { defaultValue: "Loading..." })}
            </Text>
          </div>
        ) : integrationMethods.length === 0 ? (
          <div className="p-4">
            <Text className="text-xs text-ui-fg-subtle">
              {t("bold.admin.settings.no_methods_available", {
                defaultValue: "No methods available",
              })}
            </Text>
          </div>
        ) : (
          <div>
            {integrationMethods.map((m, i) => (
              <MethodItem
                key={i}
                name={m.name}
                status={m.enabled ? "Enabled" : "Disabled"}
              />
            ))}
          </div>
        )}
      </Section>
    </>
  )
}
