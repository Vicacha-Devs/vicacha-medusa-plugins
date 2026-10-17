import { zodResolver } from "@hookform/resolvers/zod"
import { Form, KeyboundForm, SectionRow } from "@medusajs/dashboard/components"
import { z } from "@medusajs/framework/zod"
import {
  Badge,
  Button,
  Container,
  Heading,
  Input,
  Select,
  Switch,
} from "@medusajs/ui"
import React, { useEffect } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import type { OdooConnectionFormState } from "../hooks/use-odoo-dashboard"

const odooConnectionFormSchema = z.object({
  url: z.string().url(),
  db: z.string().min(1),
  username: z.string().min(1),
  password: z.string(),
  apiKey: z.string(),
  protocol: z.enum(["jsonrpc", "json2"]),
  webhookSecret: z.string(),
  allowPrivateNetwork: z.boolean(),
})

export interface ConnectionTabProps {
  form: OdooConnectionFormState
  onFormChange: React.Dispatch<React.SetStateAction<OdooConnectionFormState>>
  savedFlags?: {
    hasPassword?: boolean
    hasApiKey?: boolean
    hasWebhookSecret?: boolean
  }
  isVerifying: boolean
  isSaving: boolean
  onVerify: () => void
  onSave: () => void
}

export const ConnectionTab = ({
  form,
  onFormChange,
  savedFlags,
  isVerifying,
  isSaving,
  onVerify,
  onSave,
}: ConnectionTabProps) => {
  const { t } = useTranslation()
  const rhf = useForm<OdooConnectionFormState>({
    resolver: zodResolver(odooConnectionFormSchema),
    defaultValues: form,
  })

  useEffect(() => {
    rhf.reset(form)
  }, [form, rhf])

  const updateField = <K extends keyof OdooConnectionFormState>(
    field: K,
    value: OdooConnectionFormState[K]
  ) => {
    rhf.setValue(field as any, value as never, {
      shouldDirty: true,
      shouldValidate: true,
    })
    onFormChange((prev) => ({ ...prev, [field]: value }))
  }

  const textFields = [
    { name: "url" as const, id: "odoo-url", label: t("connectionTab.urlLabel"), placeholder: t("connectionTab.urlPlaceholder") },
    { name: "db" as const, id: "odoo-db", label: t("connectionTab.dbLabel"), placeholder: t("connectionTab.dbPlaceholder") },
    { name: "username" as const, id: "odoo-user", label: t("connectionTab.usernameLabel"), placeholder: t("connectionTab.usernamePlaceholder") },
    { name: "password" as const, id: "odoo-pass", label: `${t("connectionTab.passwordLabel")} ${savedFlags?.hasPassword ? t("connectionTab.savedSuffix") : ""}`.trim(), placeholder: t("connectionTab.passwordPlaceholder"), type: "password", optional: true },
    { name: "apiKey" as const, id: "odoo-apikey", label: `${t("connectionTab.apiKeyLabel")} ${savedFlags?.hasApiKey ? t("connectionTab.savedSuffix") : ""}`.trim(), placeholder: t("connectionTab.apiKeyPlaceholder"), type: "password", optional: true },
    { name: "webhookSecret" as const, id: "odoo-webhook-secret", label: `${t("connectionTab.webhookSecretLabel")} ${savedFlags?.hasWebhookSecret ? t("connectionTab.savedSuffix") : ""}`.trim(), placeholder: t("connectionTab.webhookSecretPlaceholder"), type: "password", optional: true },
  ]

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{t("tabs.connection")}</Heading>
        <Badge size="2xsmall" color="blue">
          {form.protocol.toUpperCase()}
        </Badge>
      </div>

      <KeyboundForm
        onSubmit={rhf.handleSubmit(() => onSave())}
        className="divide-y"
      >
        <div className="grid grid-cols-1 gap-4 px-6 py-4 md:grid-cols-2">
          {textFields.map((cfg) => (
            <Form.Field
              key={cfg.name}
              control={rhf.control}
              name={cfg.name}
              render={() => (
                <Form.Item>
                  <Form.Label optional={cfg.optional}>{cfg.label}</Form.Label>
                  <Form.Control>
                    <Input
                      id={cfg.id}
                      type={cfg.type}
                      placeholder={cfg.placeholder}
                      value={form[cfg.name]}
                      onChange={(e) => updateField(cfg.name, e.target.value)}
                    />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />
          ))}

          <Form.Field
            control={rhf.control}
            name="protocol"
            render={() => (
              <Form.Item>
                <Form.Label>{t("connectionTab.protocolLabel")}</Form.Label>
                <Form.Control>
                  <Select
                    value={form.protocol}
                    onValueChange={(val) =>
                      updateField("protocol", val === "json2" ? "json2" : "jsonrpc")
                    }
                  >
                    <Select.Trigger id="odoo-protocol">
                      <Select.Value placeholder={t("connectionTab.protocolPlaceholder")} />
                    </Select.Trigger>
                    <Select.Content>
                      <Select.Item value="jsonrpc">JSON-RPC 2.0 (Odoo 14–18)</Select.Item>
                      <Select.Item value="json2">JSON-2 API (Odoo 19+)</Select.Item>
                    </Select.Content>
                  </Select>
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />
        </div>

        <SectionRow
          title={t("connectionTab.privateNetworkLabel")}
          value={
            <Switch
              id="odoo-private-net"
              checked={form.allowPrivateNetwork}
              onCheckedChange={(checked) => updateField("allowPrivateNetwork", checked)}
            />
          }
        />

        <div className="flex items-center justify-end gap-x-2 px-6 py-4">
          <Button
            type="button"
            size="small"
            variant="secondary"
            isLoading={isVerifying}
            onClick={onVerify}
          >
            {t("connectionTab.verifyButton")}
          </Button>
          <Button type="submit" size="small" variant="primary" isLoading={isSaving}>
            {t("connectionTab.saveButton")}
          </Button>
        </div>
      </KeyboundForm>
    </Container>
  )
}
