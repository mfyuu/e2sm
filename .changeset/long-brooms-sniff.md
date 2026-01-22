---
"e2sm": patch
---

fix(config): replace Bun.file() with node:fs/promises for Node.js compatibility

- replace Bun.file() with readFile from node:fs/promises in loadConfig()
- ensure configuration loading works in Node.js environment when using bunx
- improve error handling comment to clarify file not found and parse errors
