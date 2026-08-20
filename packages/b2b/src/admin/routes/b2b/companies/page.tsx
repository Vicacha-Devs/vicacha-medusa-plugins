import { defineRouteConfig } from "@medusajs/admin-sdk";
import { BuildingStorefront } from "@medusajs/icons";
import { Container, Heading, Toaster } from "@medusajs/ui";
import { useTranslation } from "react-i18next";
import {
  CompaniesTable,
  CompanyCreateDrawer,
} from "./components/index.ts";

const Companies = () => {
  const { t } = useTranslation();

  return (
    <>
      <Container className="flex flex-col p-0 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading className="font-sans font-medium h1-core">
            {t("companies.title")}
          </Heading>

          <CompanyCreateDrawer />
        </div>

        <CompaniesTable />
      </Container>
      <Toaster />
    </>
  );
};

const Breadcrumb = () => {
  const { t } = useTranslation()

  return t("companies.title")
}

export const config = defineRouteConfig({
  label: "Companies",
  icon: BuildingStorefront,
});

export const handle = {
  breadcrumb: () => <Breadcrumb />,
}


export default Companies;
