import { Drawer, toast as toastType } from "@medusajs/ui";
import { useTranslation } from "react-i18next";
import { EmployeesUpdateForm } from ".";
import {
  AdminUpdateEmployee,
  QueryCompany,
  QueryEmployee,
} from "../../../../../../types";
import { useUpdateEmployee } from "../../../../../hooks/api";

export function EmployeesUpdateDrawer({
  company,
  employee,
  open,
  setOpen,
  toast,
}: {
  company: QueryCompany;
  employee: QueryEmployee;
  open: boolean;
  setOpen: (open: boolean) => void;
  toast: typeof toastType;
}) {
  const { t } = useTranslation();
  const { mutateAsync, isPending, error } = useUpdateEmployee(
    employee.company_id,
    employee.id
  );

  const handleSubmit = async (formData: AdminUpdateEmployee) => {
    await mutateAsync(formData, {
      onSuccess: () => {
        setOpen(false);
        toast.success(
          t("employees.toasts.updated", { email: employee?.customer?.email })
        );
      },
    });
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <Drawer.Content className="z-50 overflow-auto">
        <Drawer.Header>
          <Drawer.Title>{t("employees.drawers.editTitle")}</Drawer.Title>
        </Drawer.Header>

        <EmployeesUpdateForm
          handleSubmit={handleSubmit}
          loading={isPending}
          error={error}
          employee={employee}
          company={company}
        />
      </Drawer.Content>
    </Drawer>
  );
}
