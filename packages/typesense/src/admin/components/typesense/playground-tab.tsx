import { zodResolver } from "@hookform/resolvers/zod"
import { Form, KeyboundForm } from "@medusajs/dashboard/components"
import { Button, Container, Heading, Input, Select } from "@medusajs/ui"
import React, { useEffect } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { PlaygroundResultsSection } from "./playground-results-section"
import type { CollectionOverviewItem, PlaygroundResponse } from "./types"

const playgroundFormSchema = z.object({
  playEntity: z.string().min(1),
  playQuery: z.string(),
  playMode: z.string(),
  playAlpha: z.string(),
})

export interface PlaygroundTabProps {
  collections: CollectionOverviewItem[]
  playEntity: string
  setPlayEntity: (val: string) => void
  playQuery: string
  setPlayQuery: (val: string) => void
  playMode: string
  setPlayMode: (val: string) => void
  playAlpha: string
  setPlayAlpha: (val: string) => void
  playResult: PlaygroundResponse | null
  playLoading: boolean
  onRunPlayground: (e?: React.FormEvent) => void
}

export const PlaygroundTab: React.FC<PlaygroundTabProps> = ({
  collections,
  playEntity,
  setPlayEntity,
  playQuery,
  setPlayQuery,
  playMode,
  setPlayMode,
  playAlpha,
  setPlayAlpha,
  playResult,
  playLoading,
  onRunPlayground,
}) => {
  const { t } = useTranslation()

  const form = useForm({
    resolver: zodResolver(playgroundFormSchema),
    defaultValues: {
      playEntity,
      playQuery,
      playMode,
      playAlpha,
    },
  })

  useEffect(() => {
    form.reset({
      playEntity,
      playQuery,
      playMode,
      playAlpha,
    })
  }, [playEntity, playQuery, playMode, playAlpha, form])

  return (
    <div className="flex flex-col gap-y-4">
      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Heading level="h2">{t("tabs.playground")}</Heading>
        </div>

        <Form {...form}>
          <KeyboundForm
            onSubmit={form.handleSubmit(() => onRunPlayground())}
            className="grid grid-cols-1 gap-4 px-6 py-4 md:grid-cols-5"
          >
            <Form.Field
              control={form.control}
              name="playEntity"
              render={({ field }: any) => (
                <Form.Item>
                  <Form.Label>{t("playground.entityLabel")}</Form.Label>
                  <Form.Control>
                    <Select
                      value={field.value}
                      onValueChange={(val) => {
                        field.onChange(val)
                        setPlayEntity(val)
                      }}
                    >
                      <Select.Trigger>
                        <Select.Value />
                      </Select.Trigger>
                      <Select.Content>
                        {collections.map((c) => (
                          <Select.Item key={c.entity} value={c.entity}>
                            {c.entity}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select>
                  </Form.Control>
                </Form.Item>
              )}
            />

            <div className="md:col-span-2">
              <Form.Field
                control={form.control}
                name="playQuery"
                render={({ field }: any) => (
                  <Form.Item>
                    <Form.Label>{t("playground.queryLabel")}</Form.Label>
                    <Form.Control>
                      <Input
                        placeholder={t("playground.queryPlaceholder")}
                        {...field}
                        onChange={(e) => {
                          field.onChange(e)
                          setPlayQuery(e.target.value)
                        }}
                      />
                    </Form.Control>
                  </Form.Item>
                )}
              />
            </div>

            <Form.Field
              control={form.control}
              name="playMode"
              render={({ field }: any) => (
                <Form.Item>
                  <Form.Label>{t("playground.modeLabel")}</Form.Label>
                  <Form.Control>
                    <Select
                      value={field.value}
                      onValueChange={(val) => {
                        field.onChange(val)
                        setPlayMode(val)
                      }}
                    >
                      <Select.Trigger>
                        <Select.Value />
                      </Select.Trigger>
                      <Select.Content>
                        <Select.Item value="keyword">
                          {t("playground.modeKeyword")}
                        </Select.Item>
                        <Select.Item value="hybrid">
                          {t("playground.modeHybrid")}
                        </Select.Item>
                        <Select.Item value="semantic">
                          {t("playground.modeSemantic")}
                        </Select.Item>
                        <Select.Item value="conversational">
                          {t("playground.modeConversational")}
                        </Select.Item>
                      </Select.Content>
                    </Select>
                  </Form.Control>
                </Form.Item>
              )}
            />

            <div className="flex items-end gap-x-2">
              <div className="w-24">
                <Form.Field
                  control={form.control}
                  name="playAlpha"
                  render={({ field }: any) => (
                    <Form.Item>
                      <Form.Label>{t("playground.alphaLabel")}</Form.Label>
                      <Form.Control>
                        <Input
                          {...field}
                          onChange={(e) => {
                            field.onChange(e)
                            setPlayAlpha(e.target.value)
                          }}
                        />
                      </Form.Control>
                    </Form.Item>
                  )}
                />
              </div>
              <Button
                type="submit"
                variant="primary"
                size="small"
                isLoading={playLoading}
              >
                {t("playground.searchButton")}
              </Button>
            </div>
          </KeyboundForm>
        </Form>
      </Container>

      {playResult && <PlaygroundResultsSection playResult={playResult} />}
    </div>
  )
}
