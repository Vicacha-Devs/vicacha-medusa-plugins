import { defineRouteConfig } from "@medusajs/admin-sdk";
import {
  BuildingStorefront,
  CheckCircle,
  DocumentText,
  Tag,
} from "@medusajs/icons";
import {
  Container,
  Heading,
  Skeleton,
  Text,
} from "@medusajs/ui";
import { useTranslation } from "react-i18next";
import {
  useCompanies,
  useQuotes,
  useApprovals,
} from "../../hooks/api";

const B2BOverview = () => {
  const { t } = useTranslation();

  const { data: companiesData, isPending: companiesPending } = useCompanies({
    fields: "*employees",
  });

  const { data: quotesData, isPending: quotesPending } = useQuotes();

  const { data: approvalsData, isPending: approvalsPending } =
    useApprovals();

  const companies = companiesData?.companies ?? [];
  const quotes = quotesData?.quotes ?? [];
  const approvals = approvalsData?.approvals ?? [];

  const isLoading =
    companiesPending || quotesPending || approvalsPending;

  const employeesCount = companies.reduce(
    (total, company) => total + (company.employees?.length ?? 0),
    0
  );

  const pendingQuotes = quotes.filter(
    (quote) =>
      quote.status === "pending" ||
      quote.status === "requested"
  ).length;

  const pendingApprovals = approvals.filter(
    (approval) =>
      approval.status === "pending"
  ).length;

  return (
    <div className="flex flex-col gap-y-4">
      <div>
        <Heading className="font-sans font-medium h1-core">
          {t("overview.title")}
        </Heading>

        <Text className="text-ui-fg-subtle mt-1">
          {t("overview.subtitle")}
        </Text>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title={t("overview.stats.companies")}
          value={companies.length}
          icon={<BuildingStorefront />}
          loading={isLoading}
        />

        <StatCard
          title={t("overview.stats.employees")}
          value={employeesCount}
          icon={<BuildingStorefront />}
          loading={isLoading}
        />

        <StatCard
          title={t("overview.stats.pendingQuotes")}
          value={pendingQuotes}
          icon={<DocumentText />}
          loading={isLoading}
        />

        <StatCard
          title={t("overview.stats.pendingApprovals")}
          value={pendingApprovals}
          icon={<CheckCircle />}
          loading={isLoading}
        />
      </div>

      {/* Navigation */}
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
            href="/app/b2b/companies"
          />

          <NavigationCard
            icon={<DocumentText />}
            title={t("overview.nav.quotes.title")}
            description={t("overview.nav.quotes.description")}
            href="/app/b2b/quotes"
          />

          <NavigationCard
            icon={<CheckCircle />}
            title={t("overview.nav.approvals.title")}
            description={t("overview.nav.approvals.description")}
            href="/app/b2b/approvals"
          />

          <NavigationCard
            icon={<Tag />}
            title={t("overview.nav.pricing.title")}
            description={t("overview.nav.pricing.description")}
            href="/app/b2b/pricing"
          />
        </div>
      </Container>
    </div>
  );
};

type StatCardProps = {
  title: string;
  value: number;
  icon: React.ReactNode;
  loading?: boolean;
};

const StatCard = ({
  title,
  value,
  icon,
  loading = false,
}: StatCardProps) => {
  return (
    <Container className="p-0">
      <div className="p-5">
        <div className="flex items-center justify-between">
          <Text className="text-ui-fg-subtle">{title}</Text>

          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-ui-bg-subtle">
            {icon}
          </div>
        </div>

        <div className="mt-3">
          {loading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <Heading level="h2">{value}</Heading>
          )}
        </div>
      </div>
    </Container>
  );
};

type NavigationCardProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
};

const NavigationCard = ({
  icon,
  title,
  description,
  href,
}: NavigationCardProps) => {
  return (
    <button
      type="button"
      className="text-left p-6 border-b border-ui-border-base md:[&:nth-child(odd)]:border-r hover:bg-ui-bg-subtle-hover transition-colors"
      onClick={() => {
        window.location.href = href;
      }}
    >
      <div className="flex items-start gap-x-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-md bg-ui-bg-subtle">
          {icon}
        </div>

        <div>
          <Heading level="h3">{title}</Heading>

          <Text className="text-ui-fg-subtle mt-1">
            {description}
          </Text>
        </div>
      </div>
    </button>
  );
};

export const config = defineRouteConfig({
  label: "Overview (B2B)",
  icon: BuildingStorefront,
});

export default B2BOverview;
