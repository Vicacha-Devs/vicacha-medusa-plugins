import { Badge, Button, Heading, Table, Text } from "@medusajs/ui"
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
    <div className="flex flex-col gap-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {collections.map((col) => (
          <div
            key={col.entity}
            className="border-ui-border-base flex flex-col justify-between rounded-lg border p-4"
          >
            <div>
              <div className="flex items-center justify-between">
                <Heading level="h2" className="capitalize">
                  {col.entity}
                </Heading>
                <div className="flex items-center gap-x-1">
                  {col.isCustom && (
                    <Badge color="purple" size="small">
                      {t("overview.customEntityBadge")}
                    </Badge>
                  )}
                  <Badge
                    color={col.physicalCollection ? "green" : "orange"}
                    size="small"
                  >
                    {col.physicalCollection
                      ? t("overview.indexedBadge")
                      : t("overview.notIndexedBadge")}
                  </Badge>
                </div>
              </div>
              <Text size="xsmall" className="text-ui-fg-subtle mt-1 font-mono">
                {t("overview.aliasLabel", {
                  alias: col.aliasName,
                  physical: col.physicalCollection || t("overview.none"),
                })}
              </Text>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="bg-ui-bg-subtle rounded p-2">
                  <Text size="xsmall" className="text-ui-fg-subtle">
                    {t("overview.documents")}
                  </Text>
                  <Text weight="plus">{col.numDocuments}</Text>
                </div>
                <div className="bg-ui-bg-subtle rounded p-2">
                  <Text size="xsmall" className="text-ui-fg-subtle">
                    {t("overview.synonyms")}
                  </Text>
                  <Text weight="plus">{col.synonymsCount}</Text>
                </div>
                <div className="bg-ui-bg-subtle rounded p-2">
                  <Text size="xsmall" className="text-ui-fg-subtle">
                    {t("overview.curations")}
                  </Text>
                  <Text weight="plus">{col.curationsCount}</Text>
                </div>
              </div>

              {col.hasVectorEmbedder && (
                <div className="mt-2">
                  <Badge color="blue" size="small">
                    {t("overview.vectorAiBadge", {
                      model: col.embedderModel || "",
                    })}
                  </Badge>
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between gap-x-2">
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
          </div>
        ))}
      </div>

      <div>
        <Heading level="h2" className="mb-3">
          {t("overview.recentJobsTitle")}
        </Heading>
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
                <Table.Cell>-</Table.Cell>
                <Table.Cell>-</Table.Cell>
                <Table.Cell>-</Table.Cell>
                <Table.Cell>-</Table.Cell>
                <Table.Cell>-</Table.Cell>
              </Table.Row>
            ) : (
              syncJobs.map((job) => (
                <Table.Row key={job.id}>
                  <Table.Cell className="font-medium capitalize">
                    {job.entity}
                  </Table.Cell>
                  <Table.Cell>{job.action}</Table.Cell>
                  <Table.Cell className="font-mono text-xs">
                    {job.collection_name}
                  </Table.Cell>
                  <Table.Cell>
                    {t("overview.docsCount", {
                      count: job.documents_processed,
                    })}
                    {job.documents_failed > 0
                      ? t("overview.failedCount", {
                          count: job.documents_failed,
                        })
                      : ""}
                  </Table.Cell>
                  <Table.Cell>
                    {job.duration_ms != null ? `${job.duration_ms} ms` : "-"}
                  </Table.Cell>
                  <Table.Cell>
                    <Badge
                      color={
                        job.status === "completed"
                          ? "green"
                          : job.status === "failed"
                            ? "red"
                            : "orange"
                      }
                      size="small"
                    >
                      {job.status}
                    </Badge>
                  </Table.Cell>
                </Table.Row>
              ))
            )}
          </Table.Body>
        </Table>
      </div>
    </div>
  )
}
