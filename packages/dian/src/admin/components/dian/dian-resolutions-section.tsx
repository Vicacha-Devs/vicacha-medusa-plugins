import React from "react"
import { DianResolutionCreateFormSection } from "./dian-resolution-create-form-section"
import {
  DianResolutionsTableSection,
  type DianResolutionsTableSectionProps,
} from "./dian-resolutions-table-section"

export type DianResolutionsSectionProps = DianResolutionsTableSectionProps

export const DianResolutionsSection: React.FC<DianResolutionsSectionProps> = ({
  resolutions,
  loading,
  onRefresh,
}) => {
  return (
    <div className="flex flex-col gap-4">
      <DianResolutionsTableSection
        resolutions={resolutions}
        loading={loading}
        onRefresh={onRefresh}
      />
      <DianResolutionCreateFormSection onSaved={onRefresh} />
    </div>
  )
}
