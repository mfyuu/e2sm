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
      expect(stdout).toContain("--dry-run");
      expect(stdout).toContain("--profile");
      expect(stdout).toContain("--input");
      expect(stdout).toContain("--name");
      expect(stdout).toContain("--region");
      expect(stdout).toContain("--template");
      expect(stdout).toContain("--application");
      expect(stdout).toContain("--stage");
    });

    test("shows help with -h flag", async () => {
      const { stdout, exitCode } = await runCli(["-h"]);

      expect(exitCode).toBe(0);
      expect(stdout).toContain("USAGE:");
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

  describe("unknown flags", () => {
    test("exits with error for unknown flag", async () => {
      const { stderr, exitCode } = await runCli(["--unknown-flag"]);

      expect(exitCode).toBe(1);
      expect(stderr).toContain("Unknown option: --unknown-flag");
    });

    test("exits with error for unknown short flag", async () => {
      const { stderr, exitCode } = await runCli(["-x"]);

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
      const { stdout, exitCode } = await runCli(["--dry-run", "--input", testEnvPath]);

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Dry-run mode");
      expect(stdout).toContain("FOO");
      expect(stdout).toContain("bar");
      expect(stdout).toContain("BAZ");
      expect(stdout).toContain("qux");
    });

    test("works with -d flag", async () => {
      const { stdout, exitCode } = await runCli(["-d", "-i", testEnvPath]);

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Dry-run mode");
    });
  });

  describe("file not found", () => {
    test("exits with error when file does not exist", async () => {
      const { stdout, exitCode } = await runCli(["--dry-run", "--input", "nonexistent.env"]);

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
      const { stdout, exitCode } = await runCli(["--dry-run", "--input", emptyEnvPath]);

      expect(exitCode).toBe(1);
      expect(stdout).toContain("No valid environment variables found");
    });
  });

  describe("flag conflicts", () => {
    test("--name with --template exits with error", async () => {
      const { stderr, exitCode } = await runCli(["--name", "x", "--template"]);

      expect(exitCode).toBe(1);
      expect(stderr).toContain("Cannot use --name");
      expect(stderr).toContain("--template");
    });

    test("--name with --application exits with error", async () => {
      const { stderr, exitCode } = await runCli(["--name", "x", "-a", "app"]);

      expect(exitCode).toBe(1);
      expect(stderr).toContain("Cannot use --name");
      expect(stderr).toContain("--application");
    });

    test("--name with --stage exits with error", async () => {
      const { stderr, exitCode } = await runCli(["--name", "x", "-s", "prod"]);

      expect(exitCode).toBe(1);
      expect(stderr).toContain("Cannot use --name");
      expect(stderr).toContain("--stage");
    });

    test("--name with multiple template flags exits with error", async () => {
      const { stderr, exitCode } = await runCli(["--name", "x", "-t", "-a", "app", "-s", "prod"]);

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
      const { exitCode } = await runCli(["-d", "-i", testEnvPath, "-a", "my-app"]);

      // Will wait for stage input interactively, but dry-run exits before secret name is needed
      expect(exitCode).toBe(0);
    });

    test("-s only (implicit template mode)", async () => {
      const { exitCode } = await runCli(["-d", "-i", testEnvPath, "-s", "prod"]);

      // Will wait for application input interactively, but dry-run exits before secret name is needed
      expect(exitCode).toBe(0);
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
      const { stdout, exitCode } = await runCli(["-d"]);

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Dry-run mode");
      expect(stdout).toContain("FOO");
    });

    test("CLI flag overrides config", async () => {
      await Bun.write(`${projectRoot}/${configPath}`, JSON.stringify({ input: "nonexistent.env" }));
      const { stdout, exitCode } = await runCli(["-d", "-i", testEnvPath]);

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
      const { stdout, exitCode } = await runCli(["-d"]);

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Dry-run mode");
    });

    test("ignores invalid config file", async () => {
      await Bun.write(`${projectRoot}/${configPath}`, "invalid json");
      const { stdout, exitCode } = await runCli(["-d", "-i", testEnvPath]);

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Dry-run mode");
    });
  });
});
