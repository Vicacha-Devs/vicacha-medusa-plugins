import { ICustomerModuleService } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";

type AddEmployeeInput = { employee_id: string }
type AddEmployeeCompensate = { customer_id: string | undefined; group_id: string | undefined }

export const addEmployeeToCustomerGroupStep = createStep<AddEmployeeInput, unknown, AddEmployeeCompensate>(
  "add-employee-to-customer-group",
  async (input: AddEmployeeInput, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY);

    const {
      data: [employee],
    } = await query.graph(
      {
        entity: "employee",
        filters: { id: input.employee_id },
        fields: ["id", "customer.id", "company.id"],
      },
      { throwIfKeyNotFound: true }
    );

    const {
      data: [company],
    } = await query.graph(
      {
        entity: "company",
        filters: { id: employee.company.id },
        fields: ["id", "customer_group.*"],
      },
      { throwIfKeyNotFound: true }
    );

    const customerModuleService = container.resolve<ICustomerModuleService>(
      Modules.CUSTOMER
    );

    if (!employee.customer?.id || !company.customer_group?.id) {
      return new StepResponse(null, {
        customer_id: employee.customer?.id,
        group_id: company.customer_group?.id,
      });
    }

    await customerModuleService.addCustomerToGroup({
      customer_id: employee.customer.id,
      customer_group_id: company.customer_group.id,
    });

    const customerGroup = await customerModuleService.retrieveCustomerGroup(
      company.customer_group.id
    );

    return new StepResponse(customerGroup, {
      customer_id: employee.customer.id,
      group_id: company.customer_group.id,
    });
  },
  async (
    input: AddEmployeeCompensate | undefined,
    { container }
  ) => {
    if (!input?.customer_id || !input?.group_id) {
      return;
    }

    const customerModuleService = container.resolve<ICustomerModuleService>(
      Modules.CUSTOMER
    );

    await customerModuleService.removeCustomerFromGroup({
      customer_id: input.customer_id,
      customer_group_id: input.group_id,
    });
  }
);
