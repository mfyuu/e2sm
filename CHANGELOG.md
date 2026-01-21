# e2sm

## 0.2.1

### Patch Changes

- [`8279784`](https://github.com/mfyuu/e2sm/commit/82797845814fe7d610fe9bfded0a6a04c54e9e3e) Thanks [@mfyuu](https://github.com/mfyuu)! - add colored output for --dry-run mode using node:util inspect.

## 0.2.0

### Minor Changes

- [`101e933`](https://github.com/mfyuu/e2sm/commit/101e9338bc48e98f57f251dcee12459fd344bd9f) Thanks [@mfyuu](https://github.com/mfyuu)! - Bundle CLI with tsdown for Node.js compatibility
  - Replace Bun-specific APIs with Node.js standard modules
  - Enable installation and execution via `npx e2sm` without requiring Bun runtime
  - Remove `jq` dependency for JSON formatting
