import { Badge, Text } from "@medusajs/ui"

export const MethodItem = ({ name, status }: { name: string; status?: string }) => (
  <div className="flex items-center justify-between px-4 py-3 border-b border-ui-border-base last:border-b-0 hover:bg-ui-bg-subtle/50">
    <Text className="text-sm text-ui-fg-base">{name}</Text>
    <Badge color={status === "Enabled" || status === "Available" ? "green" : "grey"} size="small">
      {status || "Active"}
    </Badge>
  </div>
)
