import * as p from "@clack/prompts";
import { cli, define } from "gunshi";
import { spawn } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { inspect } from "node:util";
import pkg from "../package.json";
import {
  isTemplateMode,
  loadConfig,
  mergeWithConfig,
  parseEnvContent,
  validateNameTemplateConflict,
  validateUnknownFlags,
} from "./lib";

function isCancel(value: unknown): value is symbol {
  return p.isCancel(value);
}

function exec(
  command: string,
  args: string[],
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const proc = spawn(command, args, {
      shell: false,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });
    proc.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });
    proc.on("close", (code) => {
      resolve({ exitCode: code ?? 1, stdout, stderr });
    });
  });
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
    region: {
      type: "string",
      short: "r",
      description: "AWS region to use (e.g., ap-northeast-1)",
    },
    template: {
      type: "boolean",
      short: "t",
      description: "Use template mode: generate secret name as $application/$stage",
    },
    application: {
      type: "string",
      short: "a",
      description: "Application name for template mode (implies --template)",
    },
    stage: {
      type: "string",
      short: "s",
      description: "Stage name for template mode (implies --template)",
    },
  },
  run: async (ctx) => {
    // Load config file
    const config = await loadConfig();

    // Validate unknown flags first
    const unknownFlagError = validateUnknownFlags(ctx.tokens, ctx.args);
    if (unknownFlagError) {
      console.error(unknownFlagError);
      process.exit(1);
    }

    // Validate flag conflicts
    const conflictError = validateNameTemplateConflict(ctx.values);
    if (conflictError) {
      console.error(conflictError);
      process.exit(1);
    }

    // Merge CLI flags with config (CLI takes precedence)
    const merged = mergeWithConfig(ctx.values, config);

    const isDryRun = ctx.values.dryRun; // dryRun is CLI-only
    const profile = merged.profile;
    const inputFlag = merged.input;
    const nameFlag = ctx.values.name; // name is CLI-only
    const region = merged.region;

    p.intro(`e2sm v${pkg.version} - env to AWS Secrets Manager`);

    // 1. Get env file path (from flag or interactively)
    let envFilePath: string;

    if (inputFlag) {
      envFilePath = inputFlag;
    } else {
      const result = await p.text({
        message: "Enter the path to your .env file:",
        placeholder: ".env.local",
        defaultValue: ".env.local",
      });

      if (isCancel(result)) {
        p.cancel("Operation cancelled");
        process.exit(0);
      }

      envFilePath = result;
    }

    // 2. Read and parse env file
    const exists = await access(envFilePath)
      .then(() => true)
      .catch(() => false);

    if (!exists) {
      p.cancel(`File not found: ${envFilePath}`);
      process.exit(1);
    }

    const content = await readFile(envFilePath, "utf-8");
    const envData = parseEnvContent(content);

    if (Object.keys(envData).length === 0) {
      p.cancel("No valid environment variables found in the file");
      process.exit(1);
    }

    const jsonString = JSON.stringify(envData);

    // 3. Dry-run mode: preview JSON
    if (isDryRun) {
      p.log.info("Dry-run mode: Previewing JSON output");
      console.log(inspect(envData, { colors: true, depth: null }));
      p.outro("Dry-run complete");
      return;
    }

    // 4. Get secret name
    let secretName: string;

    const templateFlag = merged.template;
    const applicationFlag = merged.application;
    const stageFlag = merged.stage;
    const useTemplateMode = isTemplateMode({
      template: templateFlag,
      application: applicationFlag,
      stage: stageFlag,
    });

    if (nameFlag) {
      secretName = nameFlag;
    } else if (useTemplateMode) {
      // Template mode
      let application: string;
      let stage: string;

      if (applicationFlag) {
        application = applicationFlag;
      } else {
        const result = await p.text({
          message: "Enter the application name:",
          placeholder: "my-app",
          defaultValue: "my-app",
        });
        if (isCancel(result)) {
          p.cancel("Operation cancelled");
          process.exit(0);
        }
        application = result;
      }

      if (stageFlag) {
        stage = stageFlag;
      } else {
        const result = await p.text({
          message: "Enter the stage name:",
          placeholder: "dev",
          defaultValue: "dev",
        });
        if (isCancel(result)) {
          p.cancel("Operation cancelled");
          process.exit(0);
        }
        stage = result;
      }

      secretName = `${application}/${stage}`;
    } else {
      // Default mode
      const result = await p.text({
        message: "Enter the secret name for AWS Secrets Manager:",
        placeholder: "my-app/default",
        defaultValue: "my-app/default",
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
    const regionArgs = region ? ["--region", region] : [];

    // First, try to check if the secret already exists
    const describeResult = await exec("aws", [
      "secretsmanager",
      "describe-secret",
      "--secret-id",
      secretName,
      ...profileArgs,
      ...regionArgs,
    ]);

    if (describeResult.exitCode === 0) {
      // Secret exists, update it
      const updateResult = await exec("aws", [
        "secretsmanager",
        "put-secret-value",
        "--secret-id",
        secretName,
        "--secret-string",
        jsonString,
        ...profileArgs,
        ...regionArgs,
      ]);

      if (updateResult.exitCode !== 0) {
        spinner.stop("Failed to update secret");
        p.cancel(`Error: ${updateResult.stderr}`);
        process.exit(1);
      }

      spinner.stop("Secret updated successfully");
    } else {
      // Secret doesn't exist, create it
      const createResult = await exec("aws", [
        "secretsmanager",
        "create-secret",
        "--name",
        secretName,
        "--secret-string",
        jsonString,
        ...profileArgs,
        ...regionArgs,
      ]);

      if (createResult.exitCode !== 0) {
        spinner.stop("Failed to create secret");
        p.cancel(`Error: ${createResult.stderr}`);
        process.exit(1);
      }

      spinner.stop("Secret created successfully");
    }

    p.outro(`Secret '${secretName}' has been saved to AWS Secrets Manager`);
  },
});

await cli(process.argv.slice(2), command, {
  version: pkg.version,
});
