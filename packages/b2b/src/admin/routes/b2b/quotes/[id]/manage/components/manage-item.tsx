import { AdminOrder, AdminOrderPreview } from "@medusajs/framework/types"
import {
  ArrowUturnLeft,
  DocumentSeries,
  PencilSquare,
  XCircle,
  XMark,
} from "@medusajs/icons"
import { Badge, CurrencyInput, Hint, IconButton, Input, Label, Text, toast } from "@medusajs/ui"
import { useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  ActionMenu,
  AmountCell,
  currencySymbolMap,
  Thumbnail,
} from "@vicacha-devs/medusa-shared-admin/admin"

import {
  useAddItemsToQuote,
  useRemoveQuoteItem,
  useUpdateAddedQuoteItem,
  useUpdateQuoteItem,
} from "../../../../../../hooks/api"

type ManageItemProps = {
  originalItem: AdminOrder["items"][0]
  item: AdminOrderPreview["items"][0]
  currencyCode: string
  orderId: string
}

export const ManageItem = ({ originalItem, item, currencyCode, orderId }: ManageItemProps) => {
  const { t } = useTranslation()
  const [showPriceForm, setShowPriceForm] = useState(false)
  const priceRef = useRef<number>(item.unit_price)

  const { mutateAsync: addItems } = useAddItemsToQuote(orderId)
  const { mutateAsync: updateAddedItem } = useUpdateAddedQuoteItem(orderId)
  const { mutateAsync: updateOriginalItem } = useUpdateQuoteItem(orderId)
  const { mutateAsync: undoAction } = useRemoveQuoteItem(orderId)

  const addItemAction = useMemo(
    () => item.actions?.find((a) => a.action === "ITEM_ADD"),
    [item]
  )
  const updateItemAction = useMemo(
    () => item.actions?.find((a) => a.action === "ITEM_UPDATE"),
    [item]
  )

  const isAddedItem = !!addItemAction
  const isItemUpdated = !!updateItemAction
  const isItemRemoved = !!updateItemAction && item.quantity === item.detail.fulfilled_quantity

  const onUpdate = async ({ quantity, unit_price }: { quantity?: number; unit_price?: number }) => {
    if (typeof quantity === "number" && quantity <= item.detail.fulfilled_quantity) {
      toast.error(t("orders.edits.validation.quantityLowerThanFulfillment"))
      return
    }
    try {
      if (addItemAction) {
        await updateAddedItem({ quantity, unit_price, actionId: addItemAction.id })
      } else {
        await updateOriginalItem({ quantity, unit_price, itemId: item.id })
      }
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const onRemove = async () => {
    try {
      if (addItemAction) {
        await undoAction(addItemAction.id)
      } else {
        await updateOriginalItem({ quantity: item.detail.fulfilled_quantity, itemId: item.id })
      }
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const onRemoveUndo = async () => {
    try {
      if (updateItemAction) {
        await undoAction(updateItemAction.id)
      }
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const onDuplicate = async () => {
    try {
      await addItems({ items: [{ variant_id: item.variant_id, quantity: item.quantity }] })
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  return (
    <div className="bg-ui-bg-subtle shadow-elevation-card-rest my-2 rounded-xl">
      <div className="flex flex-col items-center gap-x-2 gap-y-2 p-3 text-sm md:flex-row">
        <div className="flex flex-1 items-center justify-between">
          <div className="flex flex-row items-center gap-x-3">
            <Thumbnail src={item.thumbnail} />
            <div className="flex flex-col">
              <div>
                <Text className="txt-small" as="span" weight="plus">
                  {item.title}
                </Text>
                {item.variant_sku && (
                  <span className="txt-small text-ui-fg-subtle"> ({item.variant_sku})</span>
                )}
              </div>
              <Text as="div" className="text-ui-fg-subtle txt-small">
                {item.product_title}
              </Text>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {isAddedItem && (
              <Badge size="2xsmall" rounded="full" color="blue">
                {t("general.new")}
              </Badge>
            )}
            {isItemRemoved ? (
              <Badge size="2xsmall" rounded="full" color="red">
                {t("general.removed")}
              </Badge>
            ) : (
              isItemUpdated && (
                <Badge size="2xsmall" rounded="full" color="orange">
                  {t("general.modified")}
                </Badge>
              )
            )}
          </div>
        </div>

        <div className="flex flex-1 justify-between">
          <div className="flex flex-grow items-center gap-2">
            <Input
              key={`${item.id}-${item.quantity}`}
              className="bg-ui-bg-base txt-small w-[67px] rounded-lg [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              type="number"
              disabled={item.detail.fulfilled_quantity === item.quantity}
              min={item.detail.fulfilled_quantity}
              defaultValue={item.quantity}
              onBlur={(e) => {
                const quantity = e.target.value === "" ? null : Number(e.target.value)
                if (quantity) onUpdate({ quantity })
              }}
            />
            <Text className="txt-small text-ui-fg-subtle">{t("fields.qty")}</Text>
          </div>

          <div className="text-ui-fg-subtle txt-small mr-2 flex flex-shrink-0">
            <AmountCell
              currencyCode={currencyCode}
              amount={item.total}
              originalAmount={originalItem?.total}
            />
          </div>

          <ActionMenu
            groups={[
              {
                actions: [
                  {
                    label: t("quotes.manage.updatePrice"),
                    onClick: () => setShowPriceForm((v) => !v),
                    icon: <PencilSquare />,
                  },
                  {
                    label: t("actions.duplicate"),
                    onClick: onDuplicate,
                    icon: <DocumentSeries />,
                  },
                ],
              },
              {
                actions: [
                  !isItemRemoved
                    ? {
                        label: t("actions.remove"),
                        onClick: onRemove,
                        icon: <XCircle />,
                        disabled: item.detail.fulfilled_quantity === item.quantity,
                      }
                    : {
                        label: t("actions.undo"),
                        onClick: onRemoveUndo,
                        icon: <ArrowUturnLeft />,
                      },
                ],
              },
            ]}
          />
        </div>
      </div>

      {showPriceForm && (
        <div className="grid grid-cols-1 gap-2 p-3 md:grid-cols-2">
          <div>
            <Label size="small" weight="plus">{t("fields.price")}</Label>
            <Hint className="!mt-1">{t("quotes.manage.priceOverrideHint")}</Hint>
          </div>
          <div className="flex items-center gap-1">
            <div className="flex-grow">
              <CurrencyInput
                symbol={(currencySymbolMap as Record<string, string>)[currencyCode] ?? currencyCode}
                code={currencyCode}
                defaultValue={item.unit_price}
                type="numeric"
                min={0}
                onChange={(e) => {
                  priceRef.current = parseFloat(e.target.value)
                }}
                onBlur={() => {
                  if (!isNaN(priceRef.current)) {
                    onUpdate({ unit_price: priceRef.current, quantity: item.quantity })
                  }
                }}
                className="bg-ui-bg-field-component hover:bg-ui-bg-field-component-hover"
              />
            </div>
            <IconButton
              type="button"
              className="flex-shrink"
              variant="transparent"
              onClick={() => setShowPriceForm(false)}
            >
              <XMark className="text-ui-fg-muted" />
            </IconButton>
          </div>
        </div>
      )}
    </div>
  )
}
