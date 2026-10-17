import * as React from "react"
import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Toaster } from "@medusajs/ui"
import { CategoryAttributesCard } from "../components"
import {
  type CategoryWidgetEntity,
  useCategoryAttributesWidget,
} from "../hooks/use-product-ext-widget"

interface CategoryAttributesWidgetProps {
  data?: CategoryWidgetEntity
}

const CategoryAttributesWidget = ({ data }: CategoryAttributesWidgetProps) => {
  const { attributes, isLoading, refresh } = useCategoryAttributesWidget(data)

  return (
    <>
      <CategoryAttributesCard
        categoryName={data?.name}
        attributes={attributes}
        isLoading={isLoading}
        onRefresh={refresh}
      />
      <Toaster />
    </>
  )
}

export const config = defineWidgetConfig({
  zone: "product_category.details.after",
})

export default CategoryAttributesWidget
