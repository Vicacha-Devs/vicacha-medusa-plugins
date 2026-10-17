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

const createZodChain = (constraints = {}) => {
  const validators = [...(constraints.validators ?? [])]
  const schema = {
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
    positive: () =>
      createZodChain({
        ...constraints,
        validators: [
          ...validators,
          (v) => {
            if (typeof v === "number" && v <= 0) {
              throw new Error("Expected positive number")
            }
          },
        ],
      }),
    nonnegative: () =>
      createZodChain({
        ...constraints,
        validators: [
          ...validators,
          (v) => {
            if (typeof v === "number" && v < 0) {
              throw new Error("Expected nonnegative number")
            }
          },
        ],
      }),
    email: () => schema,
    datetime: () => schema,
    trim: () => schema,
    length: () => schema,
    url: () =>
      createZodChain({
        ...constraints,
        validators: [
          ...validators,
          (v) => {
            if (typeof v === "string") {
              new URL(v)
            }
          },
        ],
      }),
    optional: () => createZodChain({ ...constraints, optional: true }),
    nullable: () => createZodChain({ ...constraints, nullable: true }),
    default: (defVal) =>
      createZodChain({ ...constraints, optional: true, defaultValue: defVal }),
    partial: () => createZodChain({ ...constraints, partial: true }),
    omit: () => createZodChain(constraints),
    passthrough: () => schema,
    parse: (val) => {
      const res = schema.safeParse(val)
      if (!res.success) {
        throw new Error(
          res.error.issues.map((i) => i.message).join("; ")
        )
      }
      return res.data
    },
    safeParse: (val) => {
      try {
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
          if (typeof v !== "number" || Number.isNaN(v))
            throw new Error("Expected number")
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
  array: (item) =>
    createZodChain({
      item,
      validators: [
        (v) => {
          if (!Array.isArray(v)) throw new Error("Expected array")
        },
      ],
    }),
  record: () => createZodChain(),
  unknown: () => createZodChain(),
  union: () => createZodChain(),
  coerce: {
    number: () =>
      createZodChain({
        validators: [
          (v) => {
            if (Number.isNaN(Number(v))) throw new Error("Expected number")
          },
        ],
      }),
  },
}

export function defineMiddlewares(config) {
  return config
}

export function validateAndTransformBody(schema) {
  return async function validateBodyMiddleware(req, _res, next) {
    if (schema && typeof schema.parse === "function") {
      req.validatedBody = schema.parse(req.body ?? {})
    }
    if (typeof next === "function") {
      next()
    }
  }
}

export function validateAndTransformQuery(schema, queryConfig) {
  return async function validateQueryMiddleware(req, _res, next) {
    if (schema && typeof schema.parse === "function") {
      req.validatedQuery = schema.parse(req.query ?? {})
    }
    req.queryConfig = queryConfig
    if (typeof next === "function") {
      next()
    }
  }
}

export function defineRouteConfig(config) {
  return config
}

export function defineWidgetConfig(config) {
  return config
}

export const useState = (init) => [
  typeof init === "function" ? init() : init,
  () => {},
]
export const useEffect = () => {}
export const useCallback = (fn) => fn
export const useRef = (init) => ({ current: init })
export const createElement = (type, props, ...children) => ({
  type,
  props: { ...props, children },
})
export const jsx = createElement
export const jsxs = createElement
export const Fragment = "Fragment"

const passthroughComponent = (props) => createElement("div", props)

export const Container = passthroughComponent
export const Heading = passthroughComponent
export const Text = passthroughComponent
export const Badge = passthroughComponent
export const StatusBadge = passthroughComponent
export const Button = passthroughComponent
export const Input = passthroughComponent
export const Label = passthroughComponent
export const Switch = passthroughComponent
export const Skeleton = passthroughComponent
export const Toaster = passthroughComponent
export const clx = (...args) => args.filter(Boolean).join(" ")
export const toast = Object.assign(() => {}, {
  success: () => {},
  error: () => {},
  info: () => {},
  warning: () => {},
})
export const Table = Object.assign(passthroughComponent, {
  Header: passthroughComponent,
  Body: passthroughComponent,
  Row: passthroughComponent,
  HeaderCell: passthroughComponent,
  Cell: passthroughComponent,
})
export const Tabs = Object.assign(passthroughComponent, {
  List: passthroughComponent,
  Trigger: passthroughComponent,
  Content: passthroughComponent,
})
export const Select = Object.assign(passthroughComponent, {
  Trigger: passthroughComponent,
  Value: passthroughComponent,
  Content: passthroughComponent,
  Item: passthroughComponent,
})

export const CORE_LAYOUT_IDS = {
  SINGLE_COLUMN: "single_column",
  TWO_COLUMN: "two_column",
}

export const LayoutComposer = Object.assign(passthroughComponent, {
  Entry: passthroughComponent,
})
export const SectionRow = passthroughComponent
export const ActionMenu = passthroughComponent
export const KeyboundForm = passthroughComponent
export const Form = Object.assign(passthroughComponent, {
  Field: passthroughComponent,
  Item: passthroughComponent,
  Label: passthroughComponent,
  Control: passthroughComponent,
  ErrorMessage: passthroughComponent,
  Hint: passthroughComponent,
})
export const RouteDrawer = Object.assign(passthroughComponent, {
  Header: passthroughComponent,
  Body: passthroughComponent,
  Footer: passthroughComponent,
  Close: passthroughComponent,
  Form: passthroughComponent,
})
export const RouteFocusModal = Object.assign(passthroughComponent, {
  Header: passthroughComponent,
  Body: passthroughComponent,
  Footer: passthroughComponent,
  Close: passthroughComponent,
  Form: passthroughComponent,
})
export const useRouteModal = () => ({
  handleSuccess: () => {},
})

export const Channels = passthroughComponent
export const Users = passthroughComponent
export const Photo = passthroughComponent
export const Sparkles = passthroughComponent
export const PlaySolid = passthroughComponent
export const Tag = passthroughComponent
export const BuildingStorefront = passthroughComponent

export const useNavigate = () => () => {}
export const useParams = () => ({})
export const Link = passthroughComponent

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
  useRef,
  createElement,
  Fragment,
  Select,
  useTranslation,
}

export const zodResolver = () => () => ({ values: {}, errors: {} })
export const useForm = (opts = {}) => ({
  control: {},
  register: (name) => ({ name }),
  handleSubmit: (fn) => (e) => fn(opts.defaultValues ?? {}, e),
  reset: () => {},
  setValue: () => {},
  watch: () => opts.defaultValues ?? {},
  formState: { errors: {}, isDirty: false, isSubmitting: false },
})

