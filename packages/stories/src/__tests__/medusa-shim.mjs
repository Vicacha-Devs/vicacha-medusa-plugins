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

export class Migration {
  constructor() {
    this.queries = []
  }

  addSql(sql) {
    this.queries.push(sql)
  }
}

const createZodChain = (constraints = {}) => {
  const validators = [...(constraints.validators ?? [])]
  const transforms = [...(constraints.transforms ?? [])]
  const schema = {
    shape: constraints.shape ?? {},
    min: (n) =>
      createZodChain({
        ...constraints,
        validators: [
          ...validators,
          (v) => {
            if (typeof v === "string" && v.length < n) {
              throw new Error(`Min length ${n}`)
            }
            if (typeof v === "number" && v < n) {
              throw new Error(`Min value ${n}`)
            }
          },
        ],
      }),
    max: (n) =>
      createZodChain({
        ...constraints,
        validators: [
          ...validators,
          (v) => {
            if (typeof v === "string" && v.length > n) {
              throw new Error(`Max length ${n}`)
            }
            if (typeof v === "number" && v > n) {
              throw new Error(`Max value ${n}`)
            }
            if (Array.isArray(v) && v.length > n) {
              throw new Error(`Max items ${n}`)
            }
          },
        ],
      }),
    int: () =>
      createZodChain({
        ...constraints,
        validators: [
          ...validators,
          (v) => {
            if (typeof v === "number" && !Number.isInteger(v)) {
              throw new Error("Expected integer")
            }
          },
        ],
      }),
    positive: () => schema,
    nonnegative: () => schema,
    email: () => schema,
    url: () => schema,
    optional: () => createZodChain({ ...constraints, optional: true }),
    nullable: () => createZodChain({ ...constraints, nullable: true }),
    default: (defVal) =>
      createZodChain({ ...constraints, optional: true, defaultValue: defVal }),
    partial: () => createZodChain({ ...constraints, partial: true }),
    omit: (keys = {}) => {
      const nextShape = { ...(constraints.shape ?? {}) }
      for (const k of Object.keys(keys)) {
        if (keys[k]) delete nextShape[k]
      }
      return createZodChain({ ...constraints, shape: nextShape })
    },
    passthrough: () => schema,
    parse: (val) => {
      const res = schema.safeParse(val)
      if (!res.success) {
        throw new Error(res.error.issues.map((i) => i.message).join("; "))
      }
      return res.data
    },
    safeParse: (rawVal) => {
      try {
        let val = rawVal
        if (val === undefined) {
          if (constraints.defaultValue !== undefined) {
            return { success: true, data: constraints.defaultValue }
          }
          if (constraints.optional) {
            return { success: true, data: undefined }
          }
          throw new Error("Required")
        }
        if (val === null && constraints.nullable) {
          return { success: true, data: null }
        }
        for (const tf of transforms) {
          val = tf(val)
        }
        for (const fn of validators) {
          fn(val)
        }
        if (constraints.shape && typeof val === "object" && val !== null) {
          const out = { ...val }
          for (const [k, fieldSchema] of Object.entries(constraints.shape)) {
            if (constraints.partial && out[k] === undefined) continue
            const r = fieldSchema.safeParse(out[k])
            if (!r.success) {
              return {
                success: false,
                error: {
                  issues: r.error.issues.map((iss) => ({
                    path: [k, ...(iss.path ?? [])],
                    message: iss.message,
                  })),
                },
              }
            }
            if (r.data !== undefined) {
              out[k] = r.data
            }
          }
          return { success: true, data: out }
        }
        if (constraints.item && Array.isArray(val)) {
          const arr = []
          for (let i = 0; i < val.length; i++) {
            const r = constraints.item.safeParse(val[i])
            if (!r.success) {
              return {
                success: false,
                error: {
                  issues: r.error.issues.map((iss) => ({
                    path: [i, ...(iss.path ?? [])],
                    message: iss.message,
                  })),
                },
              }
            }
            arr.push(r.data)
          }
          return { success: true, data: arr }
        }
        return { success: true, data: val }
      } catch (err) {
        return {
          success: false,
          error: {
            issues: [
              {
                path: [],
                message: err instanceof Error ? err.message : String(err),
              },
            ],
          },
        }
      }
    },
  }
  return schema
}

export const z = {
  object: (shape) => createZodChain({ shape }),
  string: () =>
    createZodChain({
      validators: [
        (v) => {
          if (typeof v !== "string") throw new Error("Expected string")
        },
      ],
    }),
  number: () =>
    createZodChain({
      validators: [
        (v) => {
          if (typeof v !== "number" || Number.isNaN(v)) {
            throw new Error("Expected number")
          }
        },
      ],
    }),
  boolean: () => createZodChain(),
  enum: (values) =>
    createZodChain({
      validators: [
        (v) => {
          if (!values.includes(v)) throw new Error("Invalid enum value")
        },
      ],
    }),
  array: (item) => createZodChain({ item }),
  record: (key, val) => createZodChain({ key, val }),
  unknown: () => createZodChain(),
  union: (items) => createZodChain({ items }),
  coerce: {
    number: () =>
      createZodChain({
        transforms: [
          (v) => {
            if (typeof v === "string" && v.trim() === "") {
              return Number.NaN
            }
            return Number(v)
          },
        ],
        validators: [
          (v) => {
            if (typeof v !== "number" || Number.isNaN(v)) {
              throw new Error("Expected number")
            }
          },
        ],
      }),
  },
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
