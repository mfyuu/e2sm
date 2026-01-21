---
"e2sm": minor
---

add --template (-t), --application (-a), and --stage (-s) flags for generating secret names

- enable template mode to generate secret name as `$application/$stage` format
- implicit template mode: using -a or -s alone activates template mode without -t
- add flag conflict validation: --name cannot be used with template mode flags
- interactive prompts for missing application/stage values with sensible defaults
