import * as p from "@clack/prompts";
import { define } from "gunshi";
import pkg from "../../package.json";
import { exec, fetchSecretList, loadConfig, mergeWithConfig, validateUnknownFlags } from "../lib";

function isCancel(value: unknown): value is symbol {
  return p.isCancel(value);
}

const MIN_RECOVERY_DAYS = 7;
const MAX_RECOVERY_DAYS = 30;
export const deleteCommand = define({
  name: "delete",
  description: "Delete secret from AWS Secrets Manager",
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
      description: "Secret name to delete (skip interactive selection)",
    },
    recoveryDays: {
      type: "string",
      short: "d",
      toKebab: true,
      description: `Recovery window in days (${MIN_RECOVERY_DAYS}-${MAX_RECOVERY_DAYS})`,
    },
    force: {
      type: "boolean",
      short: "f",
      description: "Skip confirmation prompt",
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
    const recoveryDaysFlag = ctx.values.recoveryDays;
    const forceFlag = ctx.values.force;

    p.intro(`e2sm delete v${pkg.version} - Delete secret from AWS Secrets Manager`);

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
        message: "Select a secret to delete:",
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

    // 2. Get recovery window days
    let recoveryDays: number;

    if (recoveryDaysFlag) {
      const parsed = Number.parseInt(recoveryDaysFlag, 10);
      if (Number.isNaN(parsed) || parsed < MIN_RECOVERY_DAYS || parsed > MAX_RECOVERY_DAYS) {
        p.cancel(
          `Invalid recovery days: ${recoveryDaysFlag}. Must be between ${MIN_RECOVERY_DAYS} and ${MAX_RECOVERY_DAYS}.`,
        );
        process.exit(1);
      }
      recoveryDays = parsed;
    } else {
      const result = await p.text({
        message: "Enter recovery window in days:",
        placeholder: `${MIN_RECOVERY_DAYS}-${MAX_RECOVERY_DAYS}`,
        validate: (value) => {
          const num = Number.parseInt(value, 10);
          if (Number.isNaN(num) || num < MIN_RECOVERY_DAYS || num > MAX_RECOVERY_DAYS) {
            return `Must be a number between ${MIN_RECOVERY_DAYS} and ${MAX_RECOVERY_DAYS}`;
          }
        },
      });

      if (isCancel(result)) {
        p.cancel("Operation cancelled");
        process.exit(0);
      }

      recoveryDays = Number.parseInt(result, 10);
    }

    // 3. Confirm deletion
    if (!forceFlag) {
      const confirmed = await p.confirm({
        message: `Are you sure you want to delete '${secretName}'? (recoverable for ${recoveryDays} days)`,
        initialValue: false,
      });

      if (isCancel(confirmed) || !confirmed) {
        p.cancel("Operation cancelled");
        process.exit(0);
      }
    }

    // 4. Delete secret
    const spinner = p.spinner();
    spinner.start(`Deleting '${secretName}' from AWS Secrets Manager...`);

    const deleteResult = await exec("aws", [
      "secretsmanager",
      "delete-secret",
      "--secret-id",
      secretName,
      "--recovery-window-in-days",
      String(recoveryDays),
      ...profileArgs,
      ...regionArgs,
    ]);

    if (deleteResult.exitCode !== 0) {
      spinner.stop("Failed to delete secret");
      p.cancel(`Error: ${deleteResult.stderr}`);
      process.exit(1);
    }

    spinner.stop("Secret deleted successfully");

    p.outro(
      `Secret '${secretName}' has been scheduled for deletion (recoverable for ${recoveryDays} days)`,
    );
  },
});
