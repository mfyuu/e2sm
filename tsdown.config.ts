import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  outDir: "dist",
  clean: true,
  platform: "node",
  target: "node18",
  banner: {
    js: "#!/usr/bin/env node",
  },
  loader: {
    ".jsonc": "text",
  },
  inputOptions: {
    resolve: {
      mainFields: ["module", "main"],
    },
  },
});
