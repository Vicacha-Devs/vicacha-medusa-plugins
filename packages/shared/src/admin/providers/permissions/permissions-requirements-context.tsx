import { createContext } from "react"
import { PermissionsRequirementsContextValue } from "./types"

export const PermissionsRequirementsContext =
  createContext<PermissionsRequirementsContextValue | null>(null)
