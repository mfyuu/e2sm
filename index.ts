import { cli, define } from "gunshi";
import type { ArgSchema, ArgToken } from "gunshi";
import * as p from "@clack/prompts";

function toKebabCase(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}

function validateUnknownFlags(
  tokens: ArgToken[],
  args: Record<string, ArgSchema>
): void {
  // Build set of known option names
  const knownOptions = new Set<string>();

  // Built-in options
  knownOptions.add("help");
  knownOptions.add("h");
  knownOptions.add("version");
  knownOptions.add("v");

  // User-defined options
  for (const [key, schema] of Object.entries(args)) {
    knownOptions.add(key);
    knownOptions.add(toKebabCase(key));

    if (schema.short) {
      knownOptions.add(schema.short);
    }
  }

  // Check for unknown options
  for (const token of tokens) {
    if (token.kind === "option" && token.name) {
      // Handle --no- prefix for negatable options
      const name = token.name.startsWith("no-")
        ? token.name.slice(3)
        : token.name;

      if (!knownOptions.has(name)) {
        console.error(`Unknown option: --${token.name}`);
        process.exit(1);
      }
    }
  }
}

function parseEnvContent(content: string): Record<string, string> {
  const result: Record<string, string> = {};

  for (const line of content.split("\n")) {
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (trimmed === "" || trimmed.startsWith("#")) {
      continue;
    }

    const equalIndex = trimmed.indexOf("=");
    if (equalIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, equalIndex).trim();
    let value = trimmed.slice(equalIndex + 1).trim();

    // Check if value is quoted
    const isQuoted =
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"));

    // Remove surrounding quotes if present
    if (isQuoted) {
      value = value.slice(1, -1);
    } else {
      // Remove inline comment for unquoted values
      const commentIndex = value.indexOf("#");
      if (commentIndex !== -1) {
        value = value.slice(0, commentIndex).trim();
      }
    }

    if (key) {
      result[key] = value;
    }
  }

  return result;
}

function isCancel(value: unknown): value is symbol {
  return p.isCancel(value);
}

const command = define({
  name: "e2sm",
  description: "Upload .env file to AWS Secrets Manager",
  args: {
    dryRun: {
      type: "boolean",
      short: "d",
      toKebab: true,
      description: "Preview JSON output without uploading",
    },
    profile: {
      type: "string",
      short: "p",
      description: "AWS profile to use",
    },
    input: {
      type: "string",
      short: "i",
      description: "Path to the .env file (skip interactive prompt)",
    },
    name: {
      type: "string",
      short: "n",
      description: "Secret name for AWS Secrets Manager (skip interactive prompt)",
    },
  },
  run: async (ctx) => {
    // Validate unknown flags first
    validateUnknownFlags(ctx.tokens, ctx.args);

    const isDryRun = ctx.values.dryRun;
    const profile = ctx.values.profile;
    const inputFlag = ctx.values.input;
    const nameFlag = ctx.values.name;

    p.intro("e2sm - env to AWS Secrets Manager");

    // 1. Get env file path (from flag or interactively)
    let envFilePath: string;

    if (inputFlag) {
      envFilePath = inputFlag;
    } else {
      const result = await p.text({
        message: "Enter the path to your .env file:",
        placeholder: ".env",
        validate: (value) => {
          if (!value) {
            return "File path is required";
          }
          return undefined;
        },
      });

      if (isCancel(result)) {
        p.cancel("Operation cancelled");
        process.exit(0);
      }

      envFilePath = result;
    }

    // 2. Read and parse env file
    const file = Bun.file(envFilePath);
    const exists = await file.exists();

    if (!exists) {
      p.cancel(`File not found: ${envFilePath}`);
      process.exit(1);
    }

    const content = await file.text();
    const envData = parseEnvContent(content);

    if (Object.keys(envData).length === 0) {
      p.cancel("No valid environment variables found in the file");
      process.exit(1);
    }

    const jsonString = JSON.stringify(envData);

    // 3. Dry-run mode: preview with jq
    if (isDryRun) {
      p.log.info("Dry-run mode: Previewing JSON output");
      const jqResult = await Bun.$`echo ${jsonString} | jq -C .`.text();
      console.log(jqResult);
      p.outro("Dry-run complete");
      return;
    }

    // 4. Get secret name (from flag or interactively)
    let secretName: string;

    if (nameFlag) {
      secretName = nameFlag;
    } else {
      const result = await p.text({
        message: "Enter the secret name for AWS Secrets Manager:",
        placeholder: "my-app/production",
        validate: (value) => {
          if (!value) {
            return "Secret name is required";
          }
          return undefined;
        },
      });

      if (isCancel(result)) {
        p.cancel("Operation cancelled");
        process.exit(0);
      }

      secretName = result;
    }

    // 5. Upload to AWS Secrets Manager
    const spinner = p.spinner();
    spinner.start("Uploading to AWS Secrets Manager...");

    const profileArgs = profile ? ["--profile", profile] : [];

    // First, try to check if the secret already exists
    const describeResult =
      await Bun.$`aws secretsmanager describe-secret --secret-id ${secretName} ${profileArgs} 2>/dev/null`.nothrow();

    if (describeResult.exitCode === 0) {
      // Secret exists, update it
      const updateResult =
        await Bun.$`aws secretsmanager put-secret-value --secret-id ${secretName} --secret-string ${jsonString} ${profileArgs}`.nothrow();

      if (updateResult.exitCode !== 0) {
        spinner.stop("Failed to update secret");
        p.cancel(`Error: ${updateResult.stderr.toString()}`);
        process.exit(1);
      }

      spinner.stop("Secret updated successfully");
    } else {
      // Secret doesn't exist, create it
      const createResult =
        await Bun.$`aws secretsmanager create-secret --name ${secretName} --secret-string ${jsonString} ${profileArgs}`.nothrow();

      if (createResult.exitCode !== 0) {
        spinner.stop("Failed to create secret");
        p.cancel(`Error: ${createResult.stderr.toString()}`);
        process.exit(1);
      }

      spinner.stop("Secret created successfully");
    }

    p.outro(`Secret '${secretName}' has been saved to AWS Secrets Manager`);
  },
});

await cli(process.argv.slice(2), command);
