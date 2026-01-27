import * as p from "@clack/prompts";
import { define } from "gunshi";
import pkg from "../../package.json";
import {
  exec,
  fetchSecretList,
  formatJson,
  loadConfig,
  mergeWithConfig,
  validateUnknownFlags,
} from "../lib";

function isCancel(value: unknown): value is symbol {
  return p.isCancel(value);
}

export const getCommand = define({
  name: "get",
  description: "Get secret value from AWS Secrets Manager",
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

    p.intro(`e2sm get v${pkg.version} - Get secret from AWS Secrets Manager`);

    const profileArgs = profile ? ["--profile", profile] : [];
    const regionArgs = region ? ["--region", region] : [];

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

    const secretData = JSON.parse(getResult.stdout);
    const secretString = secretData.SecretString;

    p.log.info(`Secret: ${secretName}`);
    console.log();

    try {
      const parsed = JSON.parse(secretString);
      console.log(formatJson(parsed));
    } catch {
      console.log(secretString);
    }

    p.outro("Done");
  },
});
