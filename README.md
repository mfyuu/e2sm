# e2sm

.env to AWS Secrets Manager

## Usage

```bash
npx e2sm set      # Upload .env to Secrets Manager
npx e2sm get      # Display secret value
npx e2sm pull     # Download secret to .env file
npx e2sm delete   # Delete secret from Secrets Manager
npx e2sm --help   # Show help
```

## Commands

### set - Upload .env to Secrets Manager

```bash
npx e2sm set
npx e2sm set -i .env.local -n my-app/prod
npx e2sm set --dry-run                    # Preview JSON without uploading
npx e2sm set --force                      # Skip overwrite confirmation
npx e2sm set -t -a my-app -s prod         # Template mode: creates "my-app/prod"
```

| Flag            | Short | Description                             |
| --------------- | ----- | --------------------------------------- |
| `--input`       | `-i`  | Path to .env file                       |
| `--name`        | `-n`  | Secret name                             |
| `--dry-run`     | `-d`  | Preview JSON output                     |
| `--force`       | `-f`  | Skip overwrite confirmation             |
| `--template`    | `-t`  | Use template mode ($application/$stage) |
| `--application` | `-a`  | Application name (implies --template)   |
| `--stage`       | `-s`  | Stage name (implies --template)         |
| `--profile`     | `-p`  | AWS profile                             |
| `--region`      | `-r`  | AWS region                              |

### get - Display secret value

```bash
npx e2sm get
npx e2sm get -n my-app/prod
npx e2sm get -p my-profile -r ap-northeast-1
```

| Flag        | Short | Description                              |
| ----------- | ----- | ---------------------------------------- |
| `--name`    | `-n`  | Secret name (skip interactive selection) |
| `--profile` | `-p`  | AWS profile                              |
| `--region`  | `-r`  | AWS region                               |

### pull - Download secret to .env file

```bash
npx e2sm pull
npx e2sm pull -n my-app/prod -o .env.local
npx e2sm pull --force                     # Overwrite existing file
```

| Flag        | Short | Description                                  |
| ----------- | ----- | -------------------------------------------- |
| `--name`    | `-n`  | Secret name (skip interactive selection)     |
| `--output`  | `-o`  | Output file path (default: .env)             |
| `--force`   | `-f`  | Overwrite existing file without confirmation |
| `--profile` | `-p`  | AWS profile                                  |
| `--region`  | `-r`  | AWS region                                   |

### delete - Delete secret from Secrets Manager

```bash
npx e2sm delete
npx e2sm delete -n my-app/prod -d 7
npx e2sm delete -n my-app/prod -d 7 --force
```

| Flag              | Short | Description                              |
| ----------------- | ----- | ---------------------------------------- |
| `--name`          | `-n`  | Secret name (skip interactive selection) |
| `--recovery-days` | `-d`  | Recovery window in days (7-30)           |
| `--force`         | `-f`  | Skip confirmation prompt                 |
| `--profile`       | `-p`  | AWS profile                              |
| `--region`        | `-r`  | AWS region                               |

## Configuration

Create a `.e2smrc.json` file to set default options.

```json
{
  "$schema": "https://unpkg.com/e2sm/schema.json",
  "template": true,
  "application": "my-app",
  "stage": "dev",
  "profile": "my-profile",
  "region": "ap-northeast-1",
  "input": ".env.local",
  "output": ".env"
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
npx e2sm set

# Overrides config with "prod-profile"
npx e2sm set -p prod-profile
```
