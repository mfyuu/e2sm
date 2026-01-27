import * as p from "@clack/prompts";
import { define } from "gunshi";
import { access } from "node:fs/promises";
import template from "../../assets/template.jsonc" with { type: "text" };
import pkg from "../../package.json";
import { validateUnknownFlags } from "../lib";

const CONFIG_FILE = ".e2smrc.jsonc";

export const initCommand = define({
  name: "init",
  description: "Initialize a new .e2smrc.jsonc configuration file",
  args: {
    force: {
      type: "boolean",
      short: "f",
      description: "Overwrite existing configuration file",
    },
  },
  run: async (ctx) => {
    // Validate unknown flags first
    const unknownFlagError = validateUnknownFlags(ctx.tokens, ctx.args);
    if (unknownFlagError) {
      console.error(unknownFlagError);
      process.exit(1);
    }

    const forceFlag = ctx.values.force;

    p.intro(`e2sm init v${pkg.version}`);

    // Check if config file already exists
    const exists = await access(CONFIG_FILE)
      .then(() => true)
      .catch(() => false);

    if (exists && !forceFlag) {
      const confirmed = await p.confirm({
        message: `'${CONFIG_FILE}' already exists. Overwrite?`,
        initialValue: false,
      });

      if (p.isCancel(confirmed) || !confirmed) {
        p.cancel("Operation cancelled");
        process.exit(0);
      }
    }

    // Write config file from template
    try {
      await Bun.write(CONFIG_FILE, template);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      p.cancel(`Failed to write '${CONFIG_FILE}': ${errorMessage}`);
      process.exit(1);
    }

    const message = exists ? `Overwritten '${CONFIG_FILE}'` : `Created '${CONFIG_FILE}'`;
    p.outro(message);
  },
});
