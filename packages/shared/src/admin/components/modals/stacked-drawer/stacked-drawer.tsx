import { Drawer, clx } from "@medusajs/ui"
import {
  type ComponentType,
  ComponentPropsWithoutRef,
  PropsWithChildren,
  forwardRef,
  useEffect,
} from "react"
import { useStackedModal } from "../stacked-modal-provider"

type StackedDrawerProps = PropsWithChildren<{
  /**
   * A unique identifier for the modal. This is used to differentiate stacked modals,
   * when multiple stacked modals are registered to the same parent modal.
   */
  id: string
}>

/**
 * A stacked modal that can be rendered above a parent modal.
 */
export const Root = ({ id, children }: StackedDrawerProps): JSX.Element => {
  const { register, unregister, getIsOpen, setIsOpen } = useStackedModal()

  useEffect(() => {
    register(id)

    return () => unregister(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Drawer open={getIsOpen(id)} onOpenChange={(open) => setIsOpen(id, open)}>
      {children}
    </Drawer>
  )
}

const Close = Drawer.Close
Close.displayName = "StackedDrawer.Close"

const Header = Drawer.Header
Header.displayName = "StackedDrawer.Header"

const Body = Drawer.Body
Body.displayName = "StackedDrawer.Body"

const Trigger = Drawer.Trigger
Trigger.displayName = "StackedDrawer.Trigger"

const Footer = Drawer.Footer
Footer.displayName = "StackedDrawer.Footer"

const Title = Drawer.Title
Title.displayName = "StackedDrawer.Title"

const Description = Drawer.Description
Description.displayName = "StackedDrawer.Description"

const Content = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof Drawer.Content>
>(({ className, ...props }, ref) => {
  return (
    <Drawer.Content
      ref={ref}
      className={clx(className)}
      overlayProps={{
        className: "bg-transparent",
      }}
      {...props}
    />
  )
})
Content.displayName = "StackedDrawer.Content"

type StackedDrawerType = ((props: StackedDrawerProps) => JSX.Element) & {
  Close: ComponentType<any>
  Header: ComponentType<any>
  Body: ComponentType<any>
  Content: ComponentType<any>
  Trigger: ComponentType<any>
  Footer: ComponentType<any>
  Description: ComponentType<any>
  Title: ComponentType<any>
}

export const StackedDrawer: StackedDrawerType = Object.assign(Root, {
  Close,
  Header,
  Body,
  Content,
  Trigger,
  Footer,
  Description,
  Title,
}) as unknown as StackedDrawerType
