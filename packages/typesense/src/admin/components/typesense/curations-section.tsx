import { zodResolver } from "@hookform/resolvers/zod"
import { Form, KeyboundForm } from "@medusajs/dashboard/components"
import { Button, Container, Heading, Input, Select, Table } from "@medusajs/ui"
import React, { useEffect } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import type { CurationItem } from "./types"

const curationFormSchema = z.object({
  curId: z.string().min(1),
  curQuery: z.string().min(1),
  curMatch: z.enum(["exact", "contains"]),
  curIncludesStr: z.string(),
  curExcludesStr: z.string(),
  curBannerTitle: z.string(),
})

export interface CurationsSectionProps {
  curations: CurationItem[]
  curId: string
  setCurId: (val: string) => void
  curQuery: string
  setCurQuery: (val: string) => void
  curMatch: "exact" | "contains"
  setCurMatch: (val: "exact" | "contains") => void
  curIncludesStr: string
  setCurIncludesStr: (val: string) => void
  curExcludesStr: string
  setCurExcludesStr: (val: string) => void
  curBannerTitle: string
  setCurBannerTitle: (val: string) => void
  savingCuration?: boolean
  onCreateCuration: (eOrValues?: any) => void
  onDeleteCuration: (id: string) => void
}

export const CurationsSection: React.FC<CurationsSectionProps> = (props) => {
  const { t } = useTranslation()
  const {
    curations,
    curId,
    setCurId,
    curQuery,
    setCurQuery,
    curMatch,
    setCurMatch,
    curIncludesStr,
    setCurIncludesStr,
    curExcludesStr,
    setCurExcludesStr,
    curBannerTitle,
    setCurBannerTitle,
    savingCuration = false,
    onCreateCuration,
    onDeleteCuration,
  } = props

  const curationForm = useForm({
    resolver: zodResolver(curationFormSchema),
    defaultValues: {
      curId,
      curQuery,
      curMatch,
      curIncludesStr,
      curExcludesStr,
      curBannerTitle,
    },
  })

  useEffect(() => {
    curationForm.reset({
      curId,
      curQuery,
      curMatch,
      curIncludesStr,
      curExcludesStr,
      curBannerTitle,
    })
  }, [curId, curQuery, curMatch, curIncludesStr, curExcludesStr, curBannerTitle, curationForm])

  const extraFields = [
    { name: "curIncludesStr" as const, ph: "merchandising.curationIncludesPlaceholder", set: setCurIncludesStr },
    { name: "curExcludesStr" as const, ph: "merchandising.curationExcludesPlaceholder", set: setCurExcludesStr },
    { name: "curBannerTitle" as const, ph: "merchandising.curationBannerPlaceholder", set: setCurBannerTitle },
  ]

  return (
    <Container className="divide-y p-0 overflow-hidden">
      <div className="px-6 py-4">
        <Heading level="h2">{t("merchandising.curationsTitle")}</Heading>
      </div>

      <Form {...curationForm}>
        <KeyboundForm
          onSubmit={curationForm.handleSubmit((vals) => onCreateCuration(vals))}
          className="flex flex-col gap-y-3 px-6 py-4"
        >
          <Form.Field
            control={curationForm.control}
            name="curId"
            render={({ field }: any) => (
              <Form.Item>
                <Form.Control>
                  <Input
                    placeholder={t("merchandising.curationIdPlaceholder")}
                    {...field}
                    onChange={(e) => {
                      field.onChange(e)
                      setCurId(e.target.value)
                    }}
                  />
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />
          <div className="grid grid-cols-2 gap-2">
            <Form.Field
              control={curationForm.control}
              name="curQuery"
              render={({ field }: any) => (
                <Form.Item>
                  <Form.Control>
                    <Input
                      placeholder={t("merchandising.curationQueryPlaceholder")}
                      {...field}
                      onChange={(e) => {
                        field.onChange(e)
                        setCurQuery(e.target.value)
                      }}
                    />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />
            <Form.Field
              control={curationForm.control}
              name="curMatch"
              render={({ field }: any) => (
                <Form.Item>
                  <Form.Control>
                    <Select
                      value={field.value}
                      onValueChange={(v) => {
                        field.onChange(v)
                        setCurMatch(v as "exact" | "contains")
                      }}
                    >
                      <Select.Trigger>
                        <Select.Value />
                      </Select.Trigger>
                      <Select.Content>
                        <Select.Item value="exact">{t("merchandising.matchExact")}</Select.Item>
                        <Select.Item value="contains">{t("merchandising.matchContains")}</Select.Item>
                      </Select.Content>
                    </Select>
                  </Form.Control>
                </Form.Item>
              )}
            />
          </div>

          {extraFields.map((ef) => (
            <Form.Field
              key={ef.name}
              control={curationForm.control}
              name={ef.name}
              render={({ field }: any) => (
                <Form.Item>
                  <Form.Control>
                    <Input
                      placeholder={t(ef.ph)}
                      {...field}
                      onChange={(e) => {
                        field.onChange(e)
                        ef.set(e.target.value)
                      }}
                    />
                  </Form.Control>
                </Form.Item>
              )}
            />
          ))}

          <div className="flex justify-end">
            <Button type="submit" variant="secondary" size="small" isLoading={savingCuration}>
              {t("merchandising.saveCurationButton")}
            </Button>
          </div>
        </KeyboundForm>
      </Form>

      {curations.length > 0 && (
        <Table>
          <Table.Body>
            {curations.map((c) => (
              <Table.Row key={c.id}>
                <Table.Cell className="font-medium">{c.id}</Table.Cell>
                <Table.Cell className="text-xs">
                  {t("merchandising.queryLabel")} <code>{c.rule?.query}</code> [{c.rule?.match}]
                </Table.Cell>
                <Table.Cell className="text-right">
                  <Button variant="transparent" size="small" onClick={() => onDeleteCuration(c.id)}>
                    {t("merchandising.deleteButton")}
                  </Button>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}
    </Container>
  )
}
