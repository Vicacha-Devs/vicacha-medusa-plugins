import { useParams } from "react-router-dom";
import { RouteFocusModal } from "@vicacha-devs/shared/admin";
import { useQuote } from "../../../../../hooks/api/quotes.tsx";
import { ManageQuoteForm } from "../../components/index.ts";

const QuoteManage = () => {
  const { quoteId } = useParams();
  const { quote, isLoading } = useQuote(quoteId!, {
    fields:
      "*draft_order.customer,*draft_order.customer.employee,*draft_order.customer.employee.company",
  });

  if (isLoading) {
    return <></>;
  }

  if (!quote) {
    throw "quote not found";
  }

  return (
    <RouteFocusModal>
      <ManageQuoteForm order={quote.draft_order} />
    </RouteFocusModal>
  );
};

export default QuoteManage;
