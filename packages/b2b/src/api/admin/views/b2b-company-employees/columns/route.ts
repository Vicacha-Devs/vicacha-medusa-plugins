import type { MedusaRequest, MedusaResponse } from "@medusajs/framework"

export const GET = async (_req: MedusaRequest, res: MedusaResponse) => {
  return res.json({
    columns: [
      {
        id: "name",
        field: "customer",
        name: "Name",
        data_type: "string",
        render_mode: "b2b-employee-name",
        sortable: false,
        hideable: false,
        default_visible: true,
        default_order: 10,
        filter: { enabled: false },
      },
      {
        id: "email",
        field: "customer_id",
        name: "Email",
        data_type: "string",
        render_mode: "b2b-employee-email",
        sortable: false,
        hideable: true,
        default_visible: true,
        default_order: 20,
        filter: { enabled: false },
      },
      {
        id: "spending_limit",
        field: "spending_limit",
        name: "Spending Limit",
        data_type: "number",
        render_mode: "b2b-employee-spending-limit",
        sortable: true,
        hideable: true,
        default_visible: true,
        default_order: 30,
        filter: { enabled: false },
      },
      {
        id: "is_admin",
        field: "is_admin",
        name: "Admin",
        data_type: "boolean",
        render_mode: "b2b-employee-is-admin",
        sortable: true,
        hideable: true,
        default_visible: true,
        default_order: 40,
        filter: {
          enabled: true,
          enumValues: ["true", "false"],
        },
      },
      {
        id: "is_active",
        field: "is_active",
        name: "Active",
        data_type: "boolean",
        render_mode: "b2b-employee-is-active",
        sortable: true,
        hideable: true,
        default_visible: true,
        default_order: 50,
        filter: {
          enabled: true,
          enumValues: ["true", "false"],
        },
      },
    ],
  })
}
