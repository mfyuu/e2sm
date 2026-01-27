---
"e2sm": minor
---

add pull, set, delete, and init subcommands

- add `pull` command to download secrets and generate .env files
- add `set` command to upload .env files to AWS Secrets Manager
- add `delete` command to schedule secret deletion
- add `init` command to create .e2smrc.jsonc config file
- add overwrite confirmation for `set` command
- support JSONC format in config files (comments and trailing commas)
- reorganize codebase into src/commands/ and src/lib/ directories
