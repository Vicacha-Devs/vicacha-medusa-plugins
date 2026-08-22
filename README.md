# Plugins Workspace

pnpm + Turborepo monorepo for Medusa v2 plugins developed by Vicacha Devs.

## Structure

```
plugins/
├── packages/
│   └── b2b/          # @vicacha-devs/medusa-plugin-b2b
├── apps/             # (future) example applications consuming the plugins
├── examples/         # (future) reference implementations
├── pnpm-workspace.yaml
└── turbo.json
```

## Packages

| Package | Description |
| --- | --- |
| [`@vicacha-devs/medusa-plugin-b2b`](./packages/b2b) | B2B commerce capabilities: companies, employees, spending limits, quote negotiation, cart approvals |

## Getting started

```bash
# Install all dependencies
pnpm install

# Build all packages
pnpm build

# Run dev watch across all packages
pnpm dev

# Lint all packages
pnpm lint

# Type-check all packages
pnpm typecheck
```

All tasks are orchestrated by Turborepo. Build respects inter-package dependency order (`^build`).

## Adding a new plugin

1. Create a new directory under `packages/` using `medusa plugin new` from within that directory.
2. Add the package name to the workspace — it is picked up automatically via `packages/*`.
3. Register any cross-package dependencies in `turbo.json` if the new plugin depends on another package in this workspace.

## Node / pnpm requirements

| Tool | Version |
| --- | --- |
| Node | `≥ 20` |
| pnpm | `11.x` |

## Roadmap

- [ ] **Git hooks** — enforce code quality at commit and push time: pre-commit type-checking and linting, commit-message format validation, and pre-push test gating.
- [ ] Implement mussing components for admin look-and-feel as declared [in this request](https://github.com/medusajs/medusa/discussions/16536) in another package, components in `src/admin/components/common` are mostly copies of those components.

> Note: We already copied `useFeatureFlag`  (see the [request](https://github.com/medusajs/medusa/discussions/16500)).

- [ ] Create a new skill for making plugins.
