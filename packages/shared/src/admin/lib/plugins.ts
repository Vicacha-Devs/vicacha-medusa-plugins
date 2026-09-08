import { AdminPlugin } from "@medusajs/framework/types"

export const LOYALTY_PLUGIN_NAME = "@medusajs/loyalty-plugin"

export const getLoyaltyPlugin = (plugins: AdminPlugin[]) => {
  return plugins?.find((plugin) => plugin.name === LOYALTY_PLUGIN_NAME)
}
