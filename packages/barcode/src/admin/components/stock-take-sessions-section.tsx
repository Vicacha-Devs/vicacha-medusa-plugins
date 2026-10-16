import { SectionRow } from "@medusajs/dashboard/components"
import {
  Button,
  Container,
  Heading,
  StatusBadge,
  Table,
} from "@medusajs/ui"
import { useTranslation } from "react-i18next"

export interface StockTakeSessionsSectionProps {
  sessions: Array<Record<string, unknown>>
  selectedSessionId: string | null
  onSelectSession: (id: string) => void
  onApplySession: (id: string) => void
}

export const StockTakeSessionsSection = ({
  sessions,
  selectedSessionId,
  onSelectSession,
  onApplySession,
}: StockTakeSessionsSectionProps) => {
  const { t } = useTranslation()
  const activeSession = sessions.find((s) => String(s.id) === selectedSessionId)
  const activeItems = Array.isArray(activeSession?.items)
    ? (activeSession.items as Array<Record<string, unknown>>)
    : []

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">
          {t("stockTakeTab.sessionsTitle", { count: sessions.length })}
        </Heading>
        <div className="mt-3 flex flex-wrap gap-2">
          {sessions.map((s) => (
            <Button
              key={String(s.id)}
              variant={
                String(s.id) === selectedSessionId ? "primary" : "secondary"
              }
              size="small"
              onClick={() => onSelectSession(String(s.id))}
            >
              {String(s.name)} ({String(s.status)})
            </Button>
          ))}
        </div>
      </div>

      {activeSession ? (
        <>
          <SectionRow
            title={String(activeSession.name)}
            value={
              activeSession.status === "in_progress" ? (
                <Button
                  variant="primary"
                  size="small"
                  onClick={() => onApplySession(String(activeSession.id))}
                >
                  {t("stockTakeTab.completeApplyButton")}
                </Button>
              ) : (
                <StatusBadge color="green">
                  {t("stockTakeTab.completedBadge")}
                </StatusBadge>
              )
            }
          />
          <SectionRow
            title={t("stockTakeTab.countedShort")}
            value={t("stockTakeTab.sessionSummary", {
              expected: String(activeSession.total_expected ?? 0),
              counted: String(activeSession.total_counted ?? 0),
              variance: String(activeSession.total_variance ?? 0),
            })}
          />
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Barcode</Table.HeaderCell>
                <Table.HeaderCell>Item</Table.HeaderCell>
                <Table.HeaderCell>
                  {t("stockTakeTab.countedShort")}
                </Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {activeItems.map((item) => (
                <Table.Row key={String(item.id)}>
                  <Table.Cell className="font-mono font-semibold">
                    {String(item.barcode)}
                  </Table.Cell>
                  <Table.Cell>{String(item.title)}</Table.Cell>
                  <Table.Cell>
                    {t("stockTakeTab.expectedShort", {
                      expected: String(item.expected_quantity),
                    })}{" "}
                    | {t("stockTakeTab.countedShort")}{" "}
                    <strong>{String(item.counted_quantity)}</strong>{" "}
                    {t("stockTakeTab.varianceShort", {
                      variance: String(item.variance),
                    })}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </>
      ) : null}
    </Container>
  )
}
