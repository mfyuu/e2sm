---
"e2sm": minor
---

add `.e2smrc.json` configuration file support

- load config from project (`./.e2smrc.json`) or global (`~/.e2smrc.json`)
- CLI flags take precedence over config values
- configurable options: `template`, `application`, `stage`, `profile`, `region`, `input`
- include JSON Schema for editor autocompletion
