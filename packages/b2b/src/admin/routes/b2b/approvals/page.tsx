import { defineRouteConfig } from "@medusajs/admin-sdk";
import { CheckCircle } from "@medusajs/icons";
import { Container, Heading, Toaster } from "@medusajs/ui";
import { useTranslation } from "react-i18next";
import { ApprovalsTable } from "./components/approvals-table.tsx";

const Approvals = () => {
  const { t } = useTranslation();

  return (
    <>
      <Container className="flex flex-col p-0 overflow-hidden">
        <Heading className="p-6 pb-0 font-sans font-medium h1-core">
          {t("approvals.title")}
        </Heading>
        <ApprovalsTable />
      </Container>
      <Toaster />
    </>
  );
};

const Breadcrumb = () => {
  const { t } = useTranslation()

  return t("approvals.title")
}

export const config = defineRouteConfig({
  label: "Approvals",
  icon: CheckCircle,
});

export const handle = {
  breadcrumb: () => <Breadcrumb />,
}


export default Approvals;
