import { Tabs } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import type { ActiveTab } from "../utils/formatters.js"

export interface DashboardTabsProps {
  activeTab: ActiveTab
  onSelectTab: (tab: ActiveTab) => void
  counts: {
    accounts: number
    feed: number
    stories: number
    live: number
    catalog: number
  }
}

export const DashboardTabs = ({
  activeTab,
  onSelectTab,
  counts,
}: DashboardTabsProps) => {
  const { t } = useTranslation()

  const tabs: ReadonlyArray<readonly [ActiveTab, string]> = [
    ["accounts", t("tabs.accounts", { count: counts.accounts })],
    ["feed", t("tabs.feed", { count: counts.feed })],
    ["stories", t("tabs.stories", { count: counts.stories })],
    ["live", t("tabs.live", { count: counts.live })],
    ["catalog", t("tabs.catalog", { count: counts.catalog })],
  ]

  return (
    <Tabs
      value={activeTab}
      onValueChange={(val) => onSelectTab(val as ActiveTab)}
    >
      <Tabs.List className="border-b border-ui-border-base pb-2">
        {tabs.map(([tabKey, label]) => (
          <Tabs.Trigger key={tabKey} value={tabKey}>
            {label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
    </Tabs>
  )
}

