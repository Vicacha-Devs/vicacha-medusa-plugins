import type React from "react"
import { Button, Container, Heading } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import type { LiveSessionRecord } from "../../modules/social-commerce/types/index.js"
import type { CreateLiveFormState } from "../hooks/use-social-dashboard.js"
import { LiveCreateForm, createLiveFormSchema } from "./live-create-form.js"
import { LiveTable } from "./live-table.js"

export { createLiveFormSchema }

export interface LiveTabProps {
  liveSessions: LiveSessionRecord[]
  liveForm?: CreateLiveFormState
  onLiveFormChange?: React.Dispatch<React.SetStateAction<CreateLiveFormState>>
  onCreateLiveSession?: (e: React.FormEvent) => void
  onLiveTransition: (sessionId: string, action: "start" | "end") => void
  onCreateClick?: () => void
}

const DEFAULT_LIVE_FORM: CreateLiveFormState = {
  title: "",
  platform: "tiktok",
  streamUrl: "",
}

export const LiveTab = ({
  liveSessions,
  liveForm = DEFAULT_LIVE_FORM,
  onLiveFormChange,
  onCreateLiveSession,
  onLiveTransition,
  onCreateClick,
}: LiveTabProps) => {
  const { t } = useTranslation()

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">
          {t("tabs.live", { count: liveSessions.length })}
        </Heading>
        {onCreateClick ? (
          <Button
            type="button"
            variant="secondary"
            size="small"
            onClick={onCreateClick}
          >
            {t("liveTab.scheduleButton")}
          </Button>
        ) : null}
      </div>

      {onCreateLiveSession && onLiveFormChange ? (
        <div className="px-6 py-4">
          <LiveCreateForm
            liveForm={liveForm}
            onLiveFormChange={onLiveFormChange}
            onCreateLiveSession={onCreateLiveSession}
          />
        </div>
      ) : null}

      <LiveTable
        liveSessions={liveSessions}
        onLiveTransition={onLiveTransition}
      />
    </Container>
  )
}

