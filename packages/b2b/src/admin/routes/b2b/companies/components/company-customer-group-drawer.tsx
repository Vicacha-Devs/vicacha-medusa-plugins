import { HttpTypes } from "@medusajs/types";
import { Button, Drawer, Hint, Table, toast } from "@medusajs/ui";
import { useTranslation } from "react-i18next";
import { QueryCompany } from "../../../../../types";
import {
  useAddCompanyToCustomerGroup,
  useRemoveCompanyFromCustomerGroup,
} from "../../../../hooks/api";

export function CompanyCustomerGroupDrawer({
  company,
  customerGroups,
  open,
  setOpen,
}: {
  company: QueryCompany;
  customerGroups?: HttpTypes.AdminCustomerGroup[];
  open: boolean;
  setOpen: (open: boolean) => void;
}) {
  const { t } = useTranslation();

  const { mutateAsync: addMutate, isPending: addLoading } =
    useAddCompanyToCustomerGroup(company.id);

  const { mutateAsync: removeMutate, isPending: removeLoading } =
    useRemoveCompanyFromCustomerGroup(company.id);

  const handleAdd = async (groupId: string) => {
    await addMutate(groupId, {
      onSuccess: async () => {
        setOpen(false);
        toast.success(t("companies.customerGroup.addedSuccess"));
      },
      onError: () => {
        toast.error(t("companies.customerGroup.addError"));
      },
    });
  };

  const handleRemove = async (groupId: string) => {
    await removeMutate(groupId, {
      onSuccess: async () => {
        toast.success(t("companies.customerGroup.removedSuccess"));
      },
      onError: () => {
        toast.error(t("companies.customerGroup.removeError"));
      },
    });
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <Drawer.Content className="z-50">
        <Drawer.Header>
          <Drawer.Title>
            {t("companies.customerGroup.drawerTitle", { name: company.name })}
          </Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="space-y-4 h-full overflow-y-hidden">
          <Hint variant="info">
            {t("companies.customerGroup.hint", {
              name: company.name,
              count: company.employees?.length,
              plural: company.employees?.length === 1 ? "" : "s",
            })}
          </Hint>
          <div className="h-full overflow-y-auto">
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>
                    {t("companies.customerGroup.header")}
                  </Table.HeaderCell>
                  <Table.HeaderCell className="text-right">
                    {t("companies.customerGroup.actionsHeader")}
                  </Table.HeaderCell>
                </Table.Row>
              </Table.Header>

              <Table.Body>
                {customerGroups ? (
                  customerGroups.map((group) => (
                    <Table.Row key={group.id}>
                      <Table.Cell>{group.name}</Table.Cell>
                      <Table.Cell className="text-right">
                        {company.customer_group?.id &&
                        company.customer_group.id === group.id ? (
                          <Button
                            onClick={() => handleRemove(group.id)}
                            isLoading={removeLoading}
                            variant="danger"
                          >
                            {t("companies.customerGroup.remove")}
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleAdd(group.id)}
                            disabled={
                              (company.customer_group?.id &&
                                company.customer_group.id !== group.id) ||
                              addLoading
                            }
                            isLoading={addLoading}
                          >
                            {t("companies.customerGroup.add")}
                          </Button>
                        )}
                      </Table.Cell>
                    </Table.Row>
                  ))
                ) : (
                  <Table.Row>
                    <Table.Cell>
                      {t("companies.customerGroup.noGroups")}
                    </Table.Cell>
                  </Table.Row>
                )}
              </Table.Body>
            </Table>
          </div>
        </Drawer.Body>
      </Drawer.Content>
    </Drawer>
  );
}
