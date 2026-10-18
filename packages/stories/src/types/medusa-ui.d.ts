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

declare module "@mikro-orm/migrations" {
  export abstract class Migration {
    addSql(sql: string): void
    abstract up(): Promise<void>
    down(): Promise<void>
  }
}

declare module "@medusajs/framework/mikro-orm/migrations" {
  export { Migration } from "@mikro-orm/migrations"
}

declare module "@medusajs/framework/utils" {
  export class MedusaError extends Error {
    static Types: {
      DB_ERROR: string
      DUPLICATE_ERROR: string
      INVALID_ARGUMENT: string
      INVALID_DATA: string
      UNAUTHORIZED: string
      NOT_FOUND: string
      NOT_ALLOWED: string
      UNEXPECTED_STATE: string
      CONFLICT: string
    }
    type: string
    code?: string
    constructor(type: string, message: string, code?: string)
  }

  interface ChainableProperty {
    primaryKey(): ChainableProperty
    searchable(): ChainableProperty
    nullable(): ChainableProperty
    default(val: unknown): ChainableProperty
  }

  export const model: {
    define(
      name: string,
      schema: Record<string, unknown>
    ): {
      indexes(idx: Array<{ on: string[]; unique?: boolean }>): unknown
    }
    id(opts?: { prefix?: string }): ChainableProperty
    text(): ChainableProperty
    number(): ChainableProperty
    boolean(): ChainableProperty
    json(): ChainableProperty
    dateTime(): ChainableProperty
    enum(values: string[]): ChainableProperty
  }

  export function MedusaService<TModels extends Record<string, unknown>>(
    models: TModels
  ): {
    new (...args: any[]): {
      [K in keyof TModels as `list${ string & K }s`]: (
        filter?: Record<string, any>,
        config?: Record<string, any>
      ) => Promise<any[]>
    } & {
      [K in keyof TModels as `create${ string & K }s`]: (
        data: any
      ) => Promise<any>
    } & {
      [K in keyof TModels as `update${ string & K }s`]: (
        data: any
      ) => Promise<any>
    } & {
      [K in keyof TModels as `delete${ string & K }s`]: (
        id: string | string[]
      ) => Promise<void>
    } & {
      listStories(
        filter?: Record<string, any>,
        config?: Record<string, any>
      ): Promise<any[]>
      createStories(data: any): Promise<any>
      updateStories(data: any): Promise<any>
      deleteStories(id: string | string[]): Promise<void>
    }
  }

  export function Module(
    name: string,
    config: { service: unknown; loaders?: unknown[] }
  ): unknown
}

declare module "@medusajs/framework/http" {
  export interface MedusaRequest<TBody = unknown> {
    params: Record<string, string>
    query: Record<string, unknown>
    body: TBody
    validatedBody?: TBody
    validatedQuery?: Record<string, unknown>
    scope: {
      resolve<T = any>(key: string): T
    }
  }

  export interface MedusaResponse {
    status(code: number): MedusaResponse
    sendStatus(code: number): MedusaResponse
    json(payload: unknown): void
  }

  export function defineMiddlewares(config: {
    routes: Array<{
      matcher: string
      method?: string | string[]
      middlewares?: unknown[]
    }>
  }): {
    routes: Array<{
      matcher: string
      method?: string | string[]
      middlewares?: unknown[]
    }>
  }

  export function validateAndTransformBody(schema: unknown): unknown
}

declare module "@medusajs/framework/workflows-sdk" {
  export class StepResponse<TOutput = any, TComp = any> {
    constructor(output: TOutput, compensateInput?: TComp)
  }

  export class WorkflowResponse<TOutput = any> {
    constructor(output: TOutput)
  }

  export function createStep<TInput = any, TOutput = any, TComp = any>(
    name: string,
    invokeFn: (
      input: TInput,
      context: { container: { resolve<T = any>(key: string): T } }
    ) => Promise<StepResponse<TOutput, TComp>>,
    compensateFn?: (
      compInput: TComp | undefined,
      context: { container: { resolve<T = any>(key: string): T } }
    ) => Promise<void>
  ): (input: TInput) => TOutput

  export function createWorkflow<TInput = any, TOutput = any>(
    name: string,
    composer: (input: TInput) => WorkflowResponse<TOutput>
  ): (scope?: unknown) => {
    run(opts?: { input?: TInput }): Promise<{ result: TOutput }>
  }
}

