import { defineRouteConfig } from "@medusajs/admin-sdk";
import { DocumentText } from "@medusajs/icons";
import { Container, Heading, Toaster } from "@medusajs/ui";
import { useTranslation } from "react-i18next";
import { QuotesTable } from "./components/quotes-table.tsx";

const Quotes = () => {
  const { t } = useTranslation();

  return (
    <>
      <Container className="flex flex-col p-0 overflow-hidden">
        <Heading className="p-6 pb-0 font-sans font-medium h1-core">
          {t("quotes.title")}
        </Heading>

        <QuotesTable />
      </Container>
      <Toaster />
    </>
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
