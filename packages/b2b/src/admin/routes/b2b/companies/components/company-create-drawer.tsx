import { Button, Drawer } from "@medusajs/ui";
import { AdminCreateCompany } from "@/../types";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useCreateCompany } from "@/hooks/api";
import { CompanyForm } from "./company-form.tsx";

export function CompanyCreateDrawer() {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();

  const { mutateAsync, isPending, error } = useCreateCompany();

  const handleSubmit = async (formData: AdminCreateCompany) => {
    await mutateAsync(formData, {
      onSuccess: () => {
        setOpen(false);
      },
    });
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <Drawer.Trigger asChild>
        <Button variant="secondary" size="small">
          {t("actions.create")}
        </Button>
      </Drawer.Trigger>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>{t("companies.form.createTitle")}</Drawer.Title>
        </Drawer.Header>
        <CompanyForm
          handleSubmit={handleSubmit}
          loading={isPending}
          error={error}
        />
      </Drawer.Content>
    </Drawer>
  );
}
