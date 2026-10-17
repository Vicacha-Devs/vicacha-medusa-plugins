import { createRequire, registerHooks } from "node:module"
import { existsSync, readFileSync } from "node:fs"
import { fileURLToPath, pathToFileURL } from "node:url"
import { dirname, resolve as resolvePath } from "node:path"

const currentDir = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
let ts
try {
  ts = require("typescript")
} catch {
  ts = require(
    resolvePath(
      currentDir,
      "../../../strapi-plugin-tiptap-editor/node_modules/typescript"
    )
  )
}
const shimUrl = pathToFileURL(resolvePath(currentDir, "medusa-shim.mjs")).href

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (
      specifier.startsWith("@medusajs/") ||
      specifier === "react" ||
      specifier.startsWith("react/") ||
      specifier === "react-i18next" ||
      specifier === "react-router-dom" ||
      specifier === "react-hook-form" ||
      specifier.startsWith("@hookform/")
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
    if (url.endsWith(".json")) {
      const filePath = fileURLToPath(url)
      const source = readFileSync(filePath, "utf8")
      return {
        format: "module",
        source: `export default ${source}`,
        shortCircuit: true,
      }
    }
    if (url.endsWith(".tsx")) {
      const filePath = fileURLToPath(url)
      const source = readFileSync(filePath, "utf8")
      const transpiled = ts.transpileModule(source, {
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
          jsx: ts.JsxEmit.ReactJSX,
        },
        fileName: filePath,
      })
      return {
        format: "module",
        source: transpiled.outputText,
        shortCircuit: true,
      }
    }
    return nextLoad(url, context)
  },
})
