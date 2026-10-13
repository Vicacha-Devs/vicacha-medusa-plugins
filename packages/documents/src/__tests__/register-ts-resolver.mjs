import { registerHooks } from "node:module"
import { existsSync } from "node:fs"
import { fileURLToPath, pathToFileURL } from "node:url"
import { dirname, resolve as resolvePath } from "node:path"

registerHooks({
  resolve(specifier, context, nextResolve) {
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
})
