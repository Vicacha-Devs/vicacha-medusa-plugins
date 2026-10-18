import { useState } from "react"
import {
  Badge,
  Button,
  Container,
  Heading,
  Table,
  Text,
  toast,
} from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { dianClient } from "../../../sdk"

export interface DianResolutionsTableSectionProps {
  resolutions: Array<Record<string, any>>
  loading: boolean
  onRefresh: () => void
}

export const DianResolutionsTableSection: React.FC<
  DianResolutionsTableSectionProps
> = ({ resolutions, loading, onRefresh }) => {
  const { t, i18n } = useTranslation()
  const [syncing, setSyncing] = useState(false)

  const handleSyncFromDian = async () => {
    setSyncing(true)
    try {
      await dianClient.syncResolutionsFromDian()
      toast.success(t("dian.resolutions.toastSynced"))
      onRefresh()
    } catch (err: any) {
      toast.error(err?.message || t("dian.resolutions.toastSyncError"))
    } finally {
      setSyncing(false)
    }
  }

  return (
    <Container className="divide-y p-0" dir={i18n.dir()}>
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h1">{t("dian.resolutions.tableTitle")}</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {t("dian.resolutions.tableSubtitle")}
          </Text>
        </div>
        <Button
          variant="secondary"
          size="small"
          isLoading={syncing}
          onClick={() => void handleSyncFromDian()}
        >
          {t("dian.resolutions.syncBtn")}
        </Button>
      </div>

      <div className="px-6 py-4">
        {loading ? (
          <Text size="small">{t("dian.resolutions.loading")}</Text>
        ) : (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>{t("dian.resolutions.colPrefix")}</Table.HeaderCell>
                <Table.HeaderCell>{t("dian.resolutions.colResolution")}</Table.HeaderCell>
                <Table.HeaderCell>{t("dian.resolutions.colType")}</Table.HeaderCell>
                <Table.HeaderCell>{t("dian.resolutions.colRange")}</Table.HeaderCell>
                <Table.HeaderCell>{t("dian.resolutions.colValidity")}</Table.HeaderCell>
                <Table.HeaderCell>{t("dian.resolutions.colStatus")}</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {resolutions.map((r) => (
                <Table.Row key={r.id}>
                  <Table.Cell className="font-semibold">{r.prefix}</Table.Cell>
                  <Table.Cell>{r.resolution_number}</Table.Cell>
                  <Table.Cell>{r.document_type}</Table.Cell>
                  <Table.Cell>
                    {r.from_number} - {r.to_number} ({t("dian.resolutions.currentLabel")}{" "}
                    <strong>{r.current_number}</strong>)
                  </Table.Cell>
                  <Table.Cell>
                    {r.valid_from} {t("dian.resolutions.toConnector")} {r.valid_to}
                  </Table.Cell>
                  <Table.Cell>
                    <Badge color={r.is_active ? "green" : "grey"}>
                      {r.is_active
                        ? t("dian.resolutions.statusActive")
                        : t("dian.resolutions.statusInactive")}
                    </Badge>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}
      </div>
    </Container>
  )
}
