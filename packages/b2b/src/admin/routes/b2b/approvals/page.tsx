import { defineRouteConfig } from "@medusajs/admin-sdk";
import { CORE_LAYOUT_IDS } from "@medusajs/admin-shared";
import { ConfigurableDataTable, LayoutComposer } from "@medusajs/dashboard/components";
import { CheckCircle } from "@medusajs/icons";
import { Toaster } from "@medusajs/ui";
import { useTranslation } from "react-i18next";

import { useFeatureFlag } from "../../../hooks/api";
import { ApprovalsTable } from "./components/approvals-table.tsx";
import { useApprovalsTableAdapter } from "./components/approvals-table-adapter.tsx";

const Approvals = () => {
  const { t } = useTranslation();
  const isViewConfigEnabled = useFeatureFlag("view_configurations");
  const adapter = useApprovalsTableAdapter();

  return (
    <LayoutComposer
      widgetsZonePrefix="approvals_list.list"
      preferredLayoutId={CORE_LAYOUT_IDS.SINGLE_COLUMN}
      sections={{
        main: (
          <LayoutComposer.Entry id="ApprovalsListTable">
            {isViewConfigEnabled ? (
              <ConfigurableDataTable
                adapter={adapter}
                heading={t("approvals.title")}
                subHeading={t("overview.nav.approvals.description")}
              />
            ): (
              <ApprovalsTable />
            )}
            <Toaster />
          </LayoutComposer.Entry>
        )
      }}
    />
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
