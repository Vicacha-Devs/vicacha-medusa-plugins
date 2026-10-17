import { SectionRow } from "@medusajs/dashboard/components"
import {
  Badge,
  Button,
  Container,
  Heading,
  StatusBadge,
  Table,
  Text,
} from "@medusajs/ui"
import React from "react"
import { useTranslation } from "react-i18next"

import type { CollectionOverviewItem, SyncJobItem } from "./types"

export interface OverviewTabProps {
  collections: CollectionOverviewItem[]
  syncJobs: SyncJobItem[]
  syncingEntity: string | null
  onSyncEntity: (entity: string) => void
  onDeleteCustomEntity: (entity: string) => void
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  collections,
  syncJobs,
  syncingEntity,
  onSyncEntity,
  onDeleteCustomEntity,
}) => {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {collections.map((col) => (
          <Container key={col.entity} className="divide-y p-0">
            <div className="flex items-center justify-between px-6 py-4">
              <div>
                <Heading level="h2" className="capitalize">
                  {col.entity}
                </Heading>
                <Text size="xsmall" className="text-ui-fg-subtle mt-0.5 font-mono">
                  {t("overview.aliasLabel", {
                    alias: col.aliasName,
                    physical: col.physicalCollection || t("overview.none"),
                  })}
                </Text>
              </div>
              <div className="flex items-center gap-x-1.5">
                {col.isCustom && (
                  <Badge color="purple" size="xsmall">
                    {t("overview.customEntityBadge")}
                  </Badge>
                )}
                <StatusBadge
                  color={col.physicalCollection ? "green" : "orange"}
                >
                  {col.physicalCollection
                    ? t("overview.indexedBadge")
                    : t("overview.notIndexedBadge")}
                </StatusBadge>
              </div>
            </div>

            <SectionRow
              title={t("overview.documents")}
              value={String(col.numDocuments ?? 0)}
            />
            <SectionRow
              title={t("overview.synonyms")}
              value={String(col.synonymsCount ?? 0)}
            />
            <SectionRow
              title={t("overview.curations")}
              value={String(col.curationsCount ?? 0)}
            />
            {col.hasVectorEmbedder && (
              <SectionRow
                title="Vector AI"
                value={
                  <Badge color="blue" size="xsmall">
                    {t("overview.vectorAiBadge", {
                      model: col.embedderModel || "",
                    })}
                  </Badge>
                }
              />
            )}

            <div className="flex items-center justify-between gap-x-2 px-6 py-4">
              <Button
                variant="secondary"
                size="small"
                className="w-full"
                onClick={() => onSyncEntity(col.entity)}
                isLoading={syncingEntity === col.entity}
              >
                {t("overview.zeroDowntimeRebuild")}
              </Button>
              {col.isCustom && (
                <Button
                  variant="danger"
                  size="small"
                  onClick={() => onDeleteCustomEntity(col.entity)}
                >
                  {t("overview.remove")}
                </Button>
              )}
            </div>
          </Container>
        ))}
      </div>

      <Container className="divide-y p-0 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h2">{t("overview.recentJobsTitle")}</Heading>
        </div>

        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>{t("overview.colEntity")}</Table.HeaderCell>
              <Table.HeaderCell>{t("overview.colAction")}</Table.HeaderCell>
              <Table.HeaderCell>
                {t("overview.colTargetCollection")}
              </Table.HeaderCell>
              <Table.HeaderCell>{t("overview.colProcessed")}</Table.HeaderCell>
              <Table.HeaderCell>{t("overview.colDuration")}</Table.HeaderCell>
              <Table.HeaderCell>{t("overview.colStatus")}</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {syncJobs.length === 0 ? (
              <Table.Row>
                <Table.Cell className="text-ui-fg-subtle">
                  {t("overview.noJobs")}
                </Table.Cell>
                <Table.Cell>—</Table.Cell>
                <Table.Cell>—</Table.Cell>
                <Table.Cell>—</Table.Cell>
                <Table.Cell>—</Table.Cell>
                <Table.Cell>—</Table.Cell>
              </Table.Row>
            ) : (
              syncJobs.map((job) => (
                <Table.Row key={job.id}>
                  <Table.Cell className="font-medium capitalize">
                    {job.entity || (job as any).entity_type}
                  </Table.Cell>
                  <Table.Cell>{job.action}</Table.Cell>
                  <Table.Cell className="font-mono text-xs">
                    {job.collection_name || "—"}
                  </Table.Cell>
                  <Table.Cell>
                    {t("overview.docsCount", {
                      count: job.documents_processed ?? 0,
                    })}
                    {job.documents_failed > 0
                      ? t("overview.failedCount", {
                          count: job.documents_failed,
                        })
                      : ""}
                  </Table.Cell>
                  <Table.Cell>
                    {job.duration_ms != null ? `${job.duration_ms} ms` : "—"}
                  </Table.Cell>
                  <Table.Cell>
                    <StatusBadge
                      color={
                        job.status === "completed"
                          ? "green"
                          : job.status === "failed"
                            ? "red"
                            : "orange"
                      }
                    >
                      {job.status}
                    </StatusBadge>
                  </Table.Cell>
                </Table.Row>
              ))
            )}
          </Table.Body>
        </Table>
      </Container>
    </div>
  )
}
