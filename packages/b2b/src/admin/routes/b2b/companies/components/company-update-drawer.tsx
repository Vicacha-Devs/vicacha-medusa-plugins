import { Drawer, toast } from "@medusajs/ui";
import { AdminUpdateCompany, QueryCompany } from "../../../../../types";
import { useTranslation } from "react-i18next";
import { useUpdateCompany } from "../../../../hooks/api";
import { CompanyForm } from "./company-form.tsx";

export function CompanyUpdateDrawer({
  company,
  open,
  setOpen,
}: {
  company: QueryCompany;
  open: boolean;
  setOpen: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const { mutateAsync, isPending, error } = useUpdateCompany(company.id);

  const {
    created_at,
    updated_at,
    id,
    employees,
    customer_group,
    approval_settings,
    ...currentData
  } = company;

  const handleSubmit = async (formData: AdminUpdateCompany) => {
    await mutateAsync(formData, {
      onSuccess: async () => {
        setOpen(false);
        toast.success(t("companies.toasts.updated", { name: formData.name }));
      },
      onError: () => {
        toast.error(t("companies.toasts.updateError"));
      },
    });
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <Drawer.Content className="z-50">
        <Drawer.Header>
          <Drawer.Title>{t("companies.form.editTitle")}</Drawer.Title>
        </Drawer.Header>

        <CompanyForm
          handleSubmit={handleSubmit}
          loading={isPending}
          error={error}
          company={currentData}
        />
      </Drawer.Content>
    </Drawer>
  );
}
