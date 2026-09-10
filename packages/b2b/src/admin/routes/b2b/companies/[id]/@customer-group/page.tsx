import { Button, Hint, Table, toast } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { RouteDrawer, useRouteModal, sdk } from "@vicacha-devs/medusa-shared-admin/admin"

import {
  useAddCompanyToCustomerGroup,
  useCompany,
  useRemoveCompanyFromCustomerGroup,
} from "../../../../../hooks/api"

const CustomerGroupContent = ({ id }: { id: string }) => {
  const { t } = useTranslation()
  const { handleSuccess } = useRouteModal()

  const { data: companyData, isLoading: companyLoading } = useCompany(id)
  const { data: groupsData, isLoading: groupsLoading } = useQuery({
    queryKey: ["customer-groups"],
    queryFn: () =>
      sdk.client.fetch<{ customer_groups: { id: string; name: string }[] }>(
        "/admin/customer-groups"
      ),
  })

  const { mutateAsync: addMutate, isPending: addLoading } =
    useAddCompanyToCustomerGroup(id)
  const { mutateAsync: removeMutate, isPending: removeLoading } =
    useRemoveCompanyFromCustomerGroup(id)

  const company = companyData?.company as any
  const customerGroups = groupsData?.customer_groups ?? []
  const currentGroupId: string | undefined = company?.customer_group?.id
  const employeeCount: number = company?.employees_count ?? 0

  const handleAdd = async (groupId: string) => {
    try {
      await addMutate(groupId)
      toast.success(t("companies.customerGroup.addedSuccess"))
      handleSuccess()
    } catch {
      toast.error(t("companies.customerGroup.addError"))
    }
  }

  const handleRemove = async (groupId: string) => {
    try {
      await removeMutate(groupId)
      toast.success(t("companies.customerGroup.removedSuccess"))
    } catch {
      toast.error(t("companies.customerGroup.removeError"))
    }
  }

  if (companyLoading || groupsLoading || !company) return null

  return (
    <RouteDrawer.Body className="space-y-4 h-full overflow-y-hidden">
      <Hint variant="info">
        {t("companies.customerGroup.hint", {
          name: company.name,
          count: employeeCount,
          plural: employeeCount === 1 ? "" : "s",
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
            {customerGroups.length ? (
              customerGroups.map((group) => {
                const isLinked = currentGroupId === group.id
                const isOtherLinked = !!currentGroupId && !isLinked
                
                return (
                  <Table.Row key={group.id}>
                    <Table.Cell>{group.name}</Table.Cell>
                    <Table.Cell className="text-right">
                      {isLinked ? (
                        <Button
                          size="small"
                          variant="danger"
                          isLoading={removeLoading}
                          onClick={() => handleRemove(group.id)}
                        >
                          {t("companies.customerGroup.remove")}
                        </Button>
                      ) : (
                        <Button
                          size="small"
                          disabled={isOtherLinked || addLoading}
                          isLoading={addLoading}
                          onClick={() => handleAdd(group.id)}
                        >
                          {t("companies.customerGroup.add")}
                        </Button>
                      )}
                    </Table.Cell>
                  </Table.Row>
                )
              })
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
    </RouteDrawer.Body>
  )
}

const CompanyCustomerGroup = () => {
  const { t } = useTranslation()
  const { id } = useParams()
  const { data } = useCompany(id ?? "", undefined, { enabled: !!id })

  if (!id) return null

  return (
    <RouteDrawer>
      <RouteDrawer.Header>
        <RouteDrawer.Title>
          {t("companies.customerGroup.drawerTitle", {
            name: data?.company?.name ?? "",
          })}
        </RouteDrawer.Title>
      </RouteDrawer.Header>
      <CustomerGroupContent id={id} />
    </RouteDrawer>
  )
}

export default CompanyCustomerGroup
