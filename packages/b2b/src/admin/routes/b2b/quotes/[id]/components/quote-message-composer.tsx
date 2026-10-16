import { zodResolver } from "@hookform/resolvers/zod"
import { Form } from "@medusajs/dashboard/components"
import { PaperPlane } from "@medusajs/icons"
import { IconButton, Select, toast } from "@medusajs/ui"
import React from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { useCreateQuoteMessage } from "../../../../../hooks/api/quotes"
import { MessageFormData, MessageSchema } from "./validators"

export interface QuoteMessageComposerProps {
  quoteId: string
  selectItems: any[]
}

export const QuoteMessageComposer = ({
  quoteId,
  selectItems,
}: QuoteMessageComposerProps) => {
  const { t } = useTranslation()

  const form = useForm<MessageFormData>({
    defaultValues: { text: "", item_id: null },
    resolver: zodResolver(MessageSchema),
  })

  const { mutateAsync: createMessage, isPending: isSending } =
    useCreateQuoteMessage(quoteId)

  const handleSubmit = form.handleSubmit(async (data) => {
    await createMessage(
      { text: data.text, item_id: data.item_id ?? undefined },
      {
        onSuccess: () => {
          form.reset()
          toast.success(t("quotes.messages.sentSuccess"))
        },
        onError: (e: any) => toast.error(e.message),
      }
    )
  })

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const textValue = form.watch("text")

  return (
    <div className="px-4 py-3 bg-ui-bg-subtle">
      <Form {...form}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          {selectItems.length > 0 && (
            <Form.Field
              control={form.control}
              name="item_id"
              render={({ field: { onChange, ref, ...field } }: any) => (
                <Form.Item>
                  <Form.Control>
                    <Select
                      onValueChange={onChange}
                      {...field}
                      value={field.value ?? undefined}
                    >
                      <Select.Trigger
                        className="bg-ui-bg-base h-8 text-xs"
                        ref={ref}
                      >
                        <Select.Value
                          placeholder={t(
                            "quotes.messages.selectItem",
                            "Attach an item (optional)"
                          )}
                        />
                      </Select.Trigger>
                      <Select.Content>
                        {selectItems.map((item) => (
                          <Select.Item key={item.id} value={item.id}>
                            {item.variant_sku ?? item.title ?? item.id}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select>
                  </Form.Control>
                </Form.Item>
              )}
            />
          )}

          <div className="flex items-end gap-2 rounded-2xl border border-ui-border-base bg-ui-bg-base px-3 py-2 focus-within:border-ui-border-interactive transition-colors">
            <Form.Field
              control={form.control}
              name="text"
              render={({ field: { ref, ...field } }: any) => (
                <Form.Item className="flex-1 m-0">
                  <Form.Control>
                    <textarea
                      {...field}
                      ref={ref}
                      rows={1}
                      placeholder={t(
                        "quotes.messages.placeholder",
                        "Write a message…"
                      )}
                      onKeyDown={handleKeyDown}
                      className="w-full resize-none bg-transparent txt-compact-small text-ui-fg-base placeholder:text-ui-fg-muted outline-none leading-5 max-h-32 overflow-y-auto"
                      style={{ fieldSizing: "content" } as any}
                    />
                  </Form.Control>
                </Form.Item>
              )}
            />
            <IconButton
              type="submit"
              size="small"
              variant="transparent"
              disabled={!textValue?.trim() || isSending}
              className={`shrink-0 transition-colors ${
                textValue?.trim()
                  ? "text-ui-fg-interactive hover:text-ui-fg-interactive-hover"
                  : "text-ui-fg-disabled"
              }`}
            >
              <PaperPlane />
            </IconButton>
          </div>
        </form>
      </Form>
    </div>
  )
}
