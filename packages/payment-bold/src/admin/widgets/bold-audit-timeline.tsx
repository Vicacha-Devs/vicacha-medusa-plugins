import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Badge, Table } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

interface AuditRow {
  id: string
  event: string
  provider: string
  mode: string
  status: "success" | "pending" | "info"
  reference: string
  amount: string
  timestamp: string
}

const BoldAuditTimelineWidget = ({ data: order }: { data: any }) => {
  const { t } = useTranslation()

  const boldCollections =
    order?.payment_collections?.filter((pc: any) =>
      pc.payment_sessions?.some((s: any) => s.provider_id?.startsWith("pp_bold"))
    ) || []

  if (boldCollections.length === 0) {
    return null
  }

  const rows: AuditRow[] = []

  boldCollections.forEach((pc: any) => {
    pc.payment_sessions?.forEach((s: any) => {
      if (s.provider_id?.startsWith("pp_bold")) {
        const ref = s.data?.reference || s.data?.payment_link_id || s.id

        // 1. Session Init
        rows.push({
          id: `${s.id}-init`,
          event: t("bold.admin.audit.session_init"),
          provider: s.provider_id,
          mode: s.data?.email
            ? t("bold.admin.audit.mode_link")
            : t("bold.admin.audit.mode_terminal"),
          status: "info",
          reference: ref,
          amount: `$${(s.amount || 0).toLocaleString()} ${(s.currency_code || "COP").toUpperCase()}`,
          timestamp: new Date(s.created_at).toLocaleString(),
        })

        // 2. Authorization
        if (s.authorized_at) {
          rows.push({
            id: `${s.id}-auth`,
            event: t("bold.admin.audit.payment_auth"),
            provider: s.provider_id,
            mode: s.data?.email
              ? t("bold.admin.audit.mode_link")
              : t("bold.admin.audit.mode_terminal"),
            status: "success",
            reference: ref,
            amount: `$${(s.amount || 0).toLocaleString()} ${(s.currency_code || "COP").toUpperCase()}`,
            timestamp: new Date(s.authorized_at).toLocaleString(),
          })
        }

        // 3. Capture
        if (s.payment?.captured_at) {
          rows.push({
            id: `${s.id}-capture`,
            event: t("bold.admin.audit.payment_captured"),
            provider: s.provider_id,
            mode: s.data?.email
              ? t("bold.admin.audit.mode_link")
              : t("bold.admin.audit.mode_terminal"),
            status: "success",
            reference: s.payment.id,
            amount: `$${(s.payment.amount || s.amount || 0).toLocaleString()} ${(s.currency_code || "COP").toUpperCase()}`,
            timestamp: new Date(s.payment.captured_at).toLocaleString(),
          })
        }
      }
    })
  })

  return (
    <Container className="p-4 rounded-lg border bg-card space-y-3">
      <div className="flex items-center justify-between border-b pb-3">
        <Heading level="h2" className="text-base font-semibold">
          {t("bold.admin.audit.title")}
        </Heading>
        <Badge color="blue">
          {t("bold.admin.audit.events_count", { count: rows.length })}
        </Badge>
      </div>

      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>{t("bold.admin.audit.headers.event")}</Table.HeaderCell>
            <Table.HeaderCell>{t("bold.admin.audit.headers.provider_mode")}</Table.HeaderCell>
            <Table.HeaderCell>{t("bold.admin.audit.headers.reference")}</Table.HeaderCell>
            <Table.HeaderCell>{t("bold.admin.audit.headers.amount")}</Table.HeaderCell>
            <Table.HeaderCell>{t("bold.admin.audit.headers.status")}</Table.HeaderCell>
            <Table.HeaderCell>{t("bold.admin.audit.headers.timestamp")}</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {rows.map((row) => (
            <Table.Row key={row.id}>
              <Table.Cell className="font-semibold text-xs text-ui-fg-base">
                {row.event}
              </Table.Cell>
              <Table.Cell className="text-xs text-ui-fg-subtle">
                <span className="font-mono">{row.provider}</span> ({row.mode})
              </Table.Cell>
              <Table.Cell className="font-mono text-xs text-ui-fg-muted">
                {row.reference}
              </Table.Cell>
              <Table.Cell className="font-medium text-xs text-ui-fg-base">
                {row.amount}
              </Table.Cell>
              <Table.Cell>
                <Badge color={row.status === "success" ? "green" : "blue"}>
                  {t(`bold.admin.audit.statuses.${row.status}`)}
                </Badge>
              </Table.Cell>
              <Table.Cell className="text-[11px] font-mono text-ui-fg-subtle">
                {row.timestamp}
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "order.details.after",
})

export default BoldAuditTimelineWidget
