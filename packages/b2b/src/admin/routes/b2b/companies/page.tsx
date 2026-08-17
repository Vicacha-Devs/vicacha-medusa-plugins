import { defineRouteConfig } from "@medusajs/admin-sdk";
import { BuildingStorefront } from "@medusajs/icons";
import { Container, Heading, Toaster } from "@medusajs/ui";
import {
  CompaniesTable,
  CompanyCreateDrawer,
} from "./components/index.ts";

const Companies = () => {
  return (
    <>
      <Container className="flex flex-col p-0 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading className="font-sans font-medium h1-core">
            Companies
          </Heading>

          <CompanyCreateDrawer />
        </div>

        <CompaniesTable />
      </Container>
      <Toaster />
    </>
  );
};

export const config = defineRouteConfig({
  label: "Companies",
  icon: BuildingStorefront,
});

export default Companies;
