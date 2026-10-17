import * as React from "react"
import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Toaster } from "@medusajs/ui"
import { ProductExtDetailCard } from "../components"
import {
  type ProductWidgetEntity,
  useProductExtWidget,
} from "../hooks/use-product-ext-widget"

interface ProductExtWidgetProps {
  data?: ProductWidgetEntity
}

const ProductExtWidget = ({ data }: ProductExtWidgetProps) => {
  const state = useProductExtWidget(data)

  return (
    <>
      <ProductExtDetailCard
        productTitle={data?.title}
        extension={state.extension}
        attributes={state.attributes}
        taglineInput={state.taglineInput}
        onTaglineChange={state.setTaglineInput}
        videosCsvInput={state.videosCsvInput}
        onVideosCsvChange={state.setVideosCsvInput}
        glbUrlInput={state.glbUrlInput}
        onGlbUrlChange={state.setGlbUrlInput}
        isBusy={state.isBusy}
        onSave={() => void state.handleSaveExtension()}
      />
      <Toaster />
    </>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default ProductExtWidget
