import type React from "react"
import { Button, Container, Heading } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import type { SocialMediaPostRecord } from "../../modules/social-commerce/types/index.js"
import type { CreateStoryFormState } from "../hooks/use-social-dashboard.js"
import { StoriesTable } from "./stories-table.js"
import {
  StoryCreateForm,
  createStoryFormSchema,
} from "./story-create-form.js"

export { createStoryFormSchema }

export interface StoriesTabProps {
  stories: SocialMediaPostRecord[]
  storyForm?: CreateStoryFormState
  onStoryFormChange?: React.Dispatch<React.SetStateAction<CreateStoryFormState>>
  onCreateStory?: (e: React.FormEvent) => void
  onCreateClick?: () => void
}

const DEFAULT_STORY_FORM: CreateStoryFormState = {
  title: "",
  mediaUrl: "",
  mediaType: "story",
  linkUrl: "",
  durationSeconds: 15,
}

export const StoriesTab = ({
  stories,
  storyForm = DEFAULT_STORY_FORM,
  onStoryFormChange,
  onCreateStory,
  onCreateClick,
}: StoriesTabProps) => {
  const { t } = useTranslation()

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">
          {t("tabs.stories", { count: stories.length })}
        </Heading>
        {onCreateClick ? (
          <Button
            type="button"
            variant="secondary"
            size="small"
            onClick={onCreateClick}
          >
            {t("storiesTab.publishButton")}
          </Button>
        ) : null}
      </div>

      {onCreateStory && onStoryFormChange ? (
        <div className="px-6 py-4">
          <StoryCreateForm
            storyForm={storyForm}
            onStoryFormChange={onStoryFormChange}
            onCreateStory={onCreateStory}
          />
        </div>
      ) : null}

      <StoriesTable stories={stories} />
    </Container>
  )
}

