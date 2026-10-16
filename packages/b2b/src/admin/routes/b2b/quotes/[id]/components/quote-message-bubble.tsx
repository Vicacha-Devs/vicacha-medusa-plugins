import { Buildings, Tag, User } from "@medusajs/icons"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { QueryQuoteMessage } from "../../../../../../types"

export const ItemChip = ({
  item,
  draftOrderId,
}: {
  item: any
  draftOrderId?: string
}) => {
  const title =
    item?.variant?.product?.title ?? item?.title ?? `...${item?.id?.slice(-8)}`
  const subtitle =
    item?.variant?.title && item.variant.title !== "Default Title"
      ? item.variant.title
      : null

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

export interface MessageBubbleProps {
  message: QueryQuoteMessage
  item: any | undefined
  draftOrderId?: string
  customerFallback?: any
}

export const MessageBubble = ({
  message,
  item,
  draftOrderId,
  customerFallback,
}: MessageBubbleProps) => {
  const { t } = useTranslation()
  const isAdmin = !!message.admin_id
  const m = message as any

  const resolvedCustomer = m.customer ?? customerFallback

  const senderName = isAdmin
    ? m.admin_name || t("quotes.messages.adminSender")
    : [resolvedCustomer?.first_name, resolvedCustomer?.last_name]
        .filter(Boolean)
        .join(" ") ||
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
    <div
      className={`flex gap-2.5 px-4 py-2 ${
        isAdmin ? "flex-row-reverse" : "flex-row"
      }`}
    >
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

      <div
        className={`flex flex-col gap-0.5 max-w-[70%] ${
          isAdmin ? "items-end" : "items-start"
        }`}
      >
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
