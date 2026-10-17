import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

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

  it("uses LayoutComposer and defineRouteConfig in all Admin route pages", () => {
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
})
