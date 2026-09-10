import { ICustomerModuleService } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

type Input = { customerId: string; companyName: string | null }

export const syncCustomerCompanyNameStep = createStep(
  "sync-customer-company-name",
  async ({ customerId, companyName }: Input, { container }) => {
    const customerModule = container.resolve<ICustomerModuleService>(Modules.CUSTOMER)

    const [previous] = await customerModule.listCustomers(
      { id: customerId },
      { select: ["id", "company_name"] }
    )

    await customerModule.updateCustomers(customerId, { company_name: companyName ?? "" })

    return new StepResponse(
      { customerId, companyName },
      { customerId, companyName: previous?.company_name ?? null }
    )
  },
  async (previous: Input | undefined, { container }) => {
    if (!previous) return
    const customerModule = container.resolve<ICustomerModuleService>(Modules.CUSTOMER)
    await customerModule.updateCustomers(previous.customerId, { company_name: previous.companyName ?? "" })
  }
)

type ClearInput = { employeeId: string }

export const clearCustomerCompanyNameStep = createStep(
  "clear-customer-company-name",
  async ({ employeeId }: ClearInput, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const customerModule = container.resolve<ICustomerModuleService>(Modules.CUSTOMER)

    const { data: [employee] } = await query.graph({
      entity: "employee",
      fields: ["id", "customer.id", "customer.company_name"],
      filters: { id: employeeId },
    })

    const customerId = (employee as any)?.customer?.id
    if (!customerId) {
      return new StepResponse(null, null)
    }

    const previousName = (employee as any)?.customer?.company_name ?? null

    await customerModule.updateCustomers(customerId, { company_name: "" })

    return new StepResponse({ customerId }, { customerId, previousName })
  },
  async (previous: { customerId: string; previousName: string | null } | null | undefined, { container }) => {
    if (!previous?.customerId) return
    const customerModule = container.resolve<ICustomerModuleService>(Modules.CUSTOMER)
    await customerModule.updateCustomers(previous.customerId, { company_name: previous.previousName ?? "" })
  }
)
