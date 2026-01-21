# e2sm

## 0.2.0

### Minor Changes

- [`101e933`](https://github.com/mfyuu/e2sm/commit/101e9338bc48e98f57f251dcee12459fd344bd9f) Thanks [@mfyuu](https://github.com/mfyuu)! - Bundle CLI with tsdown for Node.js compatibility
  - Replace Bun-specific APIs with Node.js standard modules
  - Enable installation and execution via `npx e2sm` without requiring Bun runtime
  - Remove `jq` dependency for JSON formatting
