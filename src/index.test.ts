import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { unlink } from "node:fs/promises";
import pkg from "../package.json";

const runCli = async (args: string[]) => {
  const proc = Bun.spawn(["bun", "src/index.ts", ...args], {
    cwd: import.meta.dir.replace("/src", ""),
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);

  const exitCode = await proc.exited;

  return { stdout, stderr, exitCode };
};

describe("CLI", () => {
  describe("--help", () => {
    test("shows help message", async () => {
      const { stdout, exitCode } = await runCli(["--help"]);

      expect(exitCode).toBe(0);
      expect(stdout).toContain("USAGE:");
      expect(stdout).toContain("e2sm");
      expect(stdout).toContain("get");
      expect(stdout).toContain("pull");
      expect(stdout).toContain("set");
      expect(stdout).toContain("delete");
      expect(stdout).not.toContain("undefined");
    });

    test("shows help with -h flag", async () => {
      const { stdout, exitCode } = await runCli(["-h"]);

      expect(exitCode).toBe(0);
      expect(stdout).toContain("USAGE:");
      expect(stdout).not.toContain("undefined");
    });
  });

  describe("no subcommand", () => {
    test("shows error message when no subcommand provided", async () => {
      const { stderr, exitCode } = await runCli([]);

      expect(exitCode).toBe(1);
      expect(stderr).toContain("Please specify a subcommand");
      expect(stderr).toContain("e2sm set");
      expect(stderr).toContain("e2sm get");
      expect(stderr).toContain("e2sm pull");
      expect(stderr).toContain("e2sm delete");
    });
  });

  describe("--version", () => {
    test("shows version", async () => {
      const { stdout, exitCode } = await runCli(["--version"]);

      expect(exitCode).toBe(0);
      expect(stdout).toContain(pkg.version);
    });

    test("shows version with -v flag", async () => {
      const { stdout, exitCode } = await runCli(["-v"]);

      expect(exitCode).toBe(0);
      expect(stdout).toContain(pkg.version);
    });
  });

  describe("set subcommand", () => {
    describe("--help", () => {
      test("shows help message", async () => {
        const { stdout, exitCode } = await runCli(["set", "--help"]);

        expect(exitCode).toBe(0);
        expect(stdout).toContain("USAGE:");
        expect(stdout).toContain("--dry-run");
        expect(stdout).toContain("--profile");
        expect(stdout).toContain("--input");
        expect(stdout).toContain("--name");
        expect(stdout).toContain("--region");
        expect(stdout).toContain("--template");
        expect(stdout).toContain("--application");
        expect(stdout).toContain("--stage");
        expect(stdout).toContain("--force");
      });

      test("shows help with -h flag", async () => {
        const { stdout, exitCode } = await runCli(["set", "-h"]);

        expect(exitCode).toBe(0);
        expect(stdout).toContain("USAGE:");
      });
    });

    describe("unknown flags", () => {
      test("exits with error for unknown flag", async () => {
        const { stderr, exitCode } = await runCli(["set", "--unknown-flag"]);

        expect(exitCode).toBe(1);
        expect(stderr).toContain("Unknown option: --unknown-flag");
      });

      test("exits with error for unknown short flag", async () => {
        const { stderr, exitCode } = await runCli(["set", "-x"]);

        expect(exitCode).toBe(1);
        expect(stderr).toContain("Unknown option: --x");
      });
    });

    describe("--dry-run", () => {
      const testEnvPath = "test-fixtures/test.env";

      beforeAll(async () => {
        await Bun.write(
          `${import.meta.dir.replace("/src", "")}/${testEnvPath}`,
          "FOO=bar\nBAZ=qux\n",
        );
      });

      afterAll(async () => {
        await unlink(`${import.meta.dir.replace("/src", "")}/${testEnvPath}`).catch(() => {});
        await unlink(`${import.meta.dir.replace("/src", "")}/test-fixtures`).catch(() => {});
      });

      test("previews JSON output without uploading", async () => {
        const { stdout, exitCode } = await runCli(["set", "--dry-run", "--input", testEnvPath]);

        expect(exitCode).toBe(0);
        expect(stdout).toContain("Dry-run mode");
        expect(stdout).toContain(testEnvPath);
        expect(stdout).toContain("FOO");
        expect(stdout).toContain("bar");
        expect(stdout).toContain("BAZ");
        expect(stdout).toContain("qux");
      });

      test("works with -d flag", async () => {
        const { stdout, exitCode } = await runCli(["set", "-d", "-i", testEnvPath]);

        expect(exitCode).toBe(0);
        expect(stdout).toContain("Dry-run mode");
      });
    });

    describe("file not found", () => {
      test("exits with error when file does not exist", async () => {
        const { stdout, exitCode } = await runCli([
          "set",
          "--dry-run",
          "--input",
          "nonexistent.env",
        ]);

        expect(exitCode).toBe(1);
        expect(stdout).toContain("File not found");
      });
    });

    describe("empty env file", () => {
      const emptyEnvPath = "test-fixtures/empty.env";

      beforeAll(async () => {
        await Bun.write(
          `${import.meta.dir.replace("/src", "")}/${emptyEnvPath}`,
          "# only comments\n",
        );
      });

      afterAll(async () => {
        await unlink(`${import.meta.dir.replace("/src", "")}/${emptyEnvPath}`).catch(() => {});
      });

      test("exits with error when no valid variables found", async () => {
        const { stdout, exitCode } = await runCli(["set", "--dry-run", "--input", emptyEnvPath]);

        expect(exitCode).toBe(1);
        expect(stdout).toContain("No valid environment variables found");
      });
    });

    describe("flag conflicts", () => {
      test("--name with --template exits with error", async () => {
        const { stderr, exitCode } = await runCli(["set", "--name", "x", "--template"]);

        expect(exitCode).toBe(1);
        expect(stderr).toContain("Cannot use --name");
        expect(stderr).toContain("--template");
      });

      test("--name with --application exits with error", async () => {
        const { stderr, exitCode } = await runCli(["set", "--name", "x", "-a", "app"]);

        expect(exitCode).toBe(1);
        expect(stderr).toContain("Cannot use --name");
        expect(stderr).toContain("--application");
      });

      test("--name with --stage exits with error", async () => {
        const { stderr, exitCode } = await runCli(["set", "--name", "x", "-s", "prod"]);

        expect(exitCode).toBe(1);
        expect(stderr).toContain("Cannot use --name");
        expect(stderr).toContain("--stage");
      });

      test("--name with multiple template flags exits with error", async () => {
        const { stderr, exitCode } = await runCli([
          "set",
          "--name",
          "x",
          "-t",
          "-a",
          "app",
          "-s",
          "prod",
        ]);

        expect(exitCode).toBe(1);
        expect(stderr).toContain("Cannot use --name");
        expect(stderr).toContain("--template");
        expect(stderr).toContain("--application");
        expect(stderr).toContain("--stage");
      });
    });

    describe("template mode", () => {
      const testEnvPath = "test-fixtures/test.env";

      beforeAll(async () => {
        await Bun.write(
          `${import.meta.dir.replace("/src", "")}/${testEnvPath}`,
          "FOO=bar\nBAZ=qux\n",
        );
      });

      afterAll(async () => {
        await unlink(`${import.meta.dir.replace("/src", "")}/${testEnvPath}`).catch(() => {});
      });

      test("-a and -s without -t works (implicit template mode)", async () => {
        const { stdout, exitCode } = await runCli([
          "set",
          "-d",
          "-i",
          testEnvPath,
          "-a",
          "my-app",
          "-s",
          "prod",
        ]);

        expect(exitCode).toBe(0);
        expect(stdout).toContain("Dry-run mode");
      });

      test("-t -a -s generates correct secret name", async () => {
        const { stdout, exitCode } = await runCli([
          "set",
          "-d",
          "-i",
          testEnvPath,
          "-t",
          "-a",
          "my-app",
          "-s",
          "prod",
        ]);

        expect(exitCode).toBe(0);
        expect(stdout).toContain("Dry-run mode");
      });

      test("-a only (implicit template mode)", async () => {
        const { exitCode } = await runCli(["set", "-d", "-i", testEnvPath, "-a", "my-app"]);

        // Will wait for stage input interactively, but dry-run exits before secret name is needed
        expect(exitCode).toBe(0);
      });

      test("-s only (implicit template mode)", async () => {
        const { exitCode } = await runCli(["set", "-d", "-i", testEnvPath, "-s", "prod"]);

        // Will wait for application input interactively, but dry-run exits before secret name is needed
        expect(exitCode).toBe(0);
      });
    });
  });

  describe("get subcommand", () => {
    describe("--help", () => {
      test("shows help message", async () => {
        const { stdout, exitCode } = await runCli(["get", "--help"]);

        expect(exitCode).toBe(0);
        expect(stdout).toContain("USAGE:");
        expect(stdout).toContain("--profile");
        expect(stdout).toContain("--region");
        expect(stdout).toContain("--name");
      });

      test("shows help with -h flag", async () => {
        const { stdout, exitCode } = await runCli(["get", "-h"]);

        expect(exitCode).toBe(0);
        expect(stdout).toContain("USAGE:");
      });
    });

    describe("unknown flags", () => {
      test("exits with error for unknown flag", async () => {
        const { stderr, exitCode } = await runCli(["get", "--unknown-flag"]);

        expect(exitCode).toBe(1);
        expect(stderr).toContain("Unknown option: --unknown-flag");
      });

      test("exits with error for unknown short flag", async () => {
        const { stderr, exitCode } = await runCli(["get", "-x"]);

        expect(exitCode).toBe(1);
        expect(stderr).toContain("Unknown option: --x");
      });
    });
  });

  describe("pull subcommand", () => {
    describe("--help", () => {
      test("shows help message", async () => {
        const { stdout, exitCode } = await runCli(["pull", "--help"]);

        expect(exitCode).toBe(0);
        expect(stdout).toContain("USAGE:");
        expect(stdout).toContain("--profile");
        expect(stdout).toContain("--region");
        expect(stdout).toContain("--name");
        expect(stdout).toContain("--output");
        expect(stdout).toContain("--force");
      });

      test("shows help with -h flag", async () => {
        const { stdout, exitCode } = await runCli(["pull", "-h"]);

        expect(exitCode).toBe(0);
        expect(stdout).toContain("USAGE:");
      });
    });

    describe("unknown flags", () => {
      test("exits with error for unknown flag", async () => {
        const { stderr, exitCode } = await runCli(["pull", "--unknown-flag"]);

        expect(exitCode).toBe(1);
        expect(stderr).toContain("Unknown option: --unknown-flag");
      });

      test("exits with error for unknown short flag", async () => {
        const { stderr, exitCode } = await runCli(["pull", "-x"]);

        expect(exitCode).toBe(1);
        expect(stderr).toContain("Unknown option: --x");
      });
    });
  });

  describe("delete subcommand", () => {
    describe("--help", () => {
      test("shows help message", async () => {
        const { stdout, exitCode } = await runCli(["delete", "--help"]);

        expect(exitCode).toBe(0);
        expect(stdout).toContain("USAGE:");
        expect(stdout).toContain("--profile");
        expect(stdout).toContain("--region");
        expect(stdout).toContain("--name");
        expect(stdout).toContain("--recovery-days");
        expect(stdout).toContain("--force");
      });

      test("shows help with -h flag", async () => {
        const { stdout, exitCode } = await runCli(["delete", "-h"]);

        expect(exitCode).toBe(0);
        expect(stdout).toContain("USAGE:");
      });
    });

    describe("unknown flags", () => {
      test("exits with error for unknown flag", async () => {
        const { stderr, exitCode } = await runCli(["delete", "--unknown-flag"]);

        expect(exitCode).toBe(1);
        expect(stderr).toContain("Unknown option: --unknown-flag");
      });

      test("exits with error for unknown short flag", async () => {
        const { stderr, exitCode } = await runCli(["delete", "-x"]);

        expect(exitCode).toBe(1);
        expect(stderr).toContain("Unknown option: --x");
      });
    });

    describe("invalid recovery days", () => {
      test("exits with error when recovery days is too low", async () => {
        const { stdout, exitCode } = await runCli([
          "delete",
          "--name",
          "test-secret",
          "--recovery-days",
          "5",
          "--force",
        ]);

        expect(exitCode).toBe(1);
        expect(stdout).toContain("Invalid recovery days");
        expect(stdout).toContain("Must be between 7 and 30");
      });

      test("exits with error when recovery days is too high", async () => {
        const { stdout, exitCode } = await runCli([
          "delete",
          "--name",
          "test-secret",
          "--recovery-days",
          "31",
          "--force",
        ]);

        expect(exitCode).toBe(1);
        expect(stdout).toContain("Invalid recovery days");
        expect(stdout).toContain("Must be between 7 and 30");
      });

      test("exits with error when recovery days is not a number", async () => {
        const { stdout, exitCode } = await runCli([
          "delete",
          "--name",
          "test-secret",
          "--recovery-days",
          "abc",
          "--force",
        ]);

        expect(exitCode).toBe(1);
        expect(stdout).toContain("Invalid recovery days");
      });
    });
  });

  describe("config file", () => {
    const testEnvPath = "test-fixtures/test.env";
    const configPath = ".e2smrc.json";
    const projectRoot = import.meta.dir.replace("/src", "");

    beforeAll(async () => {
      await Bun.write(`${projectRoot}/${testEnvPath}`, "FOO=bar\nBAZ=qux\n");
    });

    afterAll(async () => {
      await unlink(`${projectRoot}/${testEnvPath}`).catch(() => {});
      await unlink(`${projectRoot}/${configPath}`).catch(() => {});
    });

    test("loads input flag from config", async () => {
      await Bun.write(`${projectRoot}/${configPath}`, JSON.stringify({ input: testEnvPath }));
      const { stdout, exitCode } = await runCli(["set", "-d"]);

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Dry-run mode");
      expect(stdout).toContain("FOO");
    });

    test("CLI flag overrides config", async () => {
      await Bun.write(`${projectRoot}/${configPath}`, JSON.stringify({ input: "nonexistent.env" }));
      const { stdout, exitCode } = await runCli(["set", "-d", "-i", testEnvPath]);

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Dry-run mode");
    });

    test("loads template mode flags from config", async () => {
      await Bun.write(
        `${projectRoot}/${configPath}`,
        JSON.stringify({
          template: true,
          application: "my-app",
          stage: "prod",
          input: testEnvPath,
        }),
      );
      const { stdout, exitCode } = await runCli(["set", "-d"]);

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Dry-run mode");
    });

    test("ignores invalid config file", async () => {
      await Bun.write(`${projectRoot}/${configPath}`, "invalid json");
      const { stdout, exitCode } = await runCli(["set", "-d", "-i", testEnvPath]);

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Dry-run mode");
    });
  });
});
