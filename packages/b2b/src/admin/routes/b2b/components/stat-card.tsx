import { clx, Container, Heading, Skeleton, Text } from "@medusajs/ui"
import React from "react"

export type StatCardProps = {
  title: string
  value: number
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
        onClick ? "cursor-pointer hover:bg-ui-bg-subtle-hover transition-colors" : ""
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
