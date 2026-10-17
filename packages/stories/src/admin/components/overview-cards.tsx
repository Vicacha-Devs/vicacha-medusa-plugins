import type React from "react"
import { Button, clx, Container, Heading, Skeleton, Text } from "@medusajs/ui"

export type StatCardProps = {
  title: string
  value: number | string
  icon: React.ReactNode
  loading?: boolean
  onClick?: () => void
}

export const StatCard = ({
  title,
  value,
  icon,
  loading = false,
  onClick,
}: StatCardProps) => {
  return (
    <Container
      className={clx(
        "p-0",
        onClick
          ? "cursor-pointer hover:bg-ui-bg-subtle-hover transition-colors"
          : ""
      )}
      onClick={onClick}
    >
      <div className="p-5">
        <div className="flex items-center justify-between">
          <Text className="text-ui-fg-subtle">{title}</Text>

          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-ui-bg-subtle">
            {icon}
          </div>
        </div>

        <div className="mt-3">
          {loading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <Heading level="h2">{value}</Heading>
          )}
        </div>
      </div>
    </Container>
  )
}

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
