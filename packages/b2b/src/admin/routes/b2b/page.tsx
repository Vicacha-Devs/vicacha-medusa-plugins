import { defineRouteConfig } from "@medusajs/admin-sdk";
import {
  BuildingStorefront,
  CheckCircle,
  DocumentText,
  Tag,
  Users,
} from "@medusajs/icons";
import {
  Container,
  Heading,
  Skeleton,
  Text,
} from "@medusajs/ui";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  useCompanies,
  useQuotes,
  useApprovals,
} from "../../hooks/api";
import { EQuoteStatus } from "../../../types";
import { ApprovalStatusType } from "../../../types";

const B2BOverview = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

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
    <div className="flex flex-col gap-y-4">
      <div>
        <Heading className="font-sans font-medium h1-core">
          {t("overview.title")}
        </Heading>

        <Text className="text-ui-fg-subtle mt-1">
          {t("overview.subtitle")}
        </Text>
      </div>

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
    </div>
  );
};

type StatCardProps = {
  title: string;
  value: number;
  icon: React.ReactNode;
  loading?: boolean;
  onClick?: () => void;
};

const StatCard = ({
  title,
  value,
  icon,
  loading = false,
  onClick,
}: StatCardProps) => {
  return (
    <Container
      className={[
        "p-0",
        onClick ? "cursor-pointer hover:bg-ui-bg-subtle-hover transition-colors" : "",
      ].join(" ")}
      onClick={onClick}
    >
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

type Position = "top-left" | "top-right" | "bottom-left" | "bottom-right";

type NavigationCardProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  position: Position;
};

const NavigationCard = ({
  icon,
  title,
  description,
  onClick,
  position,
}: NavigationCardProps) => {
  const isBottom = position === "bottom-left" || position === "bottom-right";
  const isLeft = position === "top-left" || position === "bottom-left";

  return (
    <button
      type="button"
      className={[
        "text-left p-6 hover:bg-ui-bg-subtle-hover transition-colors",
        !isBottom ? "border-b border-ui-border-base" : "",
        isLeft ? "md:border-r md:border-ui-border-base" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={onClick}
    >
      <div className="flex items-start gap-x-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-md bg-ui-bg-subtle shrink-0">
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
