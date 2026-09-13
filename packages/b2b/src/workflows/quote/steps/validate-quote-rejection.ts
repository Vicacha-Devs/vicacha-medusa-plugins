import { MedusaError } from "@medusajs/framework/utils";
import { createStep } from "@medusajs/framework/workflows-sdk";
import { QueryQuote } from "@b2b/types";

export const validateQuoteRejectionStep = createStep(
  "validate-quote-rejection",
  async function ({ quote }: { quote: QueryQuote }) {
    if (["accepted", "expired"].includes(quote.status)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        quote.status === "expired"
          ? "Cannot reject an expired quote"
          : "Quote is already accepted by customer"
      );
    }
  }
);
