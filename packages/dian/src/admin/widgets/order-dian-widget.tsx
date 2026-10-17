import React from "react"
import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { DetailWidgetProps } from "@medusajs/types"
import { DianOrderWidgetSection } from "../components"

const OrderDianWidget: React.FC<DetailWidgetProps<{ id: string }>> = ({
  data,
}) => {
  if (!data?.id) {
    return null
  }
  return <DianOrderWidgetSection orderId={data.id} />
}

export const config = defineWidgetConfig({
  zone: "order.details.after",
})

export default OrderDianWidget
