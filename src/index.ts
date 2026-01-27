import { cli, define } from "gunshi";
import pkg from "../package.json";
import { getCommand } from "./commands/get";
import { pullCommand } from "./commands/pull";
import { setCommand } from "./commands/set";

const command = define({
  name: "e2sm",
  description: "Manage environment variables with AWS Secrets Manager",
  run: () => {
    console.error("Error: Please specify a subcommand (set, get, or pull)");
    console.error("");
    console.error("Usage:");
    console.error("  e2sm set   - Upload .env file to AWS Secrets Manager");
    console.error("  e2sm get   - Display secret from AWS Secrets Manager");
    console.error("  e2sm pull  - Pull secret and generate .env file");
    console.error("");
    console.error("Run 'e2sm <command> --help' for more information on a command.");
    process.exit(1);
  },
});

await cli(process.argv.slice(2), command, {
  name: "e2sm",
  version: pkg.version,
  subCommands: {
    set: setCommand,
    get: getCommand,
    pull: pullCommand,
  },
});
