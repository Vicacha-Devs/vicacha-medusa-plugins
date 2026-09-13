import { MedusaContainer } from "@medusajs/framework/types";
import { QUOTE_MODULE } from "@b2b/modules/quote";
import { EQuoteStatus } from "@b2b/types";
import { IQuoteModuleService } from "@b2b/types/quote/service";

export default async function expireQuotesJob(container: MedusaContainer) {
  const quoteModule = container.resolve<IQuoteModuleService>(QUOTE_MODULE);

  const now = new Date().toISOString();

  const expiredQuotes = await quoteModule.listQuotes({
    status: EQuoteStatus.PendingCustomer,
    expires_at: { $lte: now },
  });

  if (!expiredQuotes.length) {
    return;
  }

  await quoteModule.updateQuotes(
    expiredQuotes.map((q) => ({
      id: q.id,
      status: EQuoteStatus.Expired,
    }))
  );
}

export const config = {
  name: "expire-quotes",
  schedule: "0 * * * *",
};
