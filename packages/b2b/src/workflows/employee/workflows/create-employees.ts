import { Modules } from "@medusajs/framework/utils";
import { createWorkflow, transform, when, WorkflowResponse } from "@medusajs/framework/workflows-sdk";
import { createRemoteLinkStep } from "@medusajs/medusa/core-flows";
import { COMPANY_MODULE } from "@b2b/modules/company";
import { ModuleCreateEmployee, ModuleEmployee } from "@b2b/types";
import { createEmployeesStep, setAdminRoleStep, syncCustomerCompanyNameStep } from "../steps";
import { addEmployeeToCustomerGroupStep } from "../steps/add-employee-to-customer-group";

type WorkflowInput = {
  employeeData: ModuleCreateEmployee;
  customerId: string;
};

export const createEmployeesWorkflow = createWorkflow(
  "create-employees",
  function (input: WorkflowInput): WorkflowResponse<ModuleEmployee> {
    const employee = createEmployeesStep(input.employeeData);

    const employeeId = transform(employee, (emp) => emp.id)

    createRemoteLinkStep([
      {
        [COMPANY_MODULE]: {
          employee_id: employeeId,
        },
        [Modules.CUSTOMER]: {
          customer_id: input.customerId,
        },
      },
    ]);

    when(input.employeeData, (emp) => !!emp.is_admin).then(() => {
      (setAdminRoleStep as any)({ employeeId, customerId: input.customerId });
    });

    addEmployeeToCustomerGroupStep({
      employee_id: employeeId,
    });

    const syncInput = transform(
      { customerId: input.customerId, employee },
      ({ customerId, employee: emp }) => ({
        customerId,
        companyName: ((emp as any).company?.name ?? null) as string | null,
      })
    )

    syncCustomerCompanyNameStep(syncInput);

    return new WorkflowResponse(employee);
  }
);
