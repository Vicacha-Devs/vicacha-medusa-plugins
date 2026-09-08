export const listQuoteFields = [
  "id",
  "status",
  "customer_id",
  "customer.first_name",
  "customer.last_name",
  "customer.email",
  "customer.employee.id",
  "customer.employee.spending_limit",
  "customer.employee.company.id",
  "customer.employee.company.name",
  "customer.employee.company.currency_code",
  "order_change_id",
  "cart_id",
  "draft_order_id",
  "created_at",
];

export const quoteFields = [
  ...listQuoteFields,
  "updated_at",
  "*messages",
  "cart.id",
  "draft_order.id",
  "draft_order.display_id",
  "draft_order.status",
  "draft_order.currency_code",
  "draft_order.total",
  "draft_order.created_at",
  "*draft_order.items",
  "*draft_order.items.variant",
  "*draft_order.items.variant.product",
  "*draft_order.items.detail",
];

export const retrieveQuoteTransformQueryConfig = {
  defaults: quoteFields,
  isList: false,
};

export const listQuotesTransformQueryConfig = {
  defaults: listQuoteFields,
  isList: true,
};
