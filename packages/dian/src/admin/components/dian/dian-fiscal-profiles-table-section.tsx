import { Badge, Container, Heading, Table, Text } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

export interface DianFiscalProfilesTableSectionProps {
  profiles: Array<Record<string, any>>
}

export const DianFiscalProfilesTableSection: React.FC<
  DianFiscalProfilesTableSectionProps
> = ({ profiles }) => {
  const { t, i18n } = useTranslation()

  return (
    <Container className="divide-y p-0" dir={i18n.dir()}>
      <div className="px-6 py-4">
        <Heading level="h1">{t("dian.fiscalProfiles.tableTitle")}</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          {t("dian.fiscalProfiles.tableSubtitle")}
        </Text>
      </div>

      <div className="px-6 py-4">
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>
                {t("dian.fiscalProfiles.colCustomer")}
              </Table.HeaderCell>
              <Table.HeaderCell>
                {t("dian.fiscalProfiles.colPersonType")}
              </Table.HeaderCell>
              <Table.HeaderCell>
                {t("dian.fiscalProfiles.colIdentification")}
              </Table.HeaderCell>
              <Table.HeaderCell>
                {t("dian.fiscalProfiles.colContact")}
              </Table.HeaderCell>
              <Table.HeaderCell>
                {t("dian.fiscalProfiles.colMunicipality")}
              </Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {profiles.map((p) => (
              <Table.Row key={p.id}>
                <Table.Cell className="font-medium">
                  {p.registration_name}
                </Table.Cell>
                <Table.Cell>
                  <Badge color={p.organization_type === "1" ? "blue" : "green"}>
                    {p.organization_type === "1"
                      ? t("dian.fiscalProfiles.orgLegalB2B")
                      : t("dian.fiscalProfiles.orgNatural")}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  {p.identification_type}: {p.identification_number}
                  {p.dv ? `-${p.dv}` : ""}
                </Table.Cell>
                <Table.Cell>
                  {p.email} • {p.phone}
                </Table.Cell>
                <Table.Cell>
                  {p.municipality_name} ({p.municipality_code})
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </div>
    </Container>
  )
}
