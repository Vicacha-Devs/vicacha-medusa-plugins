import { HttpTypes } from "@medusajs/types";
import { Button, Drawer, toast } from "@medusajs/ui";
import { AdminCreateEmployee, QueryCompany } from "@/../types";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useAdminCreateCustomer,
  useCreateEmployee,
} from "@/hooks/api";
import { EmployeesCreateForm } from "./employees-create-form.tsx";

export function EmployeeCreateDrawer({ company }: { company: QueryCompany }) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();

  const {
    mutateAsync: createEmployee,
    isPending: createEmployeeLoading,
    error: createEmployeeError,
  } = useCreateEmployee(company.id);

  const {
    mutateAsync: createCustomer,
    isPending: createCustomerLoading,
    error: createCustomerError,
  } = useAdminCreateCustomer();

  const handleSubmit = async (
    formData: AdminCreateEmployee & HttpTypes.AdminCreateCustomer
  ) => {
    const { customer } = await createCustomer({
      email: formData.email!,
      first_name: formData.first_name!,
      last_name: formData.last_name!,
      phone: formData.phone!,
      company_name: company.name,
    });

    if (!customer?.id) {
      toast.error(t("employees.toasts.createCustomerError"));
      return;
    }

    const employee = await createEmployee({
      spending_limit: formData.spending_limit!,
      is_admin: formData.is_admin!,
      customer_id: customer.id,
    });

    if (!employee) {
      toast.error(t("employees.toasts.createEmployeeError"));
      return;
    }

    setOpen(false);
    toast.success(
      t("employees.toasts.created", {
        firstName: customer?.first_name,
        lastName: customer?.last_name,
      })
    );
  };

  const loading = createCustomerLoading || createEmployeeLoading;
  const error = createCustomerError || createEmployeeError;

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <Drawer.Trigger asChild>
        <Button variant="secondary" size="small">
          {t("actions.add")}
        </Button>
      </Drawer.Trigger>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>{t("employees.drawers.addTitle")}</Drawer.Title>
        </Drawer.Header>
        <EmployeesCreateForm
          handleSubmit={handleSubmit}
          loading={loading}
          error={error}
          company={company}
        />
      </Drawer.Content>
    </Drawer>
  );
}
