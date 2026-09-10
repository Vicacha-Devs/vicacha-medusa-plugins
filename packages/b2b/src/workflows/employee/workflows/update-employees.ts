import {
  createWorkflow,
  transform,
  when,
  WorkflowData,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import { ModuleUpdateEmployee, QueryEmployee } from "@b2b/types";
import { removeAdminRoleStep, updateEmployeesStep } from "../steps";

export const updateEmployeesWorkflow = createWorkflow(
  "update-employees",
  (
    input: WorkflowData<ModuleUpdateEmployee>
  ): WorkflowResponse<QueryEmployee> => {
    const updatedEmployee = updateEmployeesStep(input);

    const customerEmail = transform(updatedEmployee, (emp) => (emp as any).customer?.email as string)

    when(updatedEmployee, ({ is_admin }) => {
      return is_admin === false;
    }).then(() => {
      (removeAdminRoleStep as any)({ email: customerEmail });
    });

    return new WorkflowResponse(updatedEmployee);
  }
);
