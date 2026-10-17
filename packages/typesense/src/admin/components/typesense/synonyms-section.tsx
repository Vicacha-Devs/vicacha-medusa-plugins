import { zodResolver } from "@hookform/resolvers/zod"
import { Form, KeyboundForm } from "@medusajs/dashboard/components"
import { Button, Container, Heading, Input, Table } from "@medusajs/ui"
import React, { useEffect } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import type { SynonymItem } from "./types"

const synonymFormSchema = z.object({
  synId: z.string().min(1),
  synRoot: z.string(),
  synTerms: z.string().min(1),
})

export interface SynonymsSectionProps {
  synonyms: SynonymItem[]
  synId: string
  setSynId: (val: string) => void
  synRoot: string
  setSynRoot: (val: string) => void
  synTerms: string
  setSynTerms: (val: string) => void
  savingSynonym?: boolean
  onCreateSynonym: (eOrValues?: any) => void
  onDeleteSynonym: (id: string) => void
}

export const SynonymsSection: React.FC<SynonymsSectionProps> = ({
  synonyms,
  synId,
  setSynId,
  synRoot,
  setSynRoot,
  synTerms,
  setSynTerms,
  savingSynonym = false,
  onCreateSynonym,
  onDeleteSynonym,
}) => {
  const { t } = useTranslation()

  const synonymForm = useForm({
    resolver: zodResolver(synonymFormSchema),
    defaultValues: {
      synId,
      synRoot,
      synTerms,
    },
  })

  useEffect(() => {
    synonymForm.reset({ synId, synRoot, synTerms })
  }, [synId, synRoot, synTerms, synonymForm])

  return (
    <Container className="divide-y p-0 overflow-hidden">
      <div className="px-6 py-4">
        <Heading level="h2">{t("merchandising.synonymsTitle")}</Heading>
      </div>

      <Form {...synonymForm}>
        <KeyboundForm
          onSubmit={synonymForm.handleSubmit((vals) => onCreateSynonym(vals))}
          className="flex flex-col gap-y-3 px-6 py-4"
        >
          <Form.Field
            control={synonymForm.control}
            name="synId"
            render={({ field }: any) => (
              <Form.Item>
                <Form.Control>
                  <Input
                    placeholder={t("merchandising.synonymIdPlaceholder")}
                    {...field}
                    onChange={(e) => {
                      field.onChange(e)
                      setSynId(e.target.value)
                    }}
                  />
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />
          <Form.Field
            control={synonymForm.control}
            name="synRoot"
            render={({ field }: any) => (
              <Form.Item>
                <Form.Control>
                  <Input
                    placeholder={t("merchandising.synonymRootPlaceholder")}
                    {...field}
                    onChange={(e) => {
                      field.onChange(e)
                      setSynRoot(e.target.value)
                    }}
                  />
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />
          <Form.Field
            control={synonymForm.control}
            name="synTerms"
            render={({ field }: any) => (
              <Form.Item>
                <Form.Control>
                  <Input
                    placeholder={t("merchandising.synonymTermsPlaceholder")}
                    {...field}
                    onChange={(e) => {
                      field.onChange(e)
                      setSynTerms(e.target.value)
                    }}
                  />
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              variant="secondary"
              size="small"
              isLoading={savingSynonym}
            >
              {t("merchandising.saveSynonymButton")}
            </Button>
          </div>
        </KeyboundForm>
      </Form>

      {synonyms.length > 0 && (
        <Table>
          <Table.Body>
            {synonyms.map((s) => (
              <Table.Row key={s.id}>
                <Table.Cell className="font-medium">{s.id}</Table.Cell>
                <Table.Cell className="text-xs">
                  {s.root ? `${s.root} → ` : ""}
                  {Array.isArray(s.synonyms) ? s.synonyms.join(", ") : ""}
                </Table.Cell>
                <Table.Cell className="text-right">
                  <Button
                    variant="transparent"
                    size="small"
                    onClick={() => onDeleteSynonym(s.id)}
                  >
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
