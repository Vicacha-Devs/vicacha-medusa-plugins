import { AdminOrderPreview } from "@medusajs/framework/types"
import { Badge, Container, Heading } from "@medusajs/ui"
import { useEffect, useMemo, useRef } from "react"
import { useTranslation } from "react-i18next"
import { useParams } from "react-router-dom"

import { QueryQuote, QueryQuoteMessage } from "../../../../../../types"
import { MessageBubble } from "./quote-message-bubble"
import { QuoteMessageComposer } from "./quote-message-composer"

interface QuoteMessagesSectionProps {
  quote: QueryQuote
  preview?: AdminOrderPreview
}

export const QuoteMessagesSection = ({
  quote,
  preview,
}: QuoteMessagesSectionProps) => {
  const { id } = useParams()
  const { t } = useTranslation()
  const q = quote as any
  const scrollRef = useRef<HTMLDivElement>(null)

  const messages: QueryQuoteMessage[] = Array.isArray(q.messages)
    ? q.messages
    : []
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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [sorted.length])

  return (
    <Container className="divide-y p-0 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{t("quotes.messages.title", "Messages")}</Heading>
        <Badge size="xsmall" color="grey">
          {messages.length}
        </Badge>
      </div>

      <div
        ref={scrollRef}
        className="flex flex-col py-2 overflow-y-auto"
        style={{
          maxHeight: "400px",
          minHeight: sorted.length === 0 ? "80px" : undefined,
        }}
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

      <QuoteMessageComposer quoteId={id!} selectItems={selectItems} />
    </Container>
  )
}
