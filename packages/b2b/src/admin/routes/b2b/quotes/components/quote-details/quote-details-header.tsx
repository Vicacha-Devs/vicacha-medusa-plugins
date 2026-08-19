import { EllipsisHorizontal, PencilSquare } from "@medusajs/icons";
import { DropdownMenu, Heading, IconButton } from "@medusajs/ui";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AdminQuoteResponse } from "@/../types";
import QuoteStatusBadge from "../quote-status-badge.tsx";

export const QuoteDetailsHeader = ({
  quote,
}: {
  quote: AdminQuoteResponse["quote"];
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between px-6 py-4">
      <Heading level="h2">{t("quotes.summary.title")}</Heading>

      <div className="flex items-center gap-x-4">
        <div className="flex items-center gap-x-1.5">
          <QuoteStatusBadge status={quote.status} />
        </div>

        <DropdownMenu>
          <DropdownMenu.Trigger asChild>
            <IconButton variant="transparent">
              <EllipsisHorizontal />
            </IconButton>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            <DropdownMenu.Item
              className="gap-x-2"
              onClick={() => navigate(`manage`)}
              disabled={
                ![
                  "pending_merchant",
                  "customer_rejected",
                  "merchant_rejected",
                ].includes(quote.status)
              }
            >
              <PencilSquare />
              {t("quotes.summary.manage")}
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu>
      </div>
    </div>
  );
};
