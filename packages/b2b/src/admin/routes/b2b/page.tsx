import { defineRouteConfig } from "@medusajs/admin-sdk";
import { CORE_LAYOUT_IDS } from "@medusajs/admin-shared";
import { LayoutComposer } from "@medusajs/dashboard/components";
import {
  BuildingStorefront,
  CheckCircle,
  DocumentText,
  Tag,
  Users,
} from "@medusajs/icons";
import { Container, Heading, Text } from "@medusajs/ui";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import {
  useCompanies,
  useQuotes,
  useApprovals,
} from "../../hooks/api";
import { ApprovalStatusType, EQuoteStatus } from "../../../types";
import { NavigationCard, StatCard } from "./components";

const B2BOverview = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const isRtl = (i18n.resolvedLanguage || i18n.language || "").startsWith("ar");

  const { data: companiesData, isPending: companiesPending } = useCompanies();

  const { count: pendingQuotesCount = 0, isPending: quotesPending } = useQuotes({
    status: [EQuoteStatus.PendingMerchant, EQuoteStatus.PendingCustomer],
  });

  const { data: approvalsData, isPending: approvalsPending } = useApprovals({
    status: ApprovalStatusType.PENDING,
  });

  const companies = companiesData?.companies ?? [];
  const isLoading = companiesPending || quotesPending || approvalsPending;

  const employeesCount = companies.reduce(
    (total: number, company: any) => total + (company.employees_count ?? 0),
    0
  );

  const pendingApprovalsCount = approvalsData?.count ?? 0;

  return (
    <div className="flex flex-col gap-y-4" dir={isRtl ? "rtl" : "ltr"}>
      <div>
        <Heading className="font-sans font-medium h1-core">
          {t("overview.title")}
        </Heading>

        <Text className="text-ui-fg-subtle mt-1">
          {t("overview.subtitle")}
        </Text>
      </div>

      <LayoutComposer
        widgetsZonePrefix="b2b_overview.list"
        preferredLayoutId={CORE_LAYOUT_IDS.SINGLE_COLUMN}
        sections={{
          main: (
            <>
              <LayoutComposer.Entry id="B2BOverviewStats">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  <StatCard
                    title={t("overview.stats.companies")}
                    value={companies.length}
                    icon={<BuildingStorefront />}
                    loading={isLoading}
                    onClick={() => navigate("/b2b/companies")}
                  />

                  <StatCard
                    title={t("overview.stats.employees")}
                    value={employeesCount}
                    icon={<Users />}
                    loading={isLoading}
                  />

                  <StatCard
                    title={t("overview.stats.pendingQuotes")}
                    value={pendingQuotesCount}
                    icon={<DocumentText />}
                    loading={isLoading}
                    onClick={() => navigate("/b2b/quotes")}
                  />

                  <StatCard
                    title={t("overview.stats.pendingApprovals")}
                    value={pendingApprovalsCount}
                    icon={<CheckCircle />}
                    loading={isLoading}
                    onClick={() => navigate("/b2b/approvals")}
                  />
                </div>
              </LayoutComposer.Entry>

              <LayoutComposer.Entry id="B2BOverviewNavigation">
                <Container className="p-0 overflow-hidden">
                  <div className="px-6 py-5 border-b border-ui-border-base">
                    <Heading level="h2">{t("overview.commerce.title")}</Heading>

                    <Text className="text-ui-fg-subtle mt-1">
                      {t("overview.commerce.subtitle")}
                    </Text>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2">
                    <NavigationCard
                      icon={<BuildingStorefront />}
                      title={t("overview.nav.companies.title")}
                      description={t("overview.nav.companies.description")}
                      onClick={() => navigate("/b2b/companies")}
                      position="top-left"
                    />

                    <NavigationCard
                      icon={<DocumentText />}
                      title={t("overview.nav.quotes.title")}
                      description={t("overview.nav.quotes.description")}
                      onClick={() => navigate("/b2b/quotes")}
                      position="top-right"
                    />

                    <NavigationCard
                      icon={<CheckCircle />}
                      title={t("overview.nav.approvals.title")}
                      description={t("overview.nav.approvals.description")}
                      onClick={() => navigate("/b2b/approvals")}
                      position="bottom-left"
                    />

                    <NavigationCard
                      icon={<Tag />}
                      title={t("overview.nav.pricing.title")}
                      description={t("overview.nav.pricing.description")}
                      onClick={() => navigate("/b2b/pricing")}
                      position="bottom-right"
                    />
                  </div>
                </Container>
              </LayoutComposer.Entry>
            </>
          ),
        }}
      />
    </div>
  );
};

const Breadcrumb = () => {
  const { t } = useTranslation();
  return t("overview.title");
};

export const config = defineRouteConfig({
  label: "overview.title",
  translationNs: "b2b",
  icon: BuildingStorefront,
});

export const handle = {
  breadcrumb: () => <Breadcrumb />,
};

export default B2BOverview;
