# e2sm

## 0.6.0

### Minor Changes

- [#8](https://github.com/mfyuu/e2sm/pull/8) [`d602e5b`](https://github.com/mfyuu/e2sm/commit/d602e5b64e634467f6f4ac710f7e8afe0d56b6d9) Thanks [@mfyuu](https://github.com/mfyuu)! - add pull, set, delete, and init subcommands
  - add `pull` command to download secrets and generate .env files
  - add `set` command to upload .env files to AWS Secrets Manager
  - add `delete` command to schedule secret deletion
  - add `init` command to create .e2smrc.jsonc config file
  - add overwrite confirmation for `set` command
  - support JSONC format in config files (comments and trailing commas)
  - reorganize codebase into src/commands/ and src/lib/ directories

## 0.5.0

### Minor Changes

- [`024e95e`](https://github.com/mfyuu/e2sm/commit/024e95e1684405160aea3428d6c0fde94c47dc34) Thanks [@mfyuu](https://github.com/mfyuu)! - feat: add get subcommand and improve JSON formatting
  - add get subcommand to retrieve secrets from AWS Secrets Manager
  - implement interactive secret selection with profile/region support
  - add kleur dependency for colored terminal output
  - enhance formatJson function with dim styling for structural symbols
  - refactor exec function to lib.ts for code reuse
  - replace util.inspect with custom formatJson in dry-run mode
  - add comprehensive tests for new get command and exec function

## 0.4.2

### Patch Changes

- [`574f30b`](https://github.com/mfyuu/e2sm/commit/574f30b7e3741cfd9af5f899fe61311c4ffb7860) Thanks [@mfyuu](https://github.com/mfyuu)! - fix(config): replace Bun.file() with node:fs/promises for Node.js compatibility
  - replace Bun.file() with readFile from node:fs/promises in loadConfig()
  - ensure configuration loading works in Node.js environment when using bunx
  - improve error handling comment to clarify file not found and parse errors

## 0.4.1

### Patch Changes

- [`058f529`](https://github.com/mfyuu/e2sm/commit/058f529198e841f8be51676cccbd56ad2289e05a) Thanks [@mfyuu](https://github.com/mfyuu)! - fix(ci): add build step to release script
  - ensure dist includes loadConfig before publish
  - fixes missing configuration file feature in v0.4.0

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
