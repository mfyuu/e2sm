---
"e2sm": patch
---

fix(build): prioritize ESM module resolution for jsonc-parser

- add inputOptions with resolve.mainFields to tsdown config
- set mainFields to ["module", "main"] to prioritize ESM entry
- fixes "Cannot find module './impl/format'" error when running built CLI
- resolves dynamic require issues from jsonc-parser UMD bundle
