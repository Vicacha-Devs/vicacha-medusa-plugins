/* Company Query Config */
const adminCompanyBaseFields = [
  "id",
  "name",
  "logo_url",
  "email",
  "phone",
  "address",
  "city",
  "state",
  "zip",
  "country",
  "currency_code",
  "spending_limit_reset_frequency",
  "spending_limit_reset_at",
  "created_at",
  "updated_at",
];

export const adminCompanyListFields = [
  ...adminCompanyBaseFields,
];

export const adminCompanyRemoteLinkFields = [
  "customer_group.id",
  "customer_group.name",
  "approval_settings.*",
];

export const adminCompanyFields = [
  ...adminCompanyBaseFields,
  "*employees",
  "employees.customer.*",
  "customer_group.id",
  "customer_group.name",
  "approval_settings.*",
];

export const adminCompanyDetailRemoteLinkFields = [
  "customer_group.id",
  "customer_group.name",
  "approval_settings.*",
  "employees.customer.*",
];

export const adminCompanyQueryConfig = {
  list: {
    defaults: adminCompanyListFields,
    isList: true,
  },
  retrieve: {
    defaults: adminCompanyFields,
    isList: false,
  },
};

/* Employee Query Config */
export const adminEmployeeFields = [
  "id",
  "spending_limit",
  "is_admin",
  "is_active",
  "company_id",
  "customer.id",
  "customer.first_name",
  "customer.last_name",
  "customer.email",
  "customer.phone",
  "*company",
];

export const adminEmployeeQueryConfig = {
  list: {
    defaults: adminEmployeeFields,
    isList: true,
  },
  retrieve: {
    defaults: adminEmployeeFields,
    isList: false,
  },
};

/* Approval Settings Query Config */
export const adminApprovalSettingsFields = [
  "id",
  "company_id",
  "requires_admin_approval",
  "requires_sales_manager_approval",
  "*company",
];

export const adminApprovalSettingsQueryConfig = {
  list: {
    defaults: adminApprovalSettingsFields,
    isList: true,
  },
  retrieve: {
    defaults: adminApprovalSettingsFields,
    isList: false,
  },
};
