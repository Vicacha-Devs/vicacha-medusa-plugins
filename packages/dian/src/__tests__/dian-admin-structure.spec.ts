import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import adminI18n, { SUPPORTED_UI_LOCALES } from "../admin/i18n"

function collectFiles(dir: string): string[] {
  const results: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      results.push(...collectFiles(full))
    } else if (full.endsWith(".ts") || full.endsWith(".tsx")) {
      results.push(full)
    }
  }
  return results
}

function flattenKeys(obj: Record<string, any>, prefix = ""): string[] {
  const keys: string[] = []
  for (const [k, v] of Object.entries(obj)) {
    const next = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === "object" && !Array.isArray(v)) {
      keys.push(...flattenKeys(v, next))
    } else {
      keys.push(next)
    }
  }
  return keys.sort()
}

describe("medusa-plugin-dian Admin UI Architecture & Decoupling", () => {
  const adminDir = join(process.cwd(), "src", "admin")
  const adminFiles = collectFiles(adminDir)

  it("keeps every Admin component and route file decoupled under 220 lines", () => {
    for (const file of adminFiles) {
      const content = readFileSync(file, "utf8")
      const lineCount = content.split("\n").length
      assert.ok(
        lineCount <= 220,
        `Expected ${file} to have <= 220 lines, found ${lineCount}`
      )
      assert.ok(
        !content.includes("@medusajs/framework/utils"),
        `Admin file ${file} must not import @medusajs/framework/utils`
      )
    }
  })

  it("uses LayoutComposer, defineRouteConfig, translationNs, and useTranslation in all Admin route pages", () => {
    const routePages = adminFiles.filter((f) => f.endsWith("page.tsx"))
    assert.equal(routePages.length, 4)

    for (const page of routePages) {
      const content = readFileSync(page, "utf8")
      assert.ok(
        content.includes("LayoutComposer"),
        `Route ${page} must use LayoutComposer`
      )
      assert.ok(
        content.includes("defineRouteConfig"),
        `Route ${page} must export defineRouteConfig`
      )
      assert.ok(
        content.includes('translationNs: "dian"'),
        `Route ${page} must specify translationNs: "dian"`
      )
      assert.ok(
        content.includes("useTranslation"),
        `Route ${page} must use useTranslation`
      )
    }
  })

  it("keeps components/index.ts and components/dian/index.ts as pure barrel files", () => {
    const barrels = [
      join(adminDir, "components", "index.ts"),
      join(adminDir, "components", "dian", "index.ts"),
    ]
    for (const barrel of barrels) {
      const lines = readFileSync(barrel, "utf8")
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
      for (const line of lines) {
        assert.ok(
          line.startsWith("export "),
          `Barrel file ${barrel} must only contain export statements`
        )
      }
    }
  })

  it("ships all 10 UI locales (ar, de, en, es, fr, it, nl, pl, pt, tr) with 100% key parity", () => {
    const expectedCodes = ["en", "es", "fr", "de", "it", "pt", "nl", "pl", "tr", "ar"]
    assert.deepEqual(
      SUPPORTED_UI_LOCALES.map((l) => l.code),
      expectedCodes
    )

    const enBundle = adminI18n.en.translation as Record<string, any>
    const baselineKeys = flattenKeys(enBundle)
    assert.ok(
      baselineKeys.length >= 120,
      `Expected at least 120 translation keys in en.json, found ${baselineKeys.length}`
    )

    for (const code of expectedCodes) {
      const entry = (adminI18n as Record<string, any>)[code]
      assert.ok(entry, `Missing locale entry for ${code}`)
      assert.ok(entry.translation, `Missing translation namespace for ${code}`)
      assert.ok(entry.dian, `Missing dian namespace for ${code}`)

      const localeKeys = flattenKeys(entry.translation)
      assert.deepEqual(
        localeKeys,
        baselineKeys,
        `Key mismatch between en.json and ${code}.json`
      )
    }
  })

  it("uses useTranslation across all Admin DIAN UI section components", () => {
    const sectionFiles = adminFiles.filter(
      (f) =>
        f.includes(join("components", "dian", "dian-")) &&
        !f.endsWith("dian-fiscal-profiles-section.tsx") &&
        !f.endsWith("dian-resolutions-section.tsx")
    )
    assert.equal(sectionFiles.length, 10)

    for (const file of sectionFiles) {
      const content = readFileSync(file, "utf8")
      assert.ok(
        content.includes("useTranslation"),
        `Component ${file} must use useTranslation()`
      )
    }
  })
})

