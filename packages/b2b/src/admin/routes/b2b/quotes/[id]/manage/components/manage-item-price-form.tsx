import { getCurrencySymbol } from "@medusajs/dashboard/lib"
import { XMark } from "@medusajs/icons"
import { CurrencyInput, Hint, IconButton, Label } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

export interface ManageItemPriceFormProps {
  itemId: string
  unitPrice: number
  currencyCode: string
  onPriceChange: (price: number) => void
  onClose: () => void
}

export const ManageItemPriceForm = ({
  itemId,
  unitPrice,
  currencyCode,
  onPriceChange,
  onClose,
}: ManageItemPriceFormProps) => {
  const { t } = useTranslation()

  return (
    <div className="grid grid-cols-1 gap-2 p-3 md:grid-cols-2">
      <div>
        <Label size="small" weight="plus">
          {t("fields.price")}
        </Label>
        <Hint className="!mt-1">{t("quotes.manage.priceOverrideHint")}</Hint>
      </div>
      <div className="flex items-center gap-1">
        <div className="flex-grow">
          <CurrencyInput
            key={`price-${itemId}-${unitPrice}`}
            symbol={getCurrencySymbol(currencyCode) ?? currencyCode}
            code={currencyCode}
            defaultValue={unitPrice}
            type="numeric"
            min={0}
            onChange={(e) => {
              const price = parseFloat(e.target.value.replace(/,/g, ""))
              if (!isNaN(price) && price > 0) {
                onPriceChange(price)
              }
            }}
            className="bg-ui-bg-field-component hover:bg-ui-bg-field-component-hover"
          />
        </div>
        <IconButton
          type="button"
          className="flex-shrink"
          variant="transparent"
          onClick={onClose}
        >
          <XMark className="text-ui-fg-muted" />
        </IconButton>
      </div>
    </div>
  )
}
