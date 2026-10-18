import { registerHooks } from "node:module"
import { existsSync, readFileSync } from "node:fs"
import { fileURLToPath, pathToFileURL } from "node:url"
import { dirname, resolve as resolvePath } from "node:path"

const currentDir = dirname(fileURLToPath(import.meta.url))
const shimUrl = pathToFileURL(resolvePath(currentDir, "medusa-shim.mjs")).href

let tsModule = null
try {
  const mod = await import("typescript")
  tsModule = mod.default || mod
} catch {
  const fallbackTsPath = resolvePath(
    currentDir,
    "../../../strapi-plugin-tiptap-editor/node_modules/typescript/lib/typescript.js"
  )
  if (existsSync(fallbackTsPath)) {
    const mod = await import(pathToFileURL(fallbackTsPath).href)
    tsModule = mod.default || mod
  }
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (
      specifier.startsWith("@medusajs/") ||
      specifier === "react" ||
      specifier.startsWith("react/") ||
      specifier === "react-i18next" ||
      specifier === "react-router-dom" ||
      specifier === "react-hook-form" ||
      specifier.startsWith("@hookform/") ||
      specifier === "zod"
    ) {
      return { url: shimUrl, shortCircuit: true }
    }

    if (
      (specifier.startsWith("./") || specifier.startsWith("../")) &&
      context.parentURL
    ) {
      const parentDir = dirname(fileURLToPath(context.parentURL))
      const baseCandidate = resolvePath(parentDir, specifier)

      const candidates = [
        `${baseCandidate}.ts`,
        `${baseCandidate}.tsx`,
        resolvePath(baseCandidate, "index.ts"),
        resolvePath(baseCandidate, "index.tsx"),
      ]

      for (const candidate of candidates) {
        if (existsSync(candidate)) {
          return nextResolve(pathToFileURL(candidate).href, context)
        }
      }
    }

    return nextResolve(specifier, context)
  },

  load(url, context, nextLoad) {
    if (url.endsWith(".json") && !url.includes("/node_modules/")) {
      const filePath = fileURLToPath(url)
      const source = readFileSync(filePath, "utf8")
      return {
        format: "module",
        source: `export default ${source}`,
        shortCircuit: true,
      }
    }
    if ((url.endsWith(".tsx") || url.endsWith(".ts")) && tsModule) {
      const filePath = fileURLToPath(url)
      const source = readFileSync(filePath, "utf8")
      const transpiled = tsModule.transpileModule(source, {
        compilerOptions: {
          module: tsModule.ModuleKind.ESNext,
          target: tsModule.ScriptTarget.ES2022,
          jsx: tsModule.JsxEmit.ReactJSX,
        },
        fileName: filePath,
      })
      return {
        format: "module",
        source: transpiled.outputText,
        shortCircuit: true,
      }
    }
    if (url.endsWith(".tsx")) {
      const filePath = fileURLToPath(url)
      const source = readFileSync(filePath, "utf8")
      const lines = []
      const reExports = [
        ...source.matchAll(/^export\s+\*\s+from\s+["'][^"']+["']/gm),
      ]
      for (const reExp of reExports) {
        lines.push(reExp[0])
      }
      const configMatch = source.match(
        /export\s+const\s+config\s*=\s*(defineRouteConfig|defineWidgetConfig)\s*\(\{[\s\S]*?\}\)/
      )
      if (configMatch) {
        lines.push(
          `import { defineRouteConfig, defineWidgetConfig } from "@medusajs/admin-sdk"`
        )
        lines.push(
          `import { Buildings, BuildingStorefront, CheckCircle, DocumentText, MagnifyingGlass, Tag } from "@medusajs/icons"`
        )
        lines.push(configMatch[0])
      }
      if (/export\s+const\s+handle\s*=/.test(source)) {
        lines.push(`export const handle = { breadcrumb: () => null }`)
      }
      const namedExports = [
        ...source.matchAll(
          /export\s+(?:const|function)\s+([A-Za-z0-9_]+)\b/g
        ),
      ]
      for (const match of namedExports) {
        const name = match[1]
        if (name !== "config" && name !== "handle") {
          lines.push(`export const ${name} = () => null`)
        }
      }
      if (/export\s+default\b/.test(source)) {
        lines.push(`export default function Component() { return null }`)
      }
      return {
        format: "module",
        source: lines.join("\n"),
        shortCircuit: true,
      }
    }
    return nextLoad(url, context)
  },
})
