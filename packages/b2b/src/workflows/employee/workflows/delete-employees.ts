import {
  createWorkflow,
  transform,
  WorkflowData,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import { clearCustomerCompanyNameStep, deleteEmployeesStep } from "../steps";

type DeleteInput = { id: string; company_id?: string } | string | string[]

export const deleteEmployeesWorkflow = createWorkflow(
  "delete-employees",
  (input: WorkflowData<DeleteInput>): WorkflowResponse<string> => {
    const employeeId = transform(input, (data) => {
      if (typeof data === "string") return data
      if (Array.isArray(data)) return data[0]
      return (data as any).id as string
    })

    clearCustomerCompanyNameStep({ employeeId })

    deleteEmployeesStep(employeeId);

    return new WorkflowResponse("Company customers deleted");
  }
);
