import { defineRouteConfig } from "@medusajs/admin-sdk";
import { CORE_LAYOUT_IDS } from "@medusajs/admin-shared";
import { ConfigurableDataTable, LayoutComposer } from "@medusajs/dashboard/components";
import { DocumentText } from "@medusajs/icons";
import { Toaster } from "@medusajs/ui";
import { useTranslation } from "react-i18next"

import { useFeatureFlag } from "../../../hooks/api/feature-flags.tsx";
import { QuotesTable } from "./components/quotes-table.tsx";
import { useQuotesTableAdapter } from "./components/quotes-table-adapter.tsx";

const Quotes = () => {
  const { t } = useTranslation()
  const isViewConfigEnabled = useFeatureFlag("view_configurations")
  const adapter = useQuotesTableAdapter()

  return (
    <LayoutComposer
      widgetsZonePrefix="quotes_list.list"
      preferredLayoutId={CORE_LAYOUT_IDS.SINGLE_COLUMN}
      sections={{
        main: (
          <LayoutComposer.Entry id="QuotesListTable">
            {isViewConfigEnabled ? (
              <ConfigurableDataTable
                adapter={adapter}
                heading={t("quotes.title")}
                subHeading={t("overview.nav.quotes.description")}
              />
            ): (
              <QuotesTable />
            )}
            <Toaster />
          </LayoutComposer.Entry>
        )
      }}
    />
  );
};

const Breadcrumb = () =>{
  const { t } = useTranslation()

  return t("quotes.title")
}

export const config = defineRouteConfig({
  label: "Quotes",
  icon: DocumentText,
});

export const handle = {
  breadcrumb: () => <Breadcrumb/>,
}


export default Quotes;
