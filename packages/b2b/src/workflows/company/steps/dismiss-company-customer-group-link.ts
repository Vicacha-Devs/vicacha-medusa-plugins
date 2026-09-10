import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { COMPANY_MODULE } from "@b2b/modules/company"

export const dismissCompanyCustomerGroupLinkStep = createStep(
  "dismiss-company-customer-group-link",
  async (input: { company_id: string }, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const remoteLink = container.resolve(ContainerRegistrationKeys.REMOTE_LINK)

    const { data: [company] } = await query.graph({
      entity: "companies",
      fields: ["id", "customer_group.*"],
      filters: { id: input.company_id },
    })

    const rawGroup = (company as any)?.customer_group
    const existingGroupId: string | undefined = Array.isArray(rawGroup)
      ? rawGroup[0]?.id
      : rawGroup?.id

    if (!existingGroupId) {
      return new StepResponse(null, null)
    }

    await remoteLink.dismiss([
      {
        [COMPANY_MODULE]: { company_id: input.company_id },
        [Modules.CUSTOMER]: { customer_group_id: existingGroupId },
      },
    ])

    return new StepResponse(existingGroupId, { company_id: input.company_id, group_id: existingGroupId })
  },
  async (previous: { company_id: string; group_id: string } | null | undefined, { container }) => {
    if (!previous?.group_id) return
    const remoteLink = container.resolve(ContainerRegistrationKeys.REMOTE_LINK)
    await remoteLink.create([
      {
        [COMPANY_MODULE]: { company_id: previous.company_id },
        [Modules.CUSTOMER]: { customer_group_id: previous.group_id },
      },
    ])
  }
)
