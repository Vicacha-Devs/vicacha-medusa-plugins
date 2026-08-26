import { HttpTypes } from "@medusajs/framework/types";
import { Link, LockClosedSolid, PencilSquare, Trash } from "@medusajs/icons";
import { toast } from "@medusajs/ui";
import { ActionMenu, DeletePrompt } from "@vicacha-devs/medusa-shared-admin/admin";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { QueryCompany } from "../../../../../types";
import { useDeleteCompany } from "../../../../hooks/api";
import {
  CompanyApprovalSettingsDrawer,
  CompanyCustomerGroupDrawer,
  CompanyUpdateDrawer,
} from "./index.ts";

export const CompanyActionsMenu = ({
  company,
  customerGroups,
}: {
  company: QueryCompany;
  customerGroups?: HttpTypes.AdminCustomerGroup[];
}) => {
  const { t } = useTranslation();
  const [editOpen, setEditOpen] = useState(false);
  const [customerGroupOpen, setCustomerGroupOpen] = useState(false);
  const [approvalSettingsOpen, setApprovalSettingsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { mutateAsync: mutateDelete, isPending: loadingDelete } =
    useDeleteCompany(company.id);

  const navigate = useNavigate();

  const handleDelete = () => {
    mutateDelete(company.id, {
      onSuccess: () => {
        navigate("/b2b/companies");
        toast.success(t("companies.toasts.deleted", { name: company.name }));
      },
    });
  };

  return (
    <>
      <ActionMenu
        groups={[
          {
            actions: [
              {
                icon: <PencilSquare />,
                label: t("companies.actions.editDetails"),
                onClick: () => setEditOpen(true),
              },
              {
                icon: <Link />,
                label: t("companies.actions.manageCustomerGroup"),
                onClick: () => setCustomerGroupOpen(true),
              },
              {
                icon: <LockClosedSolid />,
                label: t("companies.actions.approvalSettings"),
                onClick: () => setApprovalSettingsOpen(true),
              },
            ],
          },
          {
            actions: [
              {
                icon: <Trash />,
                label: t("companies.actions.delete"),
                onClick: () => setDeleteOpen(true),
              },
            ],
          },
        ]}
      />

      <CompanyUpdateDrawer
        company={company}
        open={editOpen}
        setOpen={setEditOpen}
      />
      <CompanyCustomerGroupDrawer
        company={company}
        customerGroups={customerGroups}
        open={customerGroupOpen}
        setOpen={setCustomerGroupOpen}
      />
      <CompanyApprovalSettingsDrawer
        company={company}
        open={approvalSettingsOpen}
        setOpen={setApprovalSettingsOpen}
      />
      <DeletePrompt
        handleDelete={handleDelete}
        loading={loadingDelete}
        open={deleteOpen}
        setOpen={setDeleteOpen}
      />
    </>
  );
};
