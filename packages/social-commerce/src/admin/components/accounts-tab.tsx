import {
  Badge,
  Button,
  Container,
  Heading,
  StatusBadge,
  Table,
  Text,
} from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import type { SocialAccountPublicDTO } from "../../modules/social-commerce/types/index.js"
import {
  platformBadgeUiColor,
  statusBadgeUiColor,
} from "../utils/formatters.js"

export interface AccountsTabProps {
  accounts: SocialAccountPublicDTO[]
  onConnectPlatform: (platform: "tiktok" | "instagram" | "facebook") => void
}

export const AccountsTab = ({
  accounts,
  onConnectPlatform,
}: AccountsTabProps) => {
  const { t } = useTranslation()

  return (
    <Container className="divide-y p-0">
      <div className="flex flex-col gap-y-3 px-6 py-4 md:flex-row md:items-center md:justify-between">
        <Heading level="h2">
          {t("tabs.accounts", { count: accounts.length })}
        </Heading>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="small"
            onClick={() => onConnectPlatform("tiktok")}
          >
            {t("accountsTab.connectTiktok")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="small"
            onClick={() => onConnectPlatform("instagram")}
          >
            {t("accountsTab.connectInstagram")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="small"
            onClick={() => onConnectPlatform("facebook")}
          >
            {t("accountsTab.connectFacebook")}
          </Button>
        </div>
      </div>

      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>
              {t("accountsTab.columns.platform")}
            </Table.HeaderCell>
            <Table.HeaderCell>
              {t("accountsTab.columns.username")}
            </Table.HeaderCell>
            <Table.HeaderCell>
              {t("accountsTab.columns.displayName")}
            </Table.HeaderCell>
            <Table.HeaderCell>
              {t("accountsTab.columns.status")}
            </Table.HeaderCell>
            <Table.HeaderCell>
              {t("accountsTab.columns.expiresAt")}
            </Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {accounts.map((acc) => (
            <Table.Row key={acc.id}>
              <Table.Cell>
                <Badge size="2xsmall" color={platformBadgeUiColor(acc.platform)}>
                  {acc.platform}
                </Badge>
              </Table.Cell>
              <Table.Cell>
                <Text size="small" weight="plus">
                  @{acc.platform_username}
                </Text>
              </Table.Cell>
              <Table.Cell>
                <Text size="small">
                  {acc.display_name ?? acc.platform_username}
                </Text>
              </Table.Cell>
              <Table.Cell>
                <StatusBadge color={statusBadgeUiColor(acc.status)}>
                  {acc.status}
                </StatusBadge>
              </Table.Cell>
              <Table.Cell>
                <Text size="small" className="text-ui-fg-subtle">
                  {acc.token_expires_at
                    ? String(acc.token_expires_at)
                    : t("accountsTab.noExpiry")}
                </Text>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </Container>
  )
}

