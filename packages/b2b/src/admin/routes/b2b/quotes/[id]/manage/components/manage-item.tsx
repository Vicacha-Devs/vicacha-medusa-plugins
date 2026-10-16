import { ActionMenu } from "@medusajs/dashboard/components";
import { AdminOrder, AdminOrderPreview } from "@medusajs/framework/types";
import {
  ArrowUturnLeft,
  DocumentSeries,
  PencilSquare,
  XCircle,
} from "@medusajs/icons";
import { Input, Text, toast } from "@medusajs/ui";
import { AmountCell } from "@vicacha-devs/medusa-shared-admin/admin";
import debounce from "lodash/debounce";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  useAddItemsToQuote,
  useRemoveQuoteItem,
  useUpdateQuoteItem,
} from "../../../../../../hooks/api";
import { ManageItemInfo } from "./manage-item-info";
import { ManageItemPriceForm } from "./manage-item-price-form";

type ManageItemProps = {
  originalItem: AdminOrder["items"][0]
  item: AdminOrderPreview["items"][0]
  currencyCode: string
  orderId: string
  onItemChange: (changes: { quantity?: number; unit_price?: number }) => void
}

export const ManageItem = ({
  originalItem,
  item,
  currencyCode,
  orderId,
  onItemChange,
}: ManageItemProps) => {
  const { t } = useTranslation()
  const [showPriceForm, setShowPriceForm] = useState(false)
  const [localQty, setLocalQty] = useState(item.quantity)
  const [localPrice, setLocalPrice] = useState(item.unit_price)
  const prevServerValuesRef = useRef({
    quantity: item.quantity,
    unit_price: item.unit_price,
  })

  const { mutateAsync: addItems } = useAddItemsToQuote(orderId)
  const { mutateAsync: updateOriginalItem } = useUpdateQuoteItem(orderId)
  const { mutateAsync: undoAction } = useRemoveQuoteItem(orderId)

  const debouncedPriceNotify = useCallback(
    debounce((price: number) => onItemChange({ unit_price: price }), 400),
    []
  )

  useEffect(() => {
    return () => debouncedPriceNotify.cancel()
  }, [debouncedPriceNotify])

  useEffect(() => {
    const prev = prevServerValuesRef.current
    if (
      prev.quantity !== item.quantity ||
      prev.unit_price !== item.unit_price
    ) {
      prevServerValuesRef.current = {
        quantity: item.quantity,
        unit_price: item.unit_price,
      }
      setLocalQty(item.quantity)
      setLocalPrice(item.unit_price)
      onItemChange({ quantity: item.quantity, unit_price: item.unit_price })
    }
  }, [item.quantity, item.unit_price])

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
  const isItemRemoved =
    !!updateItemAction && item.quantity === item.detail.fulfilled_quantity

  const localItemTotal = localQty * localPrice

  const onRemove = async () => {
    try {
      if (addItemAction) {
        await undoAction(addItemAction.id)
      } else {
        await updateOriginalItem({
          quantity: item.detail.fulfilled_quantity,
          itemId: item.id,
        })
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
      await addItems({
        items: [{ variant_id: item.variant_id, quantity: item.quantity }],
      })
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const handleQtyChange = (qty: number) => {
    if (qty <= item.detail.fulfilled_quantity) {
      toast.error(t("orders.edits.validation.quantityLowerThanFulfillment"))
      return
    }
    setLocalQty(qty)
    onItemChange({ quantity: qty })
  }

  const handlePriceChange = (price: number) => {
    setLocalPrice(price)
    debouncedPriceNotify(price)
  }

  return (
    <div className="bg-ui-bg-subtle shadow-elevation-card-rest my-2 rounded-xl">
      <div className="flex flex-col items-center gap-x-2 gap-y-2 p-3 text-sm md:flex-row">
        <ManageItemInfo
          item={item}
          isAddedItem={isAddedItem}
          isItemUpdated={isItemUpdated}
          isItemRemoved={isItemRemoved}
        />

        <div className="flex flex-1 justify-between">
          <div className="flex flex-grow items-center gap-2">
            <Input
              className="bg-ui-bg-base txt-small w-[67px] rounded-lg [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              type="number"
              disabled={item.detail.fulfilled_quantity === item.quantity}
              min={item.detail.fulfilled_quantity}
              value={localQty}
              onChange={(e) => {
                const qty =
                  e.target.value === "" ? localQty : Number(e.target.value)
                handleQtyChange(qty)
              }}
            />
            <Text className="txt-small text-ui-fg-subtle">
              {t("fields.qty")}
            </Text>
          </div>

          <div className="text-ui-fg-subtle txt-small mr-2 flex flex-shrink-0">
            <AmountCell
              currencyCode={currencyCode}
              amount={localItemTotal}
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
                        disabled:
                          item.detail.fulfilled_quantity === item.quantity,
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
        <ManageItemPriceForm
          itemId={item.id}
          unitPrice={item.unit_price}
          currencyCode={currencyCode}
          onPriceChange={handlePriceChange}
          onClose={() => setShowPriceForm(false)}
        />
      )}
    </div>
  )
}
