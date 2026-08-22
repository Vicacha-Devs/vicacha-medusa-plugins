import { Button, Drawer } from "@medusajs/ui";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { AdminCreateCompany } from "../../../../../types";
import { useCreateCompany } from "../../../../hooks/api";
import { CompanyForm } from "./company-form.tsx";

interface CompanyCreateDrawerProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CompanyCreateDrawer({ open: externalOpen, onOpenChange }: CompanyCreateDrawerProps = {}) {
  const controlled = externalOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlled ? externalOpen! : internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
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
      {!controlled && (
        <Drawer.Trigger asChild>
          <Button variant="secondary" size="small">
            {t("actions.create")}
          </Button>
        </Drawer.Trigger>
      )}
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
