import {
  CheckCircle,
  CogSixTooth,
  DocumentText,
  ExclamationCircle,
  Plus,
} from "@medusajs/icons"
import {
  Button,
  clx,
  Container,
  Heading,
  Skeleton,
  Text,
} from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import type { DocumentRecord } from "../../../types"

interface DocumentsOverviewSectionProps {
  documents: DocumentRecord[]
  count: number
  loading?: boolean
}

export const DocumentsOverviewSection: React.FC<
  DocumentsOverviewSectionProps
> = ({ documents, count, loading = false }) => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const generatedCount = documents.filter((d) => d.status === "generated").length
  const staleCount = documents.filter((d) => d.is_stale).length
  const failedCount = documents.filter((d) => d.status === "failed").length

  return (
    <div className="flex flex-col gap-y-4">
      <div>
        <Heading className="font-sans font-medium h1-core">
          {t("hub.title")}
        </Heading>
        <Text className="text-ui-fg-subtle mt-1">
          {t("hub.subtitle", { count })}
        </Text>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title={t("hub.allTypes")}
          value={count}
          icon={<DocumentText />}
          loading={loading}
        />

        <StatCard
          title={t("statuses.generated")}
          value={generatedCount}
          icon={<CheckCircle />}
          loading={loading}
        />

        <StatCard
          title={t("statuses.stale")}
          value={staleCount}
          icon={<ExclamationCircle />}
          loading={loading}
        />

        <StatCard
          title={t("statuses.failed")}
          value={failedCount}
          icon={<ExclamationCircle />}
          loading={loading}
        />
      </div>

      <Container className="p-0 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2">
          <NavigationCard
            icon={<CogSixTooth />}
            title={t("hub.settingsButton")}
            description={t("settings.subtitle")}
            onClick={() => navigate("/documents/settings")}
            position="top-left"
          />

          <NavigationCard
            icon={<Plus />}
            title={t("hub.bulkTitle")}
            description={t("hub.bulkSubtitle")}
            onClick={() => navigate("/documents/bulk-generate")}
            position="top-right"
          />
        </div>
      </Container>
    </div>
  )
}

type StatCardProps = {
  title: string
  value: number
  icon: React.ReactNode
  loading?: boolean
  onClick?: () => void
}

export const StatCard = ({
  title,
  value,
  icon,
  loading = false,
  onClick,
}: StatCardProps) => {
  return (
    <Container
      className={clx(
        "p-0",
        onClick
          ? "cursor-pointer hover:bg-ui-bg-subtle-hover transition-colors"
          : ""
      )}
      onClick={onClick}
    >
      <div className="p-5">
        <div className="flex items-center justify-between">
          <Text className="text-ui-fg-subtle">{title}</Text>

          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-ui-bg-subtle">
            {icon}
          </div>
        </div>

        <div className="mt-3">
          {loading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <Heading level="h2">{value}</Heading>
          )}
        </div>
      </div>
    </Container>
  )
}

type Position = "top-left" | "top-right" | "bottom-left" | "bottom-right"

type NavigationCardProps = {
  icon: React.ReactNode
  title: string
  description: string
  onClick: () => void
  position: Position
}

export const NavigationCard = ({
  icon,
  title,
  description,
  onClick,
  position,
}: NavigationCardProps) => {
  const isBottom = position === "bottom-left" || position === "bottom-right"
  const isLeft = position === "top-left" || position === "bottom-left"

  return (
    <Button
      type="button"
      variant="transparent"
      className={clx(
        "h-auto w-full justify-start rounded-none text-left p-6 hover:bg-ui-bg-subtle-hover transition-colors",
        !isBottom ? "border-b border-ui-border-base" : "",
        isLeft ? "md:border-r md:border-ui-border-base" : ""
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-x-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-md bg-ui-bg-subtle shrink-0">
          {icon}
        </div>

        <div>
          <Heading level="h3">{title}</Heading>

          <Text className="text-ui-fg-subtle mt-1">{description}</Text>
        </div>
      </div>
    </Button>
  )
}
