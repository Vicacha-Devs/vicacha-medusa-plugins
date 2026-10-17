import React from "react"
import { DianFiscalProfileFormSection } from "./dian-fiscal-profile-form-section"
import { DianFiscalProfilesTableSection } from "./dian-fiscal-profiles-table-section"

export interface DianFiscalProfilesSectionProps {
  profiles: Array<Record<string, any>>
  onRefresh: () => void
}

export const DianFiscalProfilesSection: React.FC<
  DianFiscalProfilesSectionProps
> = ({ profiles, onRefresh }) => {
  return (
    <div className="flex flex-col gap-4">
      <DianFiscalProfilesTableSection profiles={profiles} />
      <DianFiscalProfileFormSection onSaved={onRefresh} />
    </div>
  )
}
