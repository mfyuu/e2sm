# e2sm

## 0.4.0

### Minor Changes

- [`9af035a`](https://github.com/mfyuu/e2sm/commit/9af035ae265e8d2c87465a10f82b5a30fc4b5fc5) Thanks [@mfyuu](https://github.com/mfyuu)! - add `.e2smrc.json` configuration file support
  - load config from project (`./.e2smrc.json`) or global (`~/.e2smrc.json`)
  - CLI flags take precedence over config values
  - configurable options: `template`, `application`, `stage`, `profile`, `region`, `input`
  - include JSON Schema for editor autocompletion

## 0.3.0

### Minor Changes

- [`10d2e1c`](https://github.com/mfyuu/e2sm/commit/10d2e1cf33a3e183805292336b521ea4ee0617fd) Thanks [@mfyuu](https://github.com/mfyuu)! - add --template (-t), --application (-a), and --stage (-s) flags for generating secret names
  - enable template mode to generate secret name as `$application/$stage` format
  - implicit template mode: using -a or -s alone activates template mode without -t
  - add flag conflict validation: --name cannot be used with template mode flags
  - interactive prompts for missing application/stage values with sensible defaults

## 0.2.1

### Patch Changes

- [`8279784`](https://github.com/mfyuu/e2sm/commit/82797845814fe7d610fe9bfded0a6a04c54e9e3e) Thanks [@mfyuu](https://github.com/mfyuu)! - add colored output for --dry-run mode using node:util inspect.

## 0.2.0

### Minor Changes

- [`101e933`](https://github.com/mfyuu/e2sm/commit/101e9338bc48e98f57f251dcee12459fd344bd9f) Thanks [@mfyuu](https://github.com/mfyuu)! - Bundle CLI with tsdown for Node.js compatibility
  - Replace Bun-specific APIs with Node.js standard modules
  - Enable installation and execution via `npx e2sm` without requiring Bun runtime
  - Remove `jq` dependency for JSON formatting
