import * as p from "@clack/prompts";
import { define } from "gunshi";
import { access, writeFile } from "node:fs/promises";
import pkg from "../package.json";
import {
  exec,
  fetchSecretList,
  generateEnvHeader,
  jsonToEnv,
  loadConfig,
  mergeWithConfig,
  validateUnknownFlags,
} from "./lib";

function isCancel(value: unknown): value is symbol {
  return p.isCancel(value);
}

export const pullCommand = define({
  name: "pull",
  description: "Pull secret from AWS Secrets Manager and generate .env file",
  args: {
    profile: {
      type: "string",
      short: "p",
      description: "AWS profile to use",
    },
    region: {
      type: "string",
      short: "r",
      description: "AWS region to use (e.g., ap-northeast-1)",
    },
    name: {
      type: "string",
      short: "n",
      description: "Secret name to retrieve (skip interactive selection)",
    },
    output: {
      type: "string",
      short: "o",
      description: "Output .env file path (skip interactive prompt)",
    },
    force: {
      type: "boolean",
      short: "f",
      description: "Overwrite existing file without confirmation",
    },
  },
  run: async (ctx) => {
    const config = await loadConfig();

    const unknownFlagError = validateUnknownFlags(ctx.tokens, ctx.args);
    if (unknownFlagError) {
      console.error(unknownFlagError);
      process.exit(1);
    }

    const merged = mergeWithConfig(ctx.values, config);
    const profile = merged.profile;
    const region = merged.region;
    const nameFlag = ctx.values.name ?? config.name;
    const outputFlag = ctx.values.output ?? config.output;
    const forceFlag = ctx.values.force;

    p.intro(`e2sm pull v${pkg.version} - Pull secret to .env file`);

    const profileArgs = profile ? ["--profile", profile] : [];
    const regionArgs = region ? ["--region", region] : [];

    // 1. Get secret name
    let secretName: string;

    if (nameFlag) {
      secretName = nameFlag;
    } else {
      const spinner = p.spinner();
      spinner.start("Fetching secret list...");

      const result = await fetchSecretList({ profile, region });

      if ("error" in result) {
        spinner.stop("Failed to fetch secret list");
        p.cancel(`Error: ${result.error}`);
        process.exit(1);
      }

      spinner.stop("Secret list fetched");

      const { secrets } = result;

      if (secrets.length === 0) {
        p.cancel("No secrets found");
        process.exit(1);
      }

      const selected = await p.select({
        message: "Select a secret:",
        options: secrets.map((s) => ({
          value: s.Name,
          label: s.Name,
        })),
      });

      if (isCancel(selected)) {
        p.cancel("Operation cancelled");
        process.exit(0);
      }

      secretName = selected;
    }

    // 2. Get output file path
    let outputPath: string;

    if (outputFlag) {
      outputPath = outputFlag;
    } else {
      const result = await p.select({
        message: "Select output file:",
        options: [
          { value: ".env", label: ".env" },
          { value: ".env.local", label: ".env.local" },
          { value: ".env.development", label: ".env.development" },
          { value: ".env.production", label: ".env.production" },
          { value: "__other__", label: "Other (enter custom path)" },
        ],
      });

      if (isCancel(result)) {
        p.cancel("Operation cancelled");
        process.exit(0);
      }

      if (result === "__other__") {
        const customPath = await p.text({
          message: "Enter the output file path:",
          placeholder: ".env",
          defaultValue: ".env",
        });

        if (isCancel(customPath)) {
          p.cancel("Operation cancelled");
          process.exit(0);
        }

        outputPath = customPath;
      } else {
        outputPath = result;
      }
    }

    // 3. Check if file exists and confirm overwrite
    const fileExists = await access(outputPath)
      .then(() => true)
      .catch(() => false);

    if (fileExists && !forceFlag) {
      const confirmed = await p.confirm({
        message: `File '${outputPath}' already exists. Overwrite?`,
        initialValue: false,
      });

      if (isCancel(confirmed)) {
        p.cancel("Operation cancelled");
        process.exit(0);
      }

      if (!confirmed) {
        p.cancel("Operation cancelled");
        process.exit(0);
      }
    }

    // 4. Fetch secret value
    const spinner = p.spinner();
    spinner.start(`Fetching secret value for '${secretName}'...`);

    const getResult = await exec("aws", [
      "secretsmanager",
      "get-secret-value",
      "--secret-id",
      secretName,
      ...profileArgs,
      ...regionArgs,
    ]);

    if (getResult.exitCode !== 0) {
      spinner.stop("Failed to fetch secret value");
      p.cancel(`Error: ${getResult.stderr}`);
      process.exit(1);
    }

    spinner.stop("Secret value fetched");

    // 5. Parse and convert to .env format
    const secretData = JSON.parse(getResult.stdout);
    const secretString = secretData.SecretString;

    let envContent: string;
    try {
      const parsed = JSON.parse(secretString);
      envContent = jsonToEnv(parsed);
    } catch {
      // If not JSON, write as-is
      envContent = secretString;
    }

    // 6. Write to file with header comment
    const header = generateEnvHeader(secretName);
    await writeFile(outputPath, header + "\n" + envContent + "\n", "utf-8");

    p.outro(`Secret '${secretName}' has been written to '${outputPath}'`);
  },
});
