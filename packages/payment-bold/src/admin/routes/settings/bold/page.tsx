import { defineRouteConfig } from "@medusajs/admin-sdk";
import { CORE_LAYOUT_IDS } from "@medusajs/admin-shared";
import { LayoutComposer } from "@medusajs/dashboard/components";
import { Heading, Text, Button } from "@medusajs/ui";
import { usePaymentProviders } from "@vicacha-devs/medusa-shared-admin/admin";
import { useTranslation } from "react-i18next";

import { useBoldIntegrationApiPaymentMethods, useBoldPaymentLinkPaymentMethods, useBoldTerminals } from "../../../../hooks";
import { isUnauthorizedError, getActiveBoldProviders } from "../../../../lib";
import { EBoldPaymentProvider } from "../../../../types";
import {
  Section,
  ProviderCard,
  MethodItem,
  BoldTerminalStatusWidget,
} from "../../../components";
import { BoldFavIcon } from "../../../components/icons/bold-fav";

export const BoldSettingsPage = () => {
  const { t } = useTranslation();

  // 1. Payment Providers
  const { providers = [], isLoading: isLoadingProviders } =
    usePaymentProviders();
  const activeBoldProviders = getActiveBoldProviders(providers);

  // 2. Integration API Payment Methods
  const {
    data: integrationMethodsData,
    isLoading: isLoadingIntegration,
    error: integrationError,
    refetch: refetchIntegration,
  } = useBoldIntegrationApiPaymentMethods();
  const integrationMethods = Array.isArray(integrationMethodsData)
    ? integrationMethodsData
    : integrationMethodsData || [];

  // 3. Payment Link Methods
  const {
    data: linkMethods,
    isLoading: isLoadingLink,
    error: paymentLinkError,
    refetch: refetchLink
  } = useBoldPaymentLinkPaymentMethods()

  // 4. Terminals
  const { refetch: refetchTerminals } = useBoldTerminals();

  const handleRefresh = () => {
    refetchTerminals();
    refetchIntegration();
    refetchLink();
  };

  return (
    <div className="flex flex-col gap-y-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-ui-border-base">
        <div className="flex-1">
          <Heading level="h1" className="text-lg font-semibold">
            {t("bold.admin.settings.title", {
              defaultValue: "Bold Colombia Settings",
            })}
          </Heading>
          <Text className="text-xs text-ui-fg-subtle mt-1">
            {t("bold.admin.settings.subtitle", {
              defaultValue: "Manage payment providers and methods.",
            })}
          </Text>
        </div>
        <Button size="small" variant="secondary" onClick={handleRefresh}>
          {t("bold.admin.settings.refresh", { defaultValue: "Refresh" })}
        </Button>
      </div>

      {/* Content */}
      <LayoutComposer
        widgetsZonePrefix="travel_flights_list.list"
        preferredLayoutId={CORE_LAYOUT_IDS.TWO_COLUMN}
        sections={{
          main: (
            <>
              {/* Providers */}
              <Section
                title={t("bold.admin.settings.enabled_providers", {
                  defaultValue: "Enabled Providers",
                })}
                description={t("bold.admin.settings.enabled_providers_description", {
                  defaultValue: "Active payment provider types",
                })}
              >
                {isLoadingProviders ? (
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
                    {[
                      EBoldPaymentProvider.LINK,
                      EBoldPaymentProvider.ONLINE,
                      EBoldPaymentProvider.TERMINAL,
                      EBoldPaymentProvider.BUTTON,
                    ].map((provider) => {
                      const providerKey = provider.replace("bold-", "");
                      return (
                        <ProviderCard
                          key={provider}
                          title={t(`bold.admin.settings.provider_${providerKey}`, {
                            defaultValue: providerKey,
                          })}
                          providerId={provider}
                          isEnabled={activeBoldProviders.includes(provider)}
                        />
                      );
                    })}
                  </div>
                )}
              </Section>
              {/* Terminals */}
              <BoldTerminalStatusWidget />
            </>
          ),
          side: (
            <>
              {/* Integration API Methods */}
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
                ) : isUnauthorizedError(integrationError) ? (
                  <div className="p-4 bg-ui-bg-error/10 border border-ui-border-error rounded text-xs">
                    <Text className="text-ui-fg-error font-medium">
                      {t("bold.admin.settings.unauthorized_short", { defaultValue: "API Access Pending (403)" })}
                    </Text>
                    <Text className="text-ui-fg-subtle mt-1">
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
                    {integrationMethods.map((m: any, i: number) => (
                      <MethodItem key={i} name={m.name} status={m.status} />
                    ))}
                  </div>
                )}
              </Section>

              {/* Payment Link Methods */}
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
                ) : isUnauthorizedError(paymentLinkError) ? (
                  <div className="p-4 bg-ui-bg-error/10 border border-ui-border-error rounded text-xs">
                    <Text className="text-ui-fg-error font-medium">
                      {t("bold.admin.settings.unauthorized_short", { defaultValue: "API Access Pending (403)" })}
                    </Text>
                    <Text className="text-ui-fg-subtle mt-1">
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
                ) : linkMethods?.online_methods?.length ? (
                  <div>
                    {linkMethods.online_methods.map((m: string, i: number) => (
                      <MethodItem
                        key={i}
                        name={m}
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
            </>
          ),
        }}
      />
    </div>
  );
};

export const config = defineRouteConfig({ label: "Bold", icon: BoldFavIcon });
export default BoldSettingsPage;
