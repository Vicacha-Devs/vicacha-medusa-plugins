import { defineLink } from "@medusajs/framework/utils";
import OrderModule from "@medusajs/medusa/order";
import CompanyModule from "@b2b/modules/company";

export default defineLink(
  OrderModule.linkable.order,
  CompanyModule.linkable.company
);
