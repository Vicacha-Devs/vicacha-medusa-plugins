declare module "@medusajs/ui" {
  import type * as React from "react"

  export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
    children?: React.ReactNode
  }
  export const Container: React.FC<ContainerProps>

  export interface HeadingProps
    extends React.HTMLAttributes<HTMLHeadingElement> {
    level?: "h1" | "h2" | "h3"
    children?: React.ReactNode
  }
  export const Heading: React.FC<HeadingProps>

  export interface TextProps
    extends React.HTMLAttributes<HTMLParagraphElement> {
    size?: "xsmall" | "small" | "base" | "large" | "xlarge"
    weight?: "regular" | "plus"
    leading?: "normal" | "compact"
    children?: React.ReactNode
  }
  export const Text: React.FC<TextProps>

  export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    color?: "green" | "red" | "blue" | "orange" | "grey" | "purple"
    size?: "2xsmall" | "xsmall" | "small" | "base" | "large"
    rounded?: "base" | "full"
    children?: React.ReactNode
  }
  export const Badge: React.FC<BadgeProps>

  export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "transparent" | "danger"
    size?: "small" | "base" | "large" | "xlarge"
    isLoading?: boolean
    children?: React.ReactNode
  }
  export const Button: React.FC<ButtonProps>

  export interface InputProps
    extends React.InputHTMLAttributes<HTMLInputElement> {
    size?: "base" | "small"
  }
  export const Input: React.FC<InputProps>

  export interface LabelProps
    extends React.LabelHTMLAttributes<HTMLLabelElement> {
    size?: "xsmall" | "small" | "base" | "large"
    weight?: "regular" | "plus"
    children?: React.ReactNode
  }
  export const Label: React.FC<LabelProps>

  export interface SwitchProps {
    id?: string
    checked?: boolean
    defaultChecked?: boolean
    disabled?: boolean
    onCheckedChange?: (checked: boolean) => void
    className?: string
  }
  export const Switch: React.FC<SwitchProps>

  export interface TabsRootProps extends React.HTMLAttributes<HTMLDivElement> {
    defaultValue?: string
    value?: string
    onValueChange?: (value: string) => void
    children?: React.ReactNode
  }
  export interface TabsTriggerProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    value: string
    children?: React.ReactNode
  }
  export interface TabsContentProps
    extends React.HTMLAttributes<HTMLDivElement> {
    value: string
    children?: React.ReactNode
  }
  export const Tabs: React.FC<TabsRootProps> & {
    List: React.FC<React.HTMLAttributes<HTMLDivElement>>
    Trigger: React.FC<TabsTriggerProps>
    Content: React.FC<TabsContentProps>
  }

  export const Table: React.FC<React.TableHTMLAttributes<HTMLTableElement>> & {
    Header: React.FC<React.HTMLAttributes<HTMLTableSectionElement>>
    Body: React.FC<React.HTMLAttributes<HTMLTableSectionElement>>
    Row: React.FC<React.HTMLAttributes<HTMLTableRowElement>>
    HeaderCell: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>>
    Cell: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>>
  }

  export interface SelectRootProps {
    size?: "base" | "small"
    value?: string
    defaultValue?: string
    onValueChange?: (value: string) => void
    children?: React.ReactNode
  }
  export interface SelectItemProps
    extends React.HTMLAttributes<HTMLDivElement> {
    value: string
    children?: React.ReactNode
  }
  export const Select: React.FC<SelectRootProps> & {
    Trigger: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>>
    Value: React.FC<{ placeholder?: string }>
    Content: React.FC<React.HTMLAttributes<HTMLDivElement>>
    Item: React.FC<SelectItemProps>
  }
}

declare module "@medusajs/icons" {
  import type * as React from "react"
  export type IconProps = React.SVGProps<SVGSVGElement> & {
    color?: string
  }
  export const ArrowPath: React.FC<IconProps>
  export const PlaySolid: React.FC<IconProps>
  export const PlusMini: React.FC<IconProps>
  export const Trash: React.FC<IconProps>
}

declare module "react-i18next" {
  export interface I18nInstance {
    language: string
    resolvedLanguage?: string
    changeLanguage: (lng: string) => Promise<void>
    dir: (lng?: string) => "ltr" | "rtl"
  }

  export type TFunction = (
    key: string,
    options?: Record<string, string | number | boolean | undefined> | string
  ) => string

  export function useTranslation(ns?: string | string[]): {
    t: TFunction
    i18n: I18nInstance
    ready: boolean
  }
}
