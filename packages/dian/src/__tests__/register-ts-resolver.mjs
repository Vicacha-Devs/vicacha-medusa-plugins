import { registerHooks } from "node:module"
import { existsSync, readFileSync, statSync } from "node:fs"
import { fileURLToPath, pathToFileURL } from "node:url"
import { dirname, resolve as resolvePath } from "node:path"

const currentDir = dirname(fileURLToPath(import.meta.url))
const shimUrl = pathToFileURL(resolvePath(currentDir, "medusa-shim.mjs")).href

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (
      (specifier.startsWith("./") || specifier.startsWith("../")) &&
      context.parentURL
    ) {
      const parentDir = dirname(fileURLToPath(context.parentURL))
      const baseCandidate = resolvePath(parentDir, specifier)

      const candidates = [
        baseCandidate,
        `${baseCandidate}.ts`,
        `${baseCandidate}.tsx`,
        `${baseCandidate}.json`,
        resolvePath(baseCandidate, "index.ts"),
        resolvePath(baseCandidate, "index.tsx"),
      ]

      for (const candidate of candidates) {
        if (existsSync(candidate) && statSync(candidate).isFile()) {
          return nextResolve(pathToFileURL(candidate).href, context)
        }
      }
    }

    try {
      return nextResolve(specifier, context)
    } catch (err) {
      if (
        specifier.startsWith("@medusajs/") ||
        specifier === "react-i18next"
      ) {
        return { url: shimUrl, shortCircuit: true }
      }
      throw err
    }
  },
  load(url, context, nextLoad) {
    if (url.endsWith(".json")) {
      const filePath = fileURLToPath(url)
      const raw = readFileSync(filePath, "utf8")
      return {
        format: "module",
        shortCircuit: true,
        source: `export default ${raw};`,
      }
    }
    return nextLoad(url, context)
  },
})

