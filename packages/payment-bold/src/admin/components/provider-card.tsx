import { StatusBadge, Text } from "@medusajs/ui"

export const ProviderCard = ({ title, providerId, isEnabled }: { title: string; providerId: string; isEnabled: boolean }) => (
  <div className="p-3 border border-ui-border-base bg-ui-bg-base rounded-md space-y-2">
    <div className="flex items-center justify-between">
      <Text className="text-xs font-semibold text-ui-fg-base">{title}</Text>
      <StatusBadge color={isEnabled ? "green" : "grey"} />
    </div>
    <Text className="text-[10px] font-mono text-ui-fg-subtle truncate">{providerId}</Text>
  </div>
)
