# Scripts

Medusa exec scripts for data seeding and one-off operations.

```
scripts/
└── seed-b2b-data.ts    creates baseline B2B data in a fresh database
```

---

## `seed-b2b-data.ts`

Seeds the minimum data needed for a working B2B setup:

| Resource | What it creates | Guard |
| --- | --- | --- |
| Customer groups | `B2B` and `B2C` groups | Skips if a group with that name already exists |
| Sales channel | `B2B` sales channel | Skips if one already exists |
| Region | Default region with a shipping option | Skips if any region exists |

Run from the host application's root:

```bash
medusa exec ./node_modules/@vicacha-devs/medusa-plugin-b2b/src/scripts/seed-b2b-data.ts
```

Or, during development, from the plugin's root:

```bash
medusa exec ./src/scripts/seed-b2b-data.ts
```

## Adding a script

1. Create a `.ts` file in this directory.
2. Export a default `async` function that accepts `{ container }` (the Medusa DI container).
3. Run it with `medusa exec ./src/scripts/<name>.ts`.

Scripts must be idempotent — check before creating so that re-running does not produce duplicate data.
