import { MedusaError } from "@medusajs/framework/utils";
import { createStep } from "@medusajs/framework/workflows-sdk";
import { QueryQuote } from "@b2b/types";

export const validateQuoteAcceptanceStep = createStep(
  "validate-quote-acceptance",
  async function ({ quote }: { quote: QueryQuote }) {
    if (quote.expires_at && new Date(quote.expires_at) < new Date()) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Cannot accept an expired quote"
      );
    }

    if (!["pending_customer"].includes(quote.status)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Cannot accept quote when quote status is ${quote.status}`
      );
    }
  }
);
