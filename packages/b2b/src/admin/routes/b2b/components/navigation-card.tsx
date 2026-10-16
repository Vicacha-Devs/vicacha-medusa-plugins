import { Button, clx, Heading, Text } from "@medusajs/ui"
import React from "react"

export type NavigationCardPosition =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"

export type NavigationCardProps = {
  icon: React.ReactNode
  title: string
  description: string
  onClick: () => void
  position: NavigationCardPosition
}

export const NavigationCard = ({
  icon,
  title,
  description,
  onClick,
  position,
}: NavigationCardProps) => {
  const isBottom = position === "bottom-left" || position === "bottom-right"
  const isLeft = position === "top-left" || position === "bottom-left"

  return (
    <Button
      type="button"
      className={clx(
        "text-left p-6 hover:bg-ui-bg-subtle-hover transition-colors",
        !isBottom ? "border-b border-ui-border-base" : "",
        isLeft ? "md:border-r md:border-ui-border-base" : ""
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-x-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-md bg-ui-bg-subtle shrink-0">
          {icon}
        </div>

        <div>
          <Heading level="h3">{title}</Heading>

          <Text className="text-ui-fg-subtle mt-1">{description}</Text>
        </div>
      </div>
    </Button>
  )
}
