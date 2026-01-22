# e2sm

.env to AWS Secrets Manager

## Usage

```bash
npx e2sm
npx e2sm --dry-run
npx e2sm --help
```

### Get Secrets

Retrieve secrets from AWS Secrets Manager.

```bash
npx e2sm get
npx e2sm get -n my-secret-name
npx e2sm get -p my-profile -r ap-northeast-1
```

## Configuration

You can create a `.e2smrc.json` file to set default options.

```json
{
  "$schema": "https://unpkg.com/e2sm/schema.json",
  "template": true,
  "application": "my-app",
  "stage": "dev",
  "profile": "my-profile",
  "region": "ap-northeast-1",
  "input": ".env.local"
}
```

### Config file locations

1. `./.e2smrc.json` (project) - takes precedence
2. `~/.e2smrc.json` (global)

Only the first found config is used (no merging).

### Priority

CLI flags always take precedence over config file values.

```bash
# Uses profile from config
npx e2sm

# Overrides config with "prod-profile"
npx e2sm -p prod-profile
```
