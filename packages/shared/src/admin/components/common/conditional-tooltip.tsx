import { Tooltip } from "@medusajs/ui"
import { ComponentPropsWithoutRef, PropsWithChildren, ReactNode } from "react"

type ConditionalTooltipProps = PropsWithChildren<
  ComponentPropsWithoutRef<typeof Tooltip> & {
    showTooltip?: boolean
  }
>

export const ConditionalTooltip = ({
  children,
  showTooltip = false,
  ...props
}: ConditionalTooltipProps): ReactNode => {
  if (showTooltip) {
    return <Tooltip {...props}>{children}</Tooltip>
  }

  return children
}
