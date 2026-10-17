const chainableField = () => {
  const field = {
    primaryKey: () => field,
    searchable: () => field,
    nullable: () => field,
    default: () => field,
  }
  return field
}

export const model = {
  define(name, schema) {
    return {
      name,
      schema,
      indexes() {
        return this
      },
    }
  },
  id: chainableField,
  text: chainableField,
  number: chainableField,
  boolean: chainableField,
  json: chainableField,
  dateTime: chainableField,
  enum: chainableField,
}

export function MedusaService(models = {}) {
  return class BaseMedusaService {
    constructor() {
      this.__stores = {}
      let counter = 1
      for (const key of Object.keys(models)) {
        const plural = key.endsWith("y")
          ? `${key.slice(0, -1)}ies`
          : `${key}s`
        this.__stores[plural] = []

        if (typeof this[`list${plural}`] !== "function") {
          this[`list${plural}`] = async (filter = {}) => {
            const rows = this.__stores[plural]
            return rows.filter((row) =>
              Object.entries(filter).every(([k, v]) =>
                v === undefined ? true : row[k] === v
              )
            )
          }
        }
        if (typeof this[`create${plural}`] !== "function") {
          this[`create${plural}`] = async (data) => {
            const record = {
              id: data.id ?? `${key.toLowerCase()}_${counter++}`,
              created_at: new Date(),
              updated_at: new Date(),
              ...data,
            }
            this.__stores[plural].push(record)
            return record
          }
        }
        if (typeof this[`update${plural}`] !== "function") {
          this[`update${plural}`] = async (data) => {
            const rows = this.__stores[plural]
            const idx = rows.findIndex((r) => r.id === data.id)
            if (idx >= 0) {
              rows[idx] = { ...rows[idx], ...data, updated_at: new Date() }
              return rows[idx]
            }
            return data
          }
        }
        if (typeof this[`delete${plural}`] !== "function") {
          this[`delete${plural}`] = async (id) => {
            this.__stores[plural] = this.__stores[plural].filter(
              (r) => r.id !== id
            )
          }
        }
      }
    }
  }
}

export class MedusaError extends Error {
  static Types = {
    DB_ERROR: "database_error",
    DUPLICATE_ERROR: "duplicate_error",
    INVALID_ARGUMENT: "invalid_argument",
    INVALID_DATA: "invalid_data",
    UNAUTHORIZED: "unauthorized",
    NOT_FOUND: "not_found",
    NOT_ALLOWED: "not_allowed",
    UNEXPECTED_STATE: "unexpected_state",
    CONFLICT: "conflict",
  }

  constructor(type, message, code) {
    super(message)
    this.type = type
    this.code = code
    this.name = "MedusaError"
  }
}

export function Module(name, config) {
  return { name, ...config }
}

export class StepResponse {
  constructor(output, compensateInput) {
    this.output = output
    this.compensateInput = compensateInput
  }
}

export class WorkflowResponse {
  constructor(output) {
    this.output = output
  }
}

export function createStep(name, invokeFn, compensateFn) {
  const stepFn = (input) => ({
    __stepName: name,
    input,
    invokeFn,
    compensateFn,
  })
  stepFn.__stepName = name
  stepFn.invoke = invokeFn
  stepFn.compensate = compensateFn
  return stepFn
}

export function createWorkflow(name, composerFn) {
  const wf = (container) => ({
    async run({ input } = {}) {
      const composed = composerFn(input)
      const stepDescriptor =
        composed instanceof WorkflowResponse ? composed.output : composed
      if (stepDescriptor && typeof stepDescriptor.invokeFn === "function") {
        const stepRes = await stepDescriptor.invokeFn(stepDescriptor.input, {
          container,
        })
        const result =
          stepRes instanceof StepResponse ? stepRes.output : stepRes
        return {
          result,
          compensate: async () => {
            if (typeof stepDescriptor.compensateFn === "function") {
              await stepDescriptor.compensateFn(stepRes?.compensateInput, {
                container,
              })
            }
          },
        }
      }
      return { result: stepDescriptor }
    },
  })
  wf.getName = () => name
  return wf
}

