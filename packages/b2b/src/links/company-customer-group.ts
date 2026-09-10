import { defineLink } from "@medusajs/framework/utils";
import CompanyModule from "@b2b/modules/company";
import CustomerModule from "@medusajs/medusa/customer";

// isList on company side: one CustomerGroup → many Companies, but each Company
// still links to exactly one CustomerGroup (unique constraint on company_id only).
export default defineLink(
  { linkable: CompanyModule.linkable.company, isList: true },
  CustomerModule.linkable.customerGroup
);