declare module "@medusajs/framework/zod" {
  export interface ZodType<T = any> {
    _output: T
    min(n: number): ZodType<T>
    max(n: number): ZodType<T>
    int(): ZodType<T>
    optional(): ZodType<T | undefined>
    nullable(): ZodType<T | null>
    default(val: T): ZodType<T>
    partial(): ZodType<Partial<T>>
    omit<K extends keyof T>(mask: Record<K, true>): ZodType<Omit<T, K>>
    parse(val: unknown): T
    safeParse(
      val: unknown
    ): { success: true; data: T } | { success: false; error: unknown }
  }

  export namespace z {
    export type infer<T extends ZodType<any>> = T["_output"]
    export function string(): ZodType<string>
    export function number(): ZodType<number>
    export function boolean(): ZodType<boolean>
    export function unknown(): ZodType<unknown>
    function _enum<const T extends readonly [string, ...string[]]>(
      values: T
    ): ZodType<T[number]>
    export { _enum as enum }
    export function array<T extends ZodType<any>>(
      schema: T
    ): ZodType<Array<T["_output"]>>
    export function record<K extends ZodType<string>, V extends ZodType<any>>(
      key: K,
      value: V
    ): ZodType<Record<string, V["_output"]>>
    export function object<T extends Record<string, ZodType<any>>>(
      shape: T
    ): ZodType<{ [K in keyof T]: T[K]["_output"] }>
    export const coerce: {
      number(): ZodType<number>
    }
  }
}

declare module "@medusajs/framework/types" {
  export interface MedusaContainer {
    resolve<T = any>(key: string): T
  }
}

declare module "@medusajs/framework" {
  import type { MedusaContainer } from "@medusajs/framework/types"

  export interface SubscriberArgs<T = unknown> {
    event: { data: T; name?: string }
    container: MedusaContainer
  }

  export interface SubscriberConfig {
    event: string | string[]
    context?: Record<string, unknown>
  }
}

declare module "react" {
  export type ReactNode = any
  export type CSSProperties = Record<string, string | number | undefined>
  export type MouseEvent<T = Element> = {
    currentTarget: T
    clientX: number
    clientY: number
    stopPropagation(): void
    preventDefault(): void
  }
  export type KeyboardEvent<T = Element> = {
    key: string
    stopPropagation(): void
    preventDefault(): void
  }
  export type HTMLAttributes<T = Element> = Record<string, any> & {
    children?: ReactNode
    className?: string
    style?: CSSProperties
  }
  export type ButtonHTMLAttributes<T = Element> = HTMLAttributes<T> & {
    type?: "button" | "submit" | "reset"
    disabled?: boolean
  }
  export type InputHTMLAttributes<T = Element> = HTMLAttributes<T> & {
    value?: string | number
    placeholder?: string
    type?: string
    disabled?: boolean
  }
  export type LabelHTMLAttributes<T = Element> = HTMLAttributes<T> & {
    htmlFor?: string
  }
  export type TableHTMLAttributes<T = Element> = HTMLAttributes<T>
  export type ThHTMLAttributes<T = Element> = HTMLAttributes<T>
  export type TdHTMLAttributes<T = Element> = HTMLAttributes<T>
  export type SVGProps<T = SVGSVGElement> = Record<string, any>
  export type FC<P = {}> = (props: P & { key?: any }) => any

  export function useState<T>(
    initial: T | (() => T)
  ): [T, (next: T | ((prev: T) => T)) => void]
  export function useEffect(
    effect: () => void | (() => void),
    deps?: readonly unknown[]
  ): void
  export function useCallback<T extends (...args: any[]) => any>(
    fn: T,
    deps: readonly unknown[]
  ): T
  export function useMemo<T>(fn: () => T, deps: readonly unknown[]): T
  export function useRef<T>(initial: T): { current: T }

  export namespace JSX {
    interface IntrinsicAttributes {
      key?: any
    }
    interface IntrinsicElements {
      [elemName: string]: any
    }
  }
}

declare module "react/jsx-runtime" {
  export namespace JSX {
    interface IntrinsicAttributes {
      key?: any
    }
    interface IntrinsicElements {
      [elemName: string]: any
    }
  }
  export function jsx(type: any, props: any, key?: any): any
  export function jsxs(type: any, props: any, key?: any): any
  export const Fragment: any
}

declare module "node:test" {
  export function describe(name: string, fn: () => void | Promise<void>): void
  export function it(name: string, fn: () => void | Promise<void>): void
}

declare module "node:assert/strict" {
  const assert: {
    ok(value: unknown, message?: string): void
    equal(actual: unknown, expected: unknown, message?: string): void
    deepEqual(actual: unknown, expected: unknown, message?: string): void
    throws(fn: () => unknown, error?: unknown): void
    rejects(fn: () => Promise<unknown>, error?: unknown): Promise<void>
  }
  export default assert
}
