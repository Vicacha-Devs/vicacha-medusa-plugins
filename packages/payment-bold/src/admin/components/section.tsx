import { Container, Heading, Text } from "@medusajs/ui"

export const Section = ({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) => (
  <Container className="divide-y p-0 border border-ui-border-base">
    <div className="px-6 py-4 bg-ui-bg-subtle/30">
      <Heading level="h3" className="text-base font-semibold text-ui-fg-base">{title}</Heading>
      {description && <Text className="text-xs text-ui-fg-subtle mt-1">{description}</Text>}
    </div>
    <div>{children}</div>
  </Container>
)
