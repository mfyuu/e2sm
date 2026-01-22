---
"e2sm": minor
---

feat: add get subcommand and improve JSON formatting

- add get subcommand to retrieve secrets from AWS Secrets Manager
- implement interactive secret selection with profile/region support
- add kleur dependency for colored terminal output
- enhance formatJson function with dim styling for structural symbols
- refactor exec function to lib.ts for code reuse
- replace util.inspect with custom formatJson in dry-run mode
- add comprehensive tests for new get command and exec function
