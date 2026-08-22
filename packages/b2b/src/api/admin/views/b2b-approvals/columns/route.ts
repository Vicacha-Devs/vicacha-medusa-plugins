import type { MedusaRequest, MedusaResponse } from "@medusajs/framework"

export const GET = async (_req: MedusaRequest, res: MedusaResponse) => {
  const response = {
    columns: [
      {
        id: "id",
        field: "id",
        name: "ID",
        data_type: "string",
        render_mode: "b2b-short-id",
        sortable: false,
        hideable: false,
        default_visible: true,
        default_order: 10,
        filter: { enabled: false },
      },
      {
        id: "updated_at",
        field: "updated_at",
        name: "Updated At",
        data_type: "date",
        render_mode: "date",
        sortable: true,
        hideable: true,
        default_visible: true,
        default_order: 20,
        filter: { enabled: false },
      },
      {
        id: "company.name",
        field: "company.name",
        name: "Company",
        data_type: "string",
        render_mode: "text",
        sortable: false,
        hideable: true,
        default_visible: true,
        default_order: 30,
        filter: { enabled: false },
      },
      {
        id: "approval_status.status",
        field: "approval_status.status",
        name: "Status",
        data_type: "enum",
        render_mode: "b2b-approval-status",
        sortable: false,
        hideable: true,
        default_visible: true,
        default_order: 40,
        filter: {
          enabled: true,
          enumValues: ["pending", "approved", "rejected"],
        },
      },
      {
        id: "items",
        field: "items",
        name: "Items",
        data_type: "object",
        render_mode: "b2b-items",
        sortable: false,
        hideable: true,
        default_visible: true,
        default_order: 50,
        filter: { enabled: false },
      },
    ],
  }

  return res.json(response)
}
