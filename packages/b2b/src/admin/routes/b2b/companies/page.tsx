import { defineRouteConfig } from "@medusajs/admin-sdk";
import { CORE_LAYOUT_IDS } from "@medusajs/admin-shared";
import { ConfigurableDataTable, LayoutComposer } from "@medusajs/dashboard/components";
import { BuildingStorefront } from "@medusajs/icons";
import { Toaster } from "@medusajs/ui";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useFeatureFlag } from "../../../hooks/api";
import { useCompaniesTableAdapter } from "./components/companies-table-adapter";
import { CompaniesTable, CompanyCreateDrawer } from "./components";

const Companies = () => {
  const { t } = useTranslation();
  const [createOpen, setCreateOpen] = useState(false);
  const isViewConfigEnabled = useFeatureFlag("view_configurations");
  const adapter = useCompaniesTableAdapter();

  return (
    <LayoutComposer
      widgetsZonePrefix="companies_list.list"
      preferredLayoutId={CORE_LAYOUT_IDS.SINGLE_COLUMN}
      sections={{
        main: (
          <LayoutComposer.Entry id="CompaniesListTable">
            {isViewConfigEnabled ? (
              <ConfigurableDataTable
                adapter={adapter}
                heading={t("companies.title")}
                subHeading={t("overview.nav.companies.description")}
                actions={[{ label: t("actions.create"), onClick: () => setCreateOpen(true) }]}
              />
            ): (
              <CompaniesTable />
            )}
            <CompanyCreateDrawer open={createOpen} onOpenChange={setCreateOpen} />
            <Toaster />
          </LayoutComposer.Entry>
        )
      }}
    />
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
