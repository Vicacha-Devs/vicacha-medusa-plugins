import { AdminOrderPreview } from "@medusajs/framework/types"
import { zodResolver } from "@hookform/resolvers/zod"
import { Badge, Container, Heading, IconButton, Select, toast } from "@medusajs/ui"
import { Buildings, PaperPlane, Tag, User } from "@medusajs/icons"
import { useEffect, useMemo, useRef } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Link, useParams } from "react-router-dom"
import { z } from "zod"

import { Form } from "@vicacha-devs/medusa-shared-admin/admin"
import { QueryQuote, QueryQuoteMessage } from "../../../../../../types"
import { useCreateQuoteMessage } from "../../../../../hooks/api/quotes"

const MessageSchema = z.object({
  text: z.string().min(1),
  item_id: z.string().nullish(),
})

type MessageFormData = z.infer<typeof MessageSchema>

interface QuoteMessagesSectionProps {
  quote: QueryQuote
  preview?: AdminOrderPreview
}

const ItemChip = ({ item, draftOrderId }: { item: any; draftOrderId?: string }) => {
  const title = item?.variant?.product?.title ?? item?.title ?? `...${item?.id?.slice(-8)}`
  const subtitle =
    item?.variant?.title && item.variant.title !== "Default Title" ? item.variant.title : null

  const inner = (
    <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-ui-bg-subtle border border-ui-border-base txt-compact-xsmall text-ui-fg-subtle">
      <Tag className="h-3 w-3 shrink-0" />
      <span className="truncate max-w-[160px]">{title}</span>
      {subtitle && <span className="text-ui-fg-muted">· {subtitle}</span>}
    </span>
  )

  if (draftOrderId) {
    return (
      <Link
        to={`/orders/${draftOrderId}`}
        className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover transition-colors"
      >
        {inner}
      </Link>
    )
  }
  return inner
}

const MessageBubble = ({
  message,
  item,
  draftOrderId,
  customerFallback,
}: {
  message: QueryQuoteMessage
  item: any | undefined
  draftOrderId?: string
  customerFallback?: any
}) => {
  const { t } = useTranslation()
  const isAdmin = !!message.admin_id
  const m = message as any

  const resolvedCustomer = m.customer ?? customerFallback

  const senderName = isAdmin
    ? m.admin_name || t("quotes.messages.adminSender")
    : [resolvedCustomer?.first_name, resolvedCustomer?.last_name].filter(Boolean).join(" ") ||
      resolvedCustomer?.email ||
      t("quotes.messages.customerSender")

  const senderHref = isAdmin
    ? `/settings/users/${message.admin_id}`
    : `/customers/${message.customer_id}`

  const timestamp = m.created_at
    ? new Date(m.created_at).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null

  return (
    <div className={`flex gap-2.5 px-4 py-2 ${isAdmin ? "flex-row-reverse" : "flex-row"}`}>
      <div
        className={`shrink-0 h-7 w-7 rounded-full flex items-center justify-center ${
          isAdmin ? "bg-ui-tag-purple-bg" : "bg-ui-tag-blue-bg"
        }`}
      >
        {isAdmin ? (
          <Buildings className="h-3.5 w-3.5 text-ui-tag-purple-icon" />
        ) : (
          <User className="h-3.5 w-3.5 text-ui-tag-blue-icon" />
        )}
      </div>

      <div className={`flex flex-col gap-0.5 max-w-[70%] ${isAdmin ? "items-end" : "items-start"}`}>
        <Link
          to={senderHref}
          className="txt-compact-xsmall-plus text-ui-fg-interactive hover:text-ui-fg-interactive-hover transition-colors"
        >
          {senderName}
        </Link>

        {item && <ItemChip item={item} draftOrderId={draftOrderId} />}

        <div
          className={`px-3 py-2 rounded-2xl txt-compact-small whitespace-pre-wrap break-words ${
            isAdmin
              ? "bg-ui-tag-purple-bg text-ui-fg-base rounded-tr-sm"
              : "bg-ui-bg-component text-ui-fg-base rounded-tl-sm"
          }`}
        >
          {message.text}
        </div>

        {timestamp && (
          <span className="txt-compact-xsmall text-ui-fg-muted">{timestamp}</span>
        )}
      </div>
    </div>
  )
}

export const QuoteMessagesSection = ({ quote, preview }: QuoteMessagesSectionProps) => {
  const { id } = useParams()
  const { t } = useTranslation()
  const q = quote as any
  const scrollRef = useRef<HTMLDivElement>(null)

  const messages: QueryQuoteMessage[] = Array.isArray(q.messages) ? q.messages : []
  const draftOrderId = q.draft_order_id ?? q.draft_order?.id
  const draftOrderItems: any[] = q.draft_order?.items ?? []

  const customerById = useMemo(() => {
    const map = new Map<string, any>()
    if (q.customer) map.set(q.customer.id, q.customer)
    messages.forEach((m: any) => {
      if (m.customer) map.set(m.customer.id ?? m.customer_id, m.customer)
    })
    return map
  }, [q.customer, messages])

  const selectItems: any[] = preview?.items ?? draftOrderItems

  const sorted = useMemo(
    () =>
      [...messages].sort(
        (a, b) =>
          new Date((a as any).created_at).getTime() -
          new Date((b as any).created_at).getTime()
      ),
    [messages]
  )

  const itemsById = useMemo(
    () => new Map(draftOrderItems.map((i) => [i.id, i])),
    [draftOrderItems]
  )

  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [sorted.length])

  const form = useForm<MessageFormData>({
    defaultValues: { text: "", item_id: null },
    resolver: zodResolver(MessageSchema),
  })

  const { mutateAsync: createMessage, isPending: isSending } = useCreateQuoteMessage(id!)

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
    <Container className="divide-y p-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{t("quotes.messages.title", "Messages")}</Heading>
        <Badge size="xsmall" color="grey">{messages.length}</Badge>
      </div>

      {/* Scrollable message list */}
      <div
        ref={scrollRef}
        className="flex flex-col py-2 overflow-y-auto"
        style={{ maxHeight: "400px", minHeight: sorted.length === 0 ? "80px" : undefined }}
      >
        {sorted.length === 0 ? (
          <p className="px-6 py-4 txt-compact-small text-ui-fg-subtle">
            {t("quotes.messages.empty", "No messages yet")}
          </p>
        ) : (
          sorted.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              item={msg.item_id ? itemsById.get(msg.item_id) : undefined}
              draftOrderId={draftOrderId}
              customerFallback={customerById.get((msg as any).customer_id)}
            />
          ))
        )}
      </div>

      {/* Compose area */}
      <div className="px-4 py-3 bg-ui-bg-subtle">
        <Form {...form}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            {/* Item picker (shown above input when items exist) */}
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
                        <Select.Trigger className="bg-ui-bg-base h-8 text-xs" ref={ref}>
                          <Select.Value
                            placeholder={t("quotes.messages.selectItem", "Attach an item (optional)")}
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

            {/* Chat-style input row */}
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
                        placeholder={t("quotes.messages.placeholder", "Write a message…")}
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
    </Container>
  )
}
