import { Thumbnail } from "@medusajs/dashboard/components"
import { AdminOrderPreview } from "@medusajs/framework/types"
import { Badge, Text } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

export interface ManageItemInfoProps {
  item: AdminOrderPreview["items"][0]
  isAddedItem: boolean
  isItemUpdated: boolean
  isItemRemoved: boolean
}

export const ManageItemInfo = ({
  item,
  isAddedItem,
  isItemUpdated,
  isItemRemoved,
}: ManageItemInfoProps) => {
  const { t } = useTranslation()

  return (
    <div className="flex flex-1 items-center justify-between">
      <div className="flex flex-row items-center gap-x-3">
        <Thumbnail src={item.thumbnail} />
        <div className="flex flex-col">
          <div>
            <Text className="txt-small" as="span" weight="plus">
              {item.title}
            </Text>
            {item.variant_sku && (
              <span className="txt-small text-ui-fg-subtle">
                {" "}
                ({item.variant_sku})
              </span>
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
  )
}
