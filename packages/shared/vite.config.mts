import { defineConfig } from "vite"
import { resolve } from "path"

export default defineConfig({
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "react",
  },
  build: {
    lib: {
      entry: {
        admin: resolve(__dirname, "src/admin/index.ts"),
      },
      formats: ["es"],
      fileName: (_format, entryName) => `${entryName}.mjs`,
    },
    rollupOptions: {
      external: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        /^@medusajs\/.*/,
        /^@tanstack\/.*/,
        /^@radix-ui\/.*/,
        "react-router-dom",
        "react-i18next",
        "react-hook-form",
        "@hookform/resolvers",
        "@hookform/resolvers/zod",
        "zod",
        "date-fns",
        "lodash",
        "cmdk",
        "@uiw/react-json-view",
        /^@dnd-kit\/.*/,
      ],
    },
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
  },
})
