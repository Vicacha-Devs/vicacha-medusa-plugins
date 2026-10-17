import { zodResolver } from "@hookform/resolvers/zod"
import { Form, KeyboundForm } from "@medusajs/dashboard/components"
import { XMarkMini } from "@medusajs/icons"
import { Badge, Button, Container, Heading, Input } from "@medusajs/ui"
import React, { useEffect } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import type { StopwordSetItem } from "./types"

const stopwordsFormSchema = z.object({
  stopId: z.string().min(1),
  stopWordsStr: z.string().min(1),
})

export interface StopwordsSectionProps {
  stopwords: StopwordSetItem[]
  stopId: string
  setStopId: (val: string) => void
  stopWordsStr: string
  setStopWordsStr: (val: string) => void
  savingStopwords?: boolean
  onCreateStopwords: (eOrValues?: any) => void
  onDeleteStopwords: (id: string) => void
}

export const StopwordsSection: React.FC<StopwordsSectionProps> = ({
  stopwords,
  stopId,
  setStopId,
  stopWordsStr,
  setStopWordsStr,
  savingStopwords = false,
  onCreateStopwords,
  onDeleteStopwords,
}) => {
  const { t } = useTranslation()

  const stopwordsForm = useForm({
    resolver: zodResolver(stopwordsFormSchema),
    defaultValues: {
      stopId,
      stopWordsStr,
    },
  })

  useEffect(() => {
    stopwordsForm.reset({ stopId, stopWordsStr })
  }, [stopId, stopWordsStr, stopwordsForm])

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">{t("merchandising.stopwordsTitle")}</Heading>
      </div>

      <Form {...stopwordsForm}>
        <KeyboundForm
          onSubmit={stopwordsForm.handleSubmit((vals) =>
            onCreateStopwords(vals)
          )}
          className="grid grid-cols-1 gap-3 px-6 py-4 md:grid-cols-3"
        >
          <Form.Field
            control={stopwordsForm.control}
            name="stopId"
            render={({ field }: any) => (
              <Form.Item>
                <Form.Control>
                  <Input
                    placeholder={t("merchandising.stopwordIdPlaceholder")}
                    {...field}
                    onChange={(e) => {
                      field.onChange(e)
                      setStopId(e.target.value)
                    }}
                  />
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />
          <Form.Field
            control={stopwordsForm.control}
            name="stopWordsStr"
            render={({ field }: any) => (
              <Form.Item>
                <Form.Control>
                  <Input
                    placeholder={t("merchandising.stopwordsListPlaceholder")}
                    {...field}
                    onChange={(e) => {
                      field.onChange(e)
                      setStopWordsStr(e.target.value)
                    }}
                  />
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />
          <div className="flex items-center justify-end">
            <Button
              type="submit"
              variant="secondary"
              size="small"
              isLoading={savingStopwords}
            >
              {t("merchandising.saveStopwordsButton")}
            </Button>
          </div>
        </KeyboundForm>
      </Form>

      {stopwords.length > 0 && (
        <div className="flex flex-wrap gap-2 px-6 py-4">
          {stopwords.map((sw) => (
            <div key={sw.id} className="inline-flex items-center gap-x-1">
              <Badge color="grey" size="small">
                {sw.id} (
                {t("merchandising.wordsCount", {
                  count: Array.isArray(sw.stopwords) ? sw.stopwords.length : 0,
                })}
                )
              </Badge>
              <Button
                variant="transparent"
                size="small"
                onClick={() => onDeleteStopwords(sw.id)}
              >
                <XMarkMini />
              </Button>
            </div>
          ))}
        </div>
      )}
    </Container>
  )
}