const createZodChain = (shape = {}) => {
  const schema = {
    shape,
    min: () => schema,
    max: () => schema,
    int: () => schema,
    positive: () => schema,
    nonnegative: () => schema,
    email: () => schema,
    url: () => schema,
    optional: () => schema,
    nullable: () => schema,
    default: () => schema,
    partial: () => createZodChain(shape),
    omit: () => createZodChain(shape),
    passthrough: () => schema,
    parse: (val) => val,
    safeParse: (val) => ({ success: true, data: val }),
  }
  return schema
}

export const z = {
  object: (shape) => createZodChain(shape),
  string: () => createZodChain(),
  number: () => createZodChain(),
  boolean: () => createZodChain(),
  enum: (values) => createZodChain({ values }),
  array: (item) => createZodChain({ item }),
  record: (key, val) => createZodChain({ key, val }),
  unknown: () => createZodChain(),
  union: (items) => createZodChain({ items }),
}

export function defineMiddlewares(config) {
  return config
}

export function validateAndTransformBody(schema) {
  return schema
}

export function defineRouteConfig(config) {
  return config
}

export function defineWidgetConfig(config) {
  return config
}

export const CORE_LAYOUT_IDS = {
  SINGLE_COLUMN: "single_column",
  TWO_COLUMN: "two_column",
}

export const LayoutComposer = Object.assign(
  (props) => props,
  { Entry: (props) => props }
)

export const SectionRow = (props) => props
export const RouteDrawer = Object.assign(
  (props) => props,
  {
    Header: (props) => props,
    Body: (props) => props,
    Footer: (props) => props,
    Close: (props) => props,
    Form: (props) => props,
  }
)
export const RouteFocusModal = Object.assign(
  (props) => props,
  {
    Header: (props) => props,
    Body: (props) => props,
    Footer: (props) => props,
    Close: (props) => props,
    Form: (props) => props,
  }
)
export const Form = {
  Field: (props) => props,
  Item: (props) => props,
  Label: (props) => props,
  Control: (props) => props,
  ErrorMessage: (props) => props,
}
export const KeyboundForm = (props) => props
export const useRouteModal = () => ({ handleSuccess: () => {} })
export const zodResolver = () => () => ({ values: {}, errors: {} })
export const useForm = () => ({
  control: {},
  watch: () => "instagram",
  handleSubmit: (fn) => fn,
})
export const useNavigate = () => () => {}

export const ArrowPath = "ArrowPath"
export const BuildingStorefront = "BuildingStorefront"
export const CheckCircle = "CheckCircle"
export const DocumentText = "DocumentText"
export const Tag = "Tag"
export const Users = "Users"

export const Badge = "Badge"
export const Button = "Button"
export const clx = (...args) => args.filter(Boolean).join(" ")
export const Container = "Container"
export const Heading = "Heading"
export const Input = "Input"
export const Label = "Label"
export const Select = Object.assign("Select", {
  Trigger: "Select.Trigger",
  Value: "Select.Value",
  Content: "Select.Content",
  Item: "Select.Item",
})
export const Skeleton = "Skeleton"
export const StatusBadge = "StatusBadge"
export const Switch = "Switch"
export const Table = Object.assign("Table", {
  Header: "Table.Header",
  Row: "Table.Row",
  HeaderCell: "Table.HeaderCell",
  Body: "Table.Body",
  Cell: "Table.Cell",
})
export const Text = "Text"
export const Toaster = "Toaster"
export const toast = {
  success: () => {},
  error: () => {},
}

export const useState = (init) => [
  typeof init === "function" ? init() : init,
  () => {},
]
export const useEffect = () => {}
export const useCallback = (fn) => fn
export const useMemo = (fn) => fn()
export const useRef = (init) => ({ current: init })
export const createElement = (type, props, ...children) => ({
  type,
  props: { ...props, children },
})
export const jsx = createElement
export const jsxs = createElement
export const Fragment = "Fragment"

export const useTranslation = () => ({
  t: (key) => key,
  i18n: {
    language: "en",
    resolvedLanguage: "en",
    changeLanguage: async () => {},
    dir: () => "ltr",
  },
  ready: true,
})

export default {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  createElement,
  Fragment,
  useTranslation,
}
