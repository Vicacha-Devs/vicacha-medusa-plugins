import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CORE_LAYOUT_IDS } from "@medusajs/admin-shared"
import { LayoutComposer } from "@medusajs/dashboard/components"
import { Heading, Text, Button } from "@medusajs/ui"
import { usePaymentProviders } from "@vicacha-devs/medusa-shared-admin/admin"
import { useTranslation } from "react-i18next"

import {
  useBoldIntegrationApiPaymentMethods,
  useBoldPaymentLinkPaymentMethods,
  useBoldTerminals,
} from "../../../../hooks";
import { getActiveBoldProviders } from "../../../../lib"
import { BoldTerminalStatusWidget } from "../../../components";
import { BoldFavIcon } from "../../../components/icons/bold-fav";
import { BoldMethodsSidebar, BoldProvidersSection } from "./components"

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
    refetch: refetchIntegration,
  } = useBoldIntegrationApiPaymentMethods();
  const integrationMethods = Array.isArray(integrationMethodsData)
    ? integrationMethodsData
    : integrationMethodsData || [];

  // 3. Payment Link Methods
  const {
    data: linkMethods,
    isLoading: isLoadingLink,
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
        widgetsZonePrefix="bold.settings.details"
        preferredLayoutId={CORE_LAYOUT_IDS.TWO_COLUMN}
        sections={{
          main: (
            <>
              <BoldProvidersSection
                activeBoldProviders={activeBoldProviders}
                isLoading={isLoadingProviders}
              />
              <BoldTerminalStatusWidget />
            </>
          ),
          side: (
            <BoldMethodsSidebar
              linkMethods={linkMethods}
              isLoadingLink={isLoadingLink}
              integrationMethods={integrationMethods}
              isLoadingIntegration={isLoadingIntegration}
            />
          ),
        }}
      />
    </div>
  );
};

export const config = defineRouteConfig({ label: "Bold", icon: BoldFavIcon });
export default BoldSettingsPage;
