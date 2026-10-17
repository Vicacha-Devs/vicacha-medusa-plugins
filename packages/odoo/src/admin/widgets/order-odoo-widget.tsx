import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { OrderOdooSummary } from "../components"
import {
  useOrderOdooStatus,
  type OrderOdooData,
} from "../hooks/use-order-odoo-status"

interface OrderWidgetProps {
  data?: OrderOdooData
}

const OrderOdooWidget = ({ data }: OrderWidgetProps) => {
  const { odooOrderId, odooInvoiceId, isSyncing, handleSyncOrder } =
    useOrderOdooStatus(data)

  return (
    <OrderOdooSummary
      odooOrderId={odooOrderId}
      odooInvoiceId={odooInvoiceId}
      isSyncing={isSyncing}
      onSyncOrder={() => void handleSyncOrder()}
    />
  )
}

export const config = defineWidgetConfig({
  zone: "order.details.after",
})

export default OrderOdooWidget
