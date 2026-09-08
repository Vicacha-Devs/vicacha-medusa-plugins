import { useParams } from "react-router-dom"
import { Alert, Skeleton } from "@medusajs/ui"
import { RouteFocusModal } from "@vicacha-devs/medusa-shared-admin/admin"

import { useQuote } from "../../../../../hooks/api"
import { ManageQuoteForm } from "./components/manage-quote-form"

const QuoteManage = () => {
  const { id } = useParams()
  const { quote, isPending } = useQuote(id!)

  if (isPending) {
    return (
      <RouteFocusModal>
        <div className="flex h-full flex-col">
          <RouteFocusModal.Header />
          <RouteFocusModal.Body className="flex size-full justify-center overflow-y-auto">
            <div className="mt-16 w-[720px] max-w-[100%] space-y-4 px-4 md:p-0">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-40 w-full" />
            </div>
          </RouteFocusModal.Body>
        </div>
      </RouteFocusModal>
    )
  }

  if (!quote) {
    throw new Error("Quote not found")
  }

  const draftOrder = (quote as any).draft_order

  return (
    <RouteFocusModal>
      {draftOrder ? (
        <ManageQuoteForm order={draftOrder} />
      ) : (
        <div className="flex h-full flex-col">
          <RouteFocusModal.Header />
          <RouteFocusModal.Body className="flex size-full items-center justify-center p-8">
            <Alert variant="warning">
              This quote has no associated draft order. It may have been created outside the normal quote flow.
            </Alert>
          </RouteFocusModal.Body>
        </div>
      )}
    </RouteFocusModal>
  )
}

export default QuoteManage
